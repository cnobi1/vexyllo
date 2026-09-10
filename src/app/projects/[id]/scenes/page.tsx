import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GenerateBreakdownForm } from "./generate-breakdown-form";
import { SceneList } from "./scene-list";
import { SceneTabs } from "./scene-tabs";
import { AssetsList } from "./assets-list";
import { resolveAssetImageUrlMap } from "@/lib/media/asset-references";
import type { CharacterOption } from "../_components/character-picker";

export default async function ScenesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, script_text, target_scene_duration_seconds")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const hasScript = Boolean(project.script_text?.trim());

  // Secondary order needed: Postgres doesn't guarantee stable row order among
  // ties on `type` alone — without it, this list (and the asset chips built
  // from it) can silently reshuffle between requests.
  const { data: assets } = await supabase
    .from("assets")
    .select("id, type, name, description")
    .eq("project_id", id)
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });

  const imageUrlByAsset = await resolveAssetImageUrlMap(
    supabase,
    id,
    (assets ?? []).map((asset) => asset.id),
  );

  const assetsById = Object.fromEntries(
    (assets ?? []).map((asset) => [
      asset.id,
      { name: asset.name, type: asset.type, imageUrl: imageUrlByAsset[asset.id] ?? null },
    ]),
  );

  const assetOptions: CharacterOption[] = (assets ?? []).map((asset) => ({
    id: asset.id,
    name: asset.name,
    referenceImageUrl: imageUrlByAsset[asset.id] ?? null,
  }));

  // Fetched once for the whole project (rather than one query per card) and
  // grouped client-side below — feeds each AssetCard's inline generate
  // accordion in AssetsList.
  const { data: assetGenerations } = await supabase
    .from("generations")
    .select("id, kind, type, status, output_url, storage_path, params, error, asset_id, created_at")
    .eq("project_id", id)
    .eq("kind", "character_sheet")
    .order("created_at", { ascending: false });

  const generationsByAsset: Record<string, NonNullable<typeof assetGenerations>> = {};
  for (const generation of assetGenerations ?? []) {
    if (!generation.asset_id) continue;
    (generationsByAsset[generation.asset_id] ??= []).push(generation);
  }

  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, order_index, summary, dialogue, script_text, duration_seconds, scene_assets(asset_id, wardrobe_note)")
    .eq("project_id", id)
    .order("order_index", { ascending: true });

  const hasScenes = Boolean(scenes && scenes.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      {hasScript ? (
        <GenerateBreakdownForm
          projectId={project.id}
          hasScenes={hasScenes}
          targetSceneDurationSeconds={project.target_scene_duration_seconds}
        />
      ) : (
        <div className="card-glow flex flex-col gap-3 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-foreground">Generate Scenes</h2>
          <p className="text-sm text-muted">
            This project doesn&apos;t have a script yet. Add one on the Script tab before generating a scene
            breakdown.
          </p>
          <Link
            href={`/projects/${id}`}
            className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white"
          >
            Go to Script
          </Link>
        </div>
      )}

      <SceneTabs
        defaultTab="scenes"
        assets={
          assets && assets.length > 0 ? (
            <AssetsList
              projectId={id}
              assets={assets}
              imageUrlByAsset={imageUrlByAsset}
              generationsByAsset={generationsByAsset}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No assets yet — generate scenes from your script first.
            </p>
          )
        }
        scenes={
          scenes && scenes.length > 0 ? (
            <SceneList scenes={scenes} assetsById={assetsById} projectId={id} assetOptions={assetOptions} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No scenes yet — generate scenes from your script first.
            </p>
          )
        }
      />
    </main>
  );
}
