import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAssetImageUrlMap } from "@/lib/media/asset-references";
import { getVideoModelLimits } from "@/lib/providers/byteplus/model-limits";
import { VideoGenerateForm } from "./video-generate-form";
import { GenerationFeed } from "../_components/generation-feed";
import type { MentionAssetOption } from "../_components/prompt-mention-field";
import { gridToRatio, type StoryboardGrid } from "@/lib/prompts/scene-storyboard";

export default async function VideosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) {
    notFound();
  }

  const [{ data: assets }, { data: sourceImages }, { data: uploads }, { data: generations }, { data: scenes }] =
    await Promise.all([
      // Secondary order needed: Postgres doesn't guarantee stable row order
      // among ties on `type` alone (see storyboard/page.tsx for the fuller
      // writeup) — without it, the @mention dropdown's asset list can
      // silently reorder between page loads.
      supabase
        .from("assets")
        .select("id, name, type, reference_image_url")
        .eq("project_id", id)
        .order("type", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("generations")
        .select("id, output_url, storage_path")
        .eq("project_id", id)
        .eq("type", "image")
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("uploads")
        .select("id, storage_path")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("generations")
        .select("id, kind, type, status, output_url, storage_path, error, created_at")
        .eq("project_id", id)
        .in("kind", ["image_to_video", "upload_to_video"])
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("scenes")
        .select("id, order_index, summary, dialogue, script_text, duration_seconds, scene_assets(asset_id, wardrobe_note)")
        .eq("project_id", id)
        .order("order_index", { ascending: true }),
    ]);

  // Each scene's latest succeeded storyboard sheet (see the Scenes tab) —
  // "From scene" mode auto-attaches this as the video's first frame. BytePlus
  // hard-rejects an explicit ratio whenever a first-frame image is supplied
  // (the output always follows that image's own ratio) — sceneStoryboardRatios
  // lets the form say exactly which ratio that'll be, instead of a vague
  // "follows the source image" that silently overrides whatever the customer
  // had selected without saying what it becomes.
  const sceneIds = (scenes ?? []).map((scene) => scene.id);
  const sceneStoryboardUrls: Record<string, string> = {};
  const sceneStoryboardRatios: Record<string, string> = {};
  if (sceneIds.length > 0) {
    const { data: storyboards } = await supabase
      .from("generations")
      .select("id, scene_id, output_url, storage_path, params, created_at")
      .eq("kind", "scene_storyboard")
      .eq("status", "succeeded")
      .in("scene_id", sceneIds)
      .order("created_at", { ascending: false });
    const latestByScene = new Map<
      string,
      { output_url: string | null; storage_path: string | null; params: { grid?: StoryboardGrid } | null }
    >();
    for (const storyboard of storyboards ?? []) {
      if (!storyboard.scene_id || latestByScene.has(storyboard.scene_id)) continue;
      latestByScene.set(storyboard.scene_id, storyboard);
    }
    await Promise.all(
      [...latestByScene.entries()].map(async ([sceneId, storyboard]) => {
        if (storyboard.params?.grid) sceneStoryboardRatios[sceneId] = gridToRatio(storyboard.params.grid);
        if (!storyboard.storage_path) {
          if (storyboard.output_url) sceneStoryboardUrls[sceneId] = storyboard.output_url;
          return;
        }
        const { data: signed } = await supabase.storage.from("media").createSignedUrl(storyboard.storage_path, 60 * 60);
        const url = signed?.signedUrl ?? storyboard.output_url;
        if (url) sceneStoryboardUrls[sceneId] = url;
      }),
    );
  }

  const signedUploads = await Promise.all(
    (uploads ?? []).map(async (upload) => {
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(upload.storage_path, 60 * 60);
      return { id: upload.id, url: signed?.signedUrl ?? null };
    }),
  );

  // Re-sign from storage_path rather than trusting output_url, which may be
  // an expired 1h-TTL signed URL persisted from generation time.
  const signedSourceImages = await Promise.all(
    (sourceImages ?? []).map(async (generation) => {
      if (!generation.storage_path) return { id: generation.id, url: generation.output_url };
      const { data: signed } = await supabase.storage
        .from("media")
        .createSignedUrl(generation.storage_path, 60 * 60);
      return { id: generation.id, url: signed?.signedUrl ?? generation.output_url };
    }),
  );

  // Re-sign from asset_images.storage_path — reference_image_url may be an
  // expired 1h-TTL signed URL persisted from generation time (same fix as
  // sourceImages above).
  const imageUrlByAsset = await resolveAssetImageUrlMap(
    supabase,
    id,
    (assets ?? []).map((asset) => asset.id),
  );

  const assetOptions: MentionAssetOption[] = (assets ?? []).map((asset) => ({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    referenceImageUrl: imageUrlByAsset[asset.id] ?? null,
  }));

  const sceneOptions = (scenes ?? []).map((scene) => ({
    id: scene.id,
    order_index: scene.order_index,
    summary: scene.summary,
    dialogue: scene.dialogue,
    script_text: scene.script_text,
    duration_seconds: scene.duration_seconds,
    assets: scene.scene_assets,
  }));

  const limits = getVideoModelLimits(process.env.BYTEPLUS_VIDEO_MODEL);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Videos</h1>
        <p className="text-sm text-muted">
          Turn a generated image or an upload into a video — or generate one purely from a referenced character.
        </p>
      </div>
      <VideoGenerateForm
        projectId={id}
        sourceImages={signedSourceImages.filter((generation): generation is { id: string; url: string } =>
          Boolean(generation.url),
        )}
        uploads={signedUploads.filter((upload): upload is { id: string; url: string } => Boolean(upload.url))}
        scenes={sceneOptions}
        sceneStoryboardUrls={sceneStoryboardUrls}
        sceneStoryboardRatios={sceneStoryboardRatios}
        assetOptions={assetOptions}
        minDuration={limits.minDurationSeconds}
        maxDuration={limits.maxDurationSeconds}
      />
      <GenerationFeed
        projectId={id}
        kinds={["image_to_video", "upload_to_video"]}
        initialItems={generations ?? []}
        emptyLabel="No videos yet — generate one above."
      />
    </main>
  );
}
