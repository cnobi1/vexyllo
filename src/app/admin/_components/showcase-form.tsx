"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { extFromContentType } from "@/lib/media/copy-to-storage";
import { saveShowcaseItems, type PendingShowcaseItem } from "@/lib/actions/showcase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 45 * 1024 * 1024;

type PendingFile = {
  file: File;
  prompt: string;
  previewUrl: string;
};

export function ShowcaseForm() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setError(null);
    setPendingFiles((prev) => [
      ...prev,
      ...selected.map((file) => ({ file, prompt: "", previewUrl: URL.createObjectURL(file) })),
    ]);
    e.target.value = "";
  }

  function updatePrompt(index: number, prompt: string) {
    setPendingFiles((prev) => prev.map((p, i) => (i === index ? { ...p, prompt } : p)));
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      // Uploaded directly to Storage from the browser (not routed through a
      // Server Action) — video files were exceeding the server action body
      // size limit as soon as more than one was selected, which surfaced as
      // a cryptic "Unexpected end of form" parse error instead of a clean
      // size-limit message. The showcase bucket itself now enforces
      // size/mime-type limits (see the showcase_bucket_limits migration).
      const supabase = createClient();

      // One result per pendingFiles entry, same index — lets a partial
      // failure keep exactly the files that didn't make it, instead of
      // guessing which ones matched back up after the fact.
      const results: ({ item: PendingShowcaseItem } | { error: string })[] = [];

      for (const p of pendingFiles) {
        const isImage = p.file.type.startsWith("image/");
        const isVideo = p.file.type.startsWith("video/");
        if (!isImage && !isVideo) {
          results.push({ error: `${p.file.name}: only image or video files are supported.` });
          continue;
        }
        const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (p.file.size > maxBytes) {
          results.push({ error: `${p.file.name}: must be under ${Math.round(maxBytes / (1024 * 1024))}MB.` });
          continue;
        }

        const id = crypto.randomUUID();
        const path = `${id}.${extFromContentType(p.file.type)}`;
        const { error: uploadError } = await supabase.storage
          .from("showcase")
          .upload(path, p.file, { contentType: p.file.type });
        if (uploadError) {
          results.push({ error: `${p.file.name}: ${uploadError.message}` });
          continue;
        }

        results.push({
          item: { id, kind: isImage ? "image" : "video", storagePath: path, prompt: p.prompt.trim() || null },
        });
      }

      const uploaded = results.flatMap((r) => ("item" in r ? [r.item] : []));
      let saveError: string | null = null;

      if (uploaded.length > 0) {
        try {
          await saveShowcaseItems(uploaded);
        } catch (err) {
          await supabase.storage.from("showcase").remove(uploaded.map((u) => u.storagePath));
          saveError = err instanceof Error ? err.message : "Failed to save showcase items";
        }
      }

      if (saveError) {
        // The whole batch's DB insert failed together — nothing was saved,
        // so every file (upload successes included) stays pending for retry.
        setError(`0/${pendingFiles.length} added. ${saveError}`);
        return;
      }

      const failedIndexes = results.flatMap((r, i) => ("error" in r ? [i] : []));
      const remaining = failedIndexes.map((i) => pendingFiles[i]);
      pendingFiles.filter((_, i) => !failedIndexes.includes(i)).forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles(remaining);

      if (failedIndexes.length > 0) {
        const errors = results.flatMap((r) => ("error" in r ? [r.error] : []));
        setError(`${uploaded.length}/${pendingFiles.length} added. Failed — ${errors.join("; ")}`);
      }
    });
  }

  return (
    <div className="card-glow flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="files" className="text-sm text-muted">
          Images or videos — select multiple at once
        </label>
        <input
          id="files"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFilesSelected}
          className="text-sm text-foreground"
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingFiles.map((p, index) => (
            <div key={p.previewUrl} className="flex gap-3 rounded-lg border border-border p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background/60">
                {p.file.type.startsWith("video/") ? (
                  <video src={p.previewUrl} muted className="h-full w-full object-cover" />
                ) : (
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <textarea
                  value={p.prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  placeholder="Prompt used to generate it (optional)"
                  rows={2}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="self-start text-xs text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {pendingFiles.length > 0 && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Uploading…" : `Add ${pendingFiles.length} to showcase`}
        </button>
      )}
    </div>
  );
}
