import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSceneBreakdown } from "@/lib/actions/scenes";
import { GenerateButton } from "./submit-button";
import { SceneList } from "./scene-list";
import { SceneTabs } from "./scene-tabs";
import { AssetsList } from "./assets-list";
import { resolveAssetImageUrlMap } from "@/lib/media/asset-references";

export default async function ScenesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, target_scene_duration_seconds")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

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
  const generateSceneBreakdownWithId = generateSceneBreakdown.bind(null, project.id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <form action={generateSceneBreakdownWithId} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground">Generate Scenes</h2>
        <p className="text-sm text-muted">
          {hasScenes
            ? "Regenerating replaces the current scene breakdown with a fresh one from the script. Existing characters, locations, and props are matched by name and keep their reference images — only ones no longer in the script are removed."
            : "Break this project's script down into a scene-by-scene breakdown sheet: each scene's full text, estimated screen time, and the characters (with wardrobe notes), locations, and props it contains."}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Max scene duration
          <input
            type="number"
            name="targetSceneDurationSeconds"
            min={1}
            defaultValue={project.target_scene_duration_seconds ?? ""}
            placeholder="No max"
            className="w-20 rounded-lg border border-border bg-background/60 px-2 py-1 text-sm text-foreground outline-none focus:border-border-strong"
          />
          seconds (optional)
        </label>
        <GenerateButton hasScenes={hasScenes} />
      </form>

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
            <SceneList scenes={scenes} assetsById={assetsById} />
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
