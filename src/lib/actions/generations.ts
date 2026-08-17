"use server";

import { after } from "next/server";
import { start } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { getImageProvider } from "@/lib/providers/image";
import { getVideoProvider } from "@/lib/providers/video";
import { copyToMediaBucket } from "@/lib/media/copy-to-storage";
import { resolveAssetReferenceUrls } from "@/lib/media/asset-references";
import { generateVideoWorkflow } from "@/lib/workflows/generate-video";
import {
  buildSceneStoryboardPrompt,
  gridToRatio,
  type StoryboardGrid,
  type StoryboardShot,
} from "@/lib/prompts/scene-storyboard";
import { IMAGE_CREDIT_COST, videoCreditCost } from "@/lib/billing/credit-costs";
import { requireCredits, recordSpend } from "@/lib/billing/spend-credits";
import { withTransientRetry } from "@/lib/providers/retry";
import { loadOwnedProject } from "./project-guard";

// No duration control exists on the per-shot video panel today (that's a
// Videos-tab concern, see media.ts) — this preserves the previous
// hardcoded default so shot video generation behaves identically to before.
const DEFAULT_SHOT_VIDEO_DURATION_SECONDS = 8;

async function loadShotForGeneration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shotId: string,
  promptOverride?: string,
): Promise<{
  prompt: string;
  style: string | null;
  projectId: string;
  userId: string;
  referenceImageUrls?: string[];
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: shot, error: shotError } = await supabase
    .from("shots")
    .select("id, prompt, status, scene_id")
    .eq("id", shotId)
    .single();

  if (shotError || !shot) {
    throw new Error(shotError?.message ?? "Shot not found");
  }
  // A caller-supplied prompt (the shot card's live textarea) always wins
  // over the last-saved value — lets "Generate" use an edit the customer
  // hasn't explicitly saved yet, same as the Assets tab's description field.
  const prompt = (promptOverride ?? shot.prompt ?? "").trim();
  if (!prompt) {
    throw new Error("This shot has no prompt to generate from.");
  }
  if (shot.status === "generating") {
    throw new Error("A generation is already in progress for this shot.");
  }

  const { data: scene, error: sceneError } = await supabase
    .from("scenes")
    .select("project_id")
    .eq("id", shot.scene_id)
    .single();
  if (sceneError || !scene) {
    throw new Error(sceneError?.message ?? "Scene not found");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("style")
    .eq("id", scene.project_id)
    .single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  // Persist the override so the prompt used to generate is never lost even
  // if the customer never explicitly hits "Save".
  if (promptOverride && promptOverride.trim() !== shot.prompt) {
    await supabase.from("shots").update({ prompt }).eq("id", shotId);
  }

  // Pull in reference images for whichever characters/locations/props are
  // linked to this shot (see shot_assets, set via the Scenes tab's asset
  // picker or auto-linked from the storyboard breakdown) — this is what
  // keeps a shot's generated image/video visually consistent with a
  // character/location/prop's own reference sheet.
  const { data: shotAssets } = await supabase.from("shot_assets").select("asset_id").eq("shot_id", shotId);
  const assetIds = (shotAssets ?? []).map((row) => row.asset_id);
  const referenceImageUrls =
    assetIds.length > 0 ? await resolveAssetReferenceUrls(supabase, scene.project_id, assetIds) : undefined;

  return { prompt, style: project.style, projectId: scene.project_id, userId: user.id, referenceImageUrls };
}

/**
 * Generates one combined storyboard sheet image for an entire scene (a grid
 * of panels, one per shot) instead of a separate image per shot — see
 * src/lib/prompts/scene-storyboard.ts for the panel-grid prompt wrapper.
 * Ledger/after() pattern matches generateFreeformImages (media.ts): short
 * enough to not need workflow durability.
 */
