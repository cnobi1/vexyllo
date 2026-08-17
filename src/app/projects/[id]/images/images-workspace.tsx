"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageGenerateForm, type Mode, type MediaMentionOption } from "./image-generate-form";
import { GenerationFeed } from "../_components/generation-feed";
import type { CharacterOption } from "../_components/character-picker";
import type { MediaGridItem } from "../_components/media-grid";

type GenerationRow = MediaGridItem & { kind: string; created_at: string };

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Lifts state that needs to be shared between the generate form and the
 * results feed (siblings under the server component): prompt-prefill (so
 * "Edit & regenerate" on a card below can populate the form above it), the
 * mode toggle (so the feed can switch between showing images and videos),
 * and the @-mention option lists for "Turn into video" mode.
 */
export function ImagesWorkspace({
  projectId,
  characters,
  initialItems,
  uploads,
  videoInitialItems,
  minDuration,
  maxDuration,
}: {
  projectId: string;
  characters: CharacterOption[];
  initialItems: GenerationRow[];
  uploads: { id: string; storagePath: string; url: string | null }[];
  videoInitialItems: GenerationRow[];
  minDuration: number;
  maxDuration: number;
}) {
  const [prefill, setPrefill] = useState<{ value: string; nonce: number } | null>(null);
  const [mode, setMode] = useState<Mode>("generate");

  // Uploads only change via a full page reload (see image-generate-form.tsx's
  // upload mode), so a static, page-load-computed list is fine here — no
  // live sync needed, unlike freeform images below. Numbered oldest-first
  // (stable for the life of the page) so a number a customer already typed
  // never silently starts pointing at a different upload.
  const uploadMentionOptions: MediaMentionOption[] = uploads.map((upload, index) => ({
    id: upload.id,
    name: `Upload ${uploads.length - index}`,
    type: "upload",
    referenceImageUrl: upload.url,
    storagePath: upload.storagePath,
  }));

  const [imageMentionOptions, setImageMentionOptions] = useState<MediaMentionOption[]>([]);

  // Seeds the @-mention list from the server-fetched feed items on mount.
  // Numbered oldest-first, matching the running counter the realtime effect
  // below continues (prev.length + 1 for each new arrival) so numbers stay
  // stable rather than shifting every time a new image finishes.
  useEffect(() => {
    let cancelled = false;
    const succeeded = initialItems.filter((item) => item.status === "succeeded" && item.storage_path);
    const supabase = createClient();
    Promise.all(
      succeeded.map(async (item, index) => {
        const { data: signed } = await supabase.storage
          .from("media")
          .createSignedUrl(item.storage_path as string, SIGNED_URL_TTL_SECONDS);
        return {
          id: item.id,
          name: `Image ${succeeded.length - index}`,
          type: "image",
          referenceImageUrl: signed?.signedUrl ?? null,
          storagePath: item.storage_path as string,
        } satisfies MediaMentionOption;
      }),
    ).then((options) => {
      if (!cancelled) setImageMentionOptions(options);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialItems is the server-fetched seed for first paint only; new arrivals come from the realtime effect below, not from this prop changing
  }, []);

  // A freeform image generated earlier in this same session must be
  // @-mentionable in "video" mode without a page reload. GenerationFeed
  // keeps its own internal realtime state and doesn't expose it to a
  // parent, so this is a small, dedicated subscription rather than a change
  // to that shared component (which has other consumers with no interest
  // in this concern).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      const channel = supabase
        .channel(`image-mentions:${projectId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "generations", filter: `project_id=eq.${projectId}` },
          async (payload) => {
            if (payload.eventType === "DELETE") {
              // A deleted generation must stop being @-mentionable — its
              // storage object is gone too (see deleteGeneration in
              // media.ts), so leaving it in the list would let a customer
              // reference an image that no longer exists.
              const deletedId = (payload.old as { id?: string } | undefined)?.id;
              if (!deletedId) return;
              setImageMentionOptions((prev) => prev.filter((option) => option.id !== deletedId));
              return;
            }
            const row = payload.new as
              | { id: string; kind: string; status: string; storage_path: string | null }
              | undefined;
            if (!row || row.kind !== "freeform_image" || row.status !== "succeeded" || !row.storage_path) return;
            const { data: signed } = await supabase.storage
              .from("media")
              .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
            if (cancelled) return;
            setImageMentionOptions((prev) => {
              if (prev.some((option) => option.id === row.id)) return prev;
              const next: MediaMentionOption = {
                id: row.id,
                name: `Image ${prev.length + 1}`,
                type: "image",
                referenceImageUrl: signed?.signedUrl ?? null,
                storagePath: row.storage_path,
              };
              return [next, ...prev];
            });
          },
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [projectId]);

  return (
    <>
      <ImageGenerateForm
        projectId={projectId}
        characters={characters}
        prefill={prefill}
        mode={mode}
        onModeChange={setMode}
        uploadMentionOptions={uploadMentionOptions}
        imageMentionOptions={imageMentionOptions}
        minDuration={minDuration}
        maxDuration={maxDuration}
      />
      {mode === "video" ? (
        <GenerationFeed
          key="videos"
          projectId={projectId}
          kinds={["image_to_video", "upload_to_video"]}
          initialItems={videoInitialItems}
          emptyLabel="No videos yet — generate one above."
          columns={2}
        />
      ) : (
        <GenerationFeed
          key="images"
          projectId={projectId}
          kinds={["freeform_image", "shot", "character_sheet", "scene_storyboard"]}
          type="image"
          initialItems={initialItems}
          emptyLabel="No images yet — generate one above."
          columns={2}
          onEditPrompt={(prompt) => setPrefill({ value: prompt, nonce: Date.now() })}
        />
      )}
    </>
  );
}
