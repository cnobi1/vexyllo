"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NoOutputGeneratedError } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import type { BreakdownAsset, BreakdownScene } from "@/lib/providers/llm/types";
import { chunkScriptForBreakdown } from "@/lib/scripts/chunk-script-for-breakdown";
import { BREAKDOWN_CREDIT_COST } from "@/lib/billing/credit-costs";
import { requireCredits, recordSpend } from "@/lib/billing/spend-credits";

export async function generateSceneBreakdown(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawDuration = formData.get("targetSceneDurationSeconds");
  const targetSceneDurationSeconds =
    rawDuration && String(rawDuration).trim() ? Math.max(1, Math.round(Number(rawDuration))) : null;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, style, script_text")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  if (!project.script_text?.trim()) {
    throw new Error("Add a script before generating scenes.");
  }

  // Persisted immediately so the setting is remembered (shown as the form's
  // current value) even if the breakdown call below fails.
  const { error: settingError } = await supabase
    .from("projects")
    .update({ target_scene_duration_seconds: targetSceneDurationSeconds })
    .eq("id", projectId);
  if (settingError) throw new Error(settingError.message);

  await requireCredits(user.id, BREAKDOWN_CREDIT_COST);

  const provider = getLLMProvider();

  // Broken into scene-bounded batches rather than one call over the whole
  // script — a single request's structured output can overflow the model's
  // max-output-tokens cap on a long/feature-length script (see
  // chunkScriptForBreakdown). Batches are merged back into one continuous
  // result below: assets are deduped by type+name across batches, and scenes
  // are renumbered by emission order rather than trusting each batch's own
  // (batch-relative) order field.
  const batches = chunkScriptForBreakdown(project.script_text);
  const mergedAssetsByKey = new Map<string, BreakdownAsset>();
  const mergedScenes: BreakdownScene[] = [];

  for (const batchText of batches) {
    let batchResult;
    try {
      batchResult = await provider.breakdownScript({
        scriptText: batchText,
        style: project.style,
        targetSceneDurationSeconds,
      });
    } catch (err) {
      // The model's response was cut off before it finished the structured
      // breakdown (finishReason !== "stop", almost always a max-output-tokens
      // cutoff) — the SDK surfaces that as "no output" with no mention of
      // length, which reads as a mysterious crash rather than an actionable
      // limit. See deepseek-adapter.ts's MAX_OUTPUT_TOKENS.
      if (NoOutputGeneratedError.isInstance(err)) {
        throw new Error(
          "The AI's scene breakdown was too long to finish in one response. Try a shorter script, or trim it down and regenerate.",
        );
      }
      throw err;
    }

    for (const asset of batchResult.assets) {
      const key = `${asset.type}:${asset.name.trim().toLowerCase()}`;
      if (!mergedAssetsByKey.has(key)) mergedAssetsByKey.set(key, asset);
    }
    for (const scene of batchResult.scenes) {
      mergedScenes.push({ ...scene, order: mergedScenes.length + 1 });
    }
  }

  const result = { assets: Array.from(mergedAssetsByKey.values()), scenes: mergedScenes };

  const { error: deleteScenesError } = await supabase
    .from("scenes")
    .delete()
    .eq("project_id", projectId);
  if (deleteScenesError) throw new Error(deleteScenesError.message);

  // Assets are preserved across a regenerate (matched by type+name) instead
  // of wiped and reinserted with fresh ids — otherwise every regenerate
  // orphans any character-sheet/reference images already built for them,
  // even though the character itself is still in the script. Only assets no
  // longer present in the new breakdown get removed.
  const assetKey = (type: string, name: string) => `${type}:${name.trim().toLowerCase()}`;

  const { data: existingAssets, error: existingAssetsError } = await supabase
    .from("assets")
    .select("id, type, name")
    .eq("project_id", projectId);
  if (existingAssetsError) throw new Error(existingAssetsError.message);

  const existingByKey = new Map((existingAssets ?? []).map((asset) => [assetKey(asset.type, asset.name), asset.id]));
  const matchedIds = new Set<string>();
  const assetIdByName = new Map<string, string>();

  for (const asset of result.assets) {
    const key = assetKey(asset.type, asset.name);
    const existingId = existingByKey.get(key);
    if (existingId) {
      const { error: updateError } = await supabase
        .from("assets")
        .update({ description: asset.description })
        .eq("id", existingId);
      if (updateError) throw new Error(updateError.message);
      matchedIds.add(existingId);
      assetIdByName.set(asset.name, existingId);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("assets")
        .insert({ project_id: projectId, type: asset.type, name: asset.name, description: asset.description })
        .select("id")
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message ?? "Failed to insert asset");
      assetIdByName.set(asset.name, inserted.id);
    }
  }

  const staleAssetIds = (existingAssets ?? [])
    .map((asset) => asset.id)
    .filter((id) => !matchedIds.has(id));
  if (staleAssetIds.length > 0) {
    const { data: staleImages } = await supabase
      .from("asset_images")
      .select("storage_path")
      .in("asset_id", staleAssetIds);
    const { error: deleteStaleError } = await supabase.from("assets").delete().in("id", staleAssetIds);
    if (deleteStaleError) throw new Error(deleteStaleError.message);
    const stalePaths = (staleImages ?? []).map((image) => image.storage_path);
    if (stalePaths.length > 0) {
      await supabase.storage.from("media").remove(stalePaths);
    }
  }

  const sceneAssetRows: { scene_id: string; asset_id: string; wardrobe_note: string | null }[] = [];

  for (const scene of result.scenes) {
    const wardrobeByCharacter = new Map(scene.wardrobe.map((entry) => [entry.characterName, entry.description]));

    const { data: sceneRow, error: sceneError } = await supabase
      .from("scenes")
      .insert({
        project_id: projectId,
        order_index: scene.order,
        summary: scene.summary,
        dialogue: scene.dialogue,
        script_text: scene.scriptText,
        duration_seconds: scene.durationSeconds,
      })
      .select("id")
      .single();

    if (sceneError || !sceneRow) {
      throw new Error(sceneError?.message ?? "Failed to insert scene");
    }

    for (const name of scene.assetNames) {
      const assetId = assetIdByName.get(name);
      if (!assetId) continue;
      sceneAssetRows.push({
        scene_id: sceneRow.id,
        asset_id: assetId,
        wardrobe_note: wardrobeByCharacter.get(name) ?? null,
      });
    }
  }

  if (sceneAssetRows.length > 0) {
    const { error: sceneAssetsError } = await supabase.from("scene_assets").insert(sceneAssetRows);
    if (sceneAssetsError) throw new Error(sceneAssetsError.message);
  }

  await recordSpend(user.id, BREAKDOWN_CREDIT_COST, "generation_script", null);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/scenes`);
  redirect(`/projects/${projectId}/scenes`);
}