export async function generateSceneStoryboard(
  projectId: string,
  sceneId: string,
  input: { prompt: string; grid: StoryboardGrid; referenceAssetIds?: string[] },
) {
  const supabase = await createClient();
  const project = await loadOwnedProject(supabase, projectId);

  const { data: scene, error: sceneError } = await supabase
    .from("scenes")
    .select("id, shots(order_index, camera_angle, prompt)")
    .eq("id", sceneId)
    .eq("project_id", projectId)
    .order("order_index", { ascending: true, referencedTable: "shots" })
    .single();
  if (sceneError || !scene) {
    throw new Error(sceneError?.message ?? "Scene not found");
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("This scene has no prompt to generate from.");
  }

  // Camera angles still shape each panel even though the Scenes tab no
  // longer shows shot text in the UI — see buildSceneStoryboardPrompt.
  const shots: StoryboardShot[] = (scene.shots ?? []).map((shot) => ({
    cameraAngle: shot.camera_angle,
    description: shot.prompt,
  }));

  const provider = getImageProvider();
  const referenceImageUrls = input.referenceAssetIds?.length
    ? await resolveAssetReferenceUrls(supabase, projectId, input.referenceAssetIds)
    : undefined;

  await requireCredits(project.userId, IMAGE_CREDIT_COST);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      scene_id: sceneId,
      project_id: projectId,
      kind: "scene_storyboard",
      provider: provider.name,
      type: "image",
      status: "pending",
      params: { prompt, grid: input.grid, referenceAssetIds: input.referenceAssetIds ?? [] },
    })
    .select("id")
    .single();
  if (insertError || !generation) {
    throw new Error(insertError?.message ?? "Failed to start generation");
  }

  const generationId = generation.id;

  after(async () => {
    // Fresh client: this runs after the response is sent, so it needs its
    // own cookie read rather than reusing the request-scoped `supabase` above.
    const worker = await createClient();
    try {
      const result = await withTransientRetry(() =>
        provider.generateImage({
          prompt: buildSceneStoryboardPrompt(prompt, input.grid, shots),
          style: project.style,
          referenceImageUrls,
          ratio: gridToRatio(input.grid),
        }),
      );
      const [image] = result.images;
      if (!image) throw new Error("Provider returned no image");
      // Provider URLs are not ours to keep alive — copy into our own
      // bucket before recording success. See src/lib/media/copy-to-storage.ts.
      const copied = await copyToMediaBucket(worker, projectId, "generations", generationId, image.url);
      await worker
        .from("generations")
        .update({ status: "succeeded", output_url: copied.signedUrl, storage_path: copied.path, cost: image.cost })
        .eq("id", generationId);
      // Only charged on a confirmed success — a failed attempt below never
      // calls this, so there's nothing to refund.
      await recordSpend(project.userId, IMAGE_CREDIT_COST, "generation_image", generationId);
    } catch (err) {
      await worker
        .from("generations")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : "Generation failed",
        })
        .eq("id", generationId);
    }
  });
}

export async function generateShotVideo(shotId: string) {
  const supabase = await createClient();
  const { prompt, style, projectId, userId, referenceImageUrls } = await loadShotForGeneration(supabase, shotId);

  const provider = getVideoProvider();
  const creditCost = videoCreditCost(DEFAULT_SHOT_VIDEO_DURATION_SECONDS);
  await requireCredits(userId, creditCost);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({ shot_id: shotId, project_id: projectId, provider: provider.name, type: "video", status: "pending" })
    .select("id")
    .single();
  if (insertError || !generation) {
    throw new Error(insertError?.message ?? "Failed to start generation");
  }

  const { error: statusError } = await supabase
    .from("shots")
    .update({ status: "generating" })
    .eq("id", shotId);
  if (statusError) {
    throw new Error(statusError.message);
  }

  // start() returns as soon as the run is registered, not when it finishes —
  // the workflow's own steps handle the provider call and result write, so
  // this action returns to the client immediately (rule: nothing that calls
  // an external generation API runs synchronously in a request handler).
  const run = await start(generateVideoWorkflow, [
    generation.id,
    projectId,
    { prompt, style, durationSeconds: DEFAULT_SHOT_VIDEO_DURATION_SECONDS, referenceImageUrls },
    userId,
    creditCost,
    shotId,
  ]);

  await supabase
    .from("generations")
    .update({ workflow_run_id: run.runId })
    .eq("id", generation.id);
}
