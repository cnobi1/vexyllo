"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { generateFreeformImages, generateVideoFromImage } from "@/lib/actions/media";
import { uploadImage } from "@/lib/actions/uploads";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_CREDIT_COST, videoCreditCost } from "@/lib/billing/credit-costs";
import { QuantityControl } from "../_components/quantity-control";
import { RatioControl } from "../_components/ratio-control";
import { DurationControl } from "../_components/duration-control";
import { ResolutionControl } from "../_components/resolution-control";
import type { CharacterOption } from "../_components/character-picker";
import { PromptMentionField, extractMentionedAssetIds, type MentionAssetOption } from "../_components/prompt-mention-field";

export type Mode = "generate" | "upload" | "video";

/** Uploads/generated images have no `name` column like assets do — this carries the bucket-relative path needed to re-sign a fresh URL at submit time (see handleVideoSubmit/handleSubmit). */
export type MediaMentionOption = MentionAssetOption & { storagePath: string | null };

export function ImageGenerateForm({
  projectId,
  characters,
  prefill,
  mode,
  onModeChange,
  uploadMentionOptions,
  imageMentionOptions,
  minDuration,
  maxDuration,
}: {
  projectId: string;
  characters: CharacterOption[];
  /** Set (with a fresh `nonce`) to prefill the prompt from an existing generation's "Edit & regenerate". */
  prefill?: { value: string; nonce: number } | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  /** @-mentionable uploads, for "video" mode's source-image reference. */
  uploadMentionOptions: MediaMentionOption[];
  /** @-mentionable succeeded freeform-image generations, kept live via a realtime subscription in images-workspace.tsx. */
  imageMentionOptions: MediaMentionOption[];
  minDuration: number;
  maxDuration: number;
}) {
  const [prompt, setPrompt] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ratio, setRatio] = useState("16:9");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [appliedNonce, setAppliedNonce] = useState(prefill?.nonce);

  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState(() => Math.min(8, maxDuration));
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoRatio, setVideoRatio] = useState("16:9");
  const [videoQuantity, setVideoQuantity] = useState(1);
  const [isGeneratingVideo, startVideoTransition] = useTransition();

  // Adjusting state in response to a prop change is done during render
  // (React's recommended pattern), not in an effect.
  if (prefill && prefill.nonce !== appliedNonce) {
    setAppliedNonce(prefill.nonce);
    setPrompt(prefill.value);
  }

  const characterMentionOptions: MediaMentionOption[] = characters.map((character) => ({
    id: character.id,
    name: character.name,
    type: "character",
    referenceImageUrl: character.referenceImageUrl,
    storagePath: null,
  }));
  const generateMentionOptions: MediaMentionOption[] = [
    ...characterMentionOptions,
    ...uploadMentionOptions,
    ...imageMentionOptions,
  ];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    const mentionedIds = extractMentionedAssetIds(prompt, generateMentionOptions);
    const matched = generateMentionOptions.filter((option) => mentionedIds.includes(option.id));
    const referenceAssetIds = matched.filter((option) => option.type === "character").map((option) => option.id);
    // Uploads/generated images @-mentioned here aren't tied to an asset —
    // their reference URL is resolved fresh client-side (same re-sign
    // pattern as handleVideoSubmit) and sent straight through as an extra
    // reference image, alongside whatever asset-derived references the
    // server resolves from referenceAssetIds.
    const referenceMediaOptions = matched.filter((option) => option.type !== "character" && option.storagePath);
    setError(null);
    startTransition(async () => {
      try {
        let extraReferenceImageUrls: string[] | undefined;
        if (referenceMediaOptions.length > 0) {
          const supabase = createClient();
          const signedResults = await Promise.all(
            referenceMediaOptions.map((option) =>
              supabase.storage.from("media").createSignedUrl(option.storagePath as string, 60 * 60),
            ),
          );
          extraReferenceImageUrls = signedResults
            .map((result) => result.data?.signedUrl)
            .filter((url): url is string => Boolean(url));
        }
        await generateFreeformImages(projectId, {
          prompt,
          quantity,
          ratio: ratio || undefined,
          referenceAssetIds: referenceAssetIds.length > 0 ? referenceAssetIds : undefined,
          extraReferenceImageUrls,
        });
        setPrompt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    });
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    // input.files is a *live* FileList — Array.from must run before
    // clearing event.target.value below, since that clear mutates the same
    // live FileList in place (not just the input's .value), silently
    // leaving a captured-but-uncopied reference at length 0.
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = ""; // allow re-selecting the same filename(s) later
    if (fileList.length === 0) return;
    setError(null);
    startUploadTransition(async () => {
      // Each file uploads independently (uploadImage validates/stores one
      // file per call) so one bad file (wrong type, too large) doesn't block
      // the rest of the batch.
      const results = await Promise.allSettled(
        fileList.map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          return uploadImage(projectId, formData);
        }),
      );
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed.length === results.length) {
        setError(failed[0].reason instanceof Error ? failed[0].reason.message : "Failed to upload images");
        return;
      }
      if (failed.length > 0) {
        // Some succeeded, so the reload below still needs to happen to show
        // them — a blocking alert surfaces the partial failure instead of
        // the inline error state, which the reload would otherwise wipe
        // before it's ever seen.
        window.alert(`${failed.length} of ${results.length} images failed to upload.`);
      }
      // router.refresh() has proven unreliable here (hangs without
      // throwing) in this Next.js 16/Turbopack dev setup — a full reload
      // reliably reflects the new upload(s) in the grid below, same pattern
      // as delete-upload-button.tsx.
      window.location.reload();
    });
  }

  function handleVideoSubmit(event: FormEvent) {
    event.preventDefault();
    if (!videoPrompt.trim()) return;
    const mergedOptions = [...uploadMentionOptions, ...imageMentionOptions];
    const mentionedIds = extractMentionedAssetIds(videoPrompt, mergedOptions);
    // Characters aren't offered as mention options in this mode (BytePlus
    // drops reference images outright whenever a source image is present —
    // see byteplus-adapter.ts — so a character mention here would silently
    // do nothing). If more than one image/upload is mentioned, the first
    // match found wins, same "first wins, rest dropped" precedent as
    // elsewhere in this codebase — no blocking validation for that case.
    const matched = mergedOptions.find((option) => mentionedIds.includes(option.id) && option.storagePath);
    if (!matched || !matched.storagePath) {
      setError("Type @ to reference an uploaded or generated image to turn into a video.");
      return;
    }
    setError(null);
    const matchedStoragePath = matched.storagePath;
    const matchedType = matched.type;
    const matchedId = matched.id;
    startVideoTransition(async () => {
      try {
        // Re-sign fresh right before submitting rather than trusting a URL
        // signed back when the dropdown option list was built (could be
        // stale by the time of a real submit) — same client-side re-sign
        // pattern as generation-media.tsx.
        const supabase = createClient();
        const { data: signed, error: signError } = await supabase.storage
          .from("media")
          .createSignedUrl(matchedStoragePath, 60 * 60);
        if (signError || !signed) {
          throw new Error("Failed to prepare the referenced image — try again.");
        }
        await generateVideoFromImage(projectId, {
          sourceUrl: signed.signedUrl,
          sourceUploadId: matchedType === "upload" ? matchedId : undefined,
          prompt: videoPrompt,
          durationSeconds: videoDuration,
          resolution: videoResolution,
          ratio: videoRatio || undefined,
          quantity: videoQuantity,
        });
        setVideoPrompt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    });
  }

  const videoCreditTotal = videoCreditCost(videoDuration, videoResolution) * videoQuantity;

  return (
    <div className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onModeChange("generate")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "generate"
              ? "border-border-strong bg-primary/15 text-foreground"
              : "border-border text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => onModeChange("upload")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "upload"
              ? "border-border-strong bg-primary/15 text-foreground"
              : "border-border text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          Upload your own
        </button>
        <button
          type="button"
          onClick={() => onModeChange("video")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "video"
              ? "border-border-strong bg-primary/15 text-foreground"
              : "border-border text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          Turn into video
        </button>
      </div>

      {mode === "upload" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Bring in images generated elsewhere and use them as a reference or a video source.</p>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              onChange={handleFileUpload}
              className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:opacity-50"
            />
            {isUploading && <span className="text-xs text-muted">Uploading…</span>}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {mode === "video" && (
        <form onSubmit={handleVideoSubmit} className="flex flex-col gap-3">
          <PromptMentionField
            value={videoPrompt}
            onChange={setVideoPrompt}
            options={[...uploadMentionOptions, ...imageMentionOptions]}
            mentionStyle="inline"
            placeholder="Describe the motion/action… type @ to reference an uploaded or generated image as the video's source"
          />
          <div className="flex flex-wrap items-center gap-4">
            <DurationControl value={videoDuration} onChange={setVideoDuration} min={minDuration} max={maxDuration} />
            <ResolutionControl value={videoResolution} onChange={setVideoResolution} />
            <RatioControl value={videoRatio} onChange={setVideoRatio} />
            <QuantityControl value={videoQuantity} onChange={setVideoQuantity} max={4} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted">
              {videoCreditTotal} credit{videoCreditTotal === 1 ? "" : "s"}
            </span>
            <button
              type="submit"
              disabled={isGeneratingVideo}
              className="btn-primary rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isGeneratingVideo ? "Generating…" : "✦ Generate video"}
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}

      {mode === "generate" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <PromptMentionField
            value={prompt}
            onChange={setPrompt}
            options={generateMentionOptions}
            mentionStyle="inline"
            placeholder="Describe the image you want to generate… type @ to reference a character or an image"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <QuantityControl value={quantity} onChange={setQuantity} />
              <RatioControl value={ratio} onChange={setRatio} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                {quantity * IMAGE_CREDIT_COST} credit{quantity * IMAGE_CREDIT_COST === 1 ? "" : "s"}
              </span>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Generating…" : "✦ Generate"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}
    </div>
  );
}
