import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAssetImageUrlMap } from "@/lib/media/asset-references";
import { getVideoModelLimits } from "@/lib/providers/byteplus/model-limits";
import { ImagesWorkspace } from "./images-workspace";
import { DeleteUploadButton } from "./delete-upload-button";

export default async function ImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) {
    notFound();
  }

  const { data: characters } = await supabase
    .from("assets")
    .select("id, name, reference_image_url")
    .eq("project_id", id)
    .eq("type", "character")
    .order("name", { ascending: true });

  // Re-sign from asset_images.storage_path — reference_image_url may be an
  // expired 1h-TTL signed URL persisted from generation time.
  const characterIds = (characters ?? []).map((character) => character.id);
  const imageUrlByAsset = await resolveAssetImageUrlMap(supabase, id, characterIds);

  // "Images" shows every generated image, not just freeform ones — kind
  // only tells you *why* a row exists (freeform_image/shot/character_sheet/
  // scene_storyboard all produce images too), while `type` tells you *what*
  // the provider produced. Filtering by type='image' instead of a single
  // kind is what keeps this in sync with "All Media" (media/page.tsx),
  // which shows everything.
  const { data: generations } = await supabase
    .from("generations")
    .select("id, kind, type, status, output_url, storage_path, params, error, created_at")
    .eq("project_id", id)
    .eq("type", "image")
    .order("created_at", { ascending: false })
    .limit(60);

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, storage_path, original_filename, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const signedUploads = await Promise.all(
    (uploads ?? []).map(async (upload) => {
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(upload.storage_path, 60 * 60);
      return { ...upload, url: signed?.signedUrl ?? null };
    }),
  );

  const { data: videoGenerations } = await supabase
    .from("generations")
    .select("id, kind, type, status, output_url, storage_path, params, error, created_at")
    .eq("project_id", id)
    .in("kind", ["image_to_video", "upload_to_video"])
    .order("created_at", { ascending: false })
    .limit(60);

  const limits = getVideoModelLimits(process.env.BYTEPLUS_VIDEO_MODEL);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Images</h1>
        <p className="text-sm text-muted">
          Generate images from a text prompt. Type @ to reference a character or an image to keep it visually
          consistent.
        </p>
      </div>
      <ImagesWorkspace
        projectId={id}
        characters={(characters ?? []).map((character) => ({
          id: character.id,
          name: character.name,
          referenceImageUrl: imageUrlByAsset[character.id] ?? null,
        }))}
        initialItems={generations ?? []}
        uploads={signedUploads.map((upload) => ({
          id: upload.id,
          storagePath: upload.storage_path,
          url: upload.url,
        }))}
        videoInitialItems={videoGenerations ?? []}
        minDuration={limits.minDurationSeconds}
        maxDuration={limits.maxDurationSeconds}
      />

      {signedUploads.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Your uploads</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {signedUploads.map((upload) =>
              upload.url ? (
                <li key={upload.id} className="card-glow flex flex-col gap-2 rounded-2xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail from a signed Storage URL */}
                  <img
                    src={upload.url}
                    alt={upload.original_filename ?? "Upload"}
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <DeleteUploadButton projectId={id} uploadId={upload.id} />
                  </div>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
