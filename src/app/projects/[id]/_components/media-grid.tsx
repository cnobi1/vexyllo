import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "./status-pill";
import { GenerationMedia } from "./generation-media";

export type MediaGridItem = {
  id: string;
  type: string;
  status: string;
  output_url: string | null;
  storage_path?: string | null;
  params?: { prompt?: string } | null;
  error: string | null;
  /** 1-based scene position (matching the Scenes tab's own "Scene N" numbering), snapshotted at generation time for videos made via the Videos tab's "From scene" mode — see resolveSceneNumber in media.ts. Null for everything else. */
  scene_number?: number | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionForMime(mime: string, type: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg")) return "jpg";
  return type === "video" ? "mp4" : "png";
}

/**
 * Fetches the media as a blob and saves it via a synthetic same-origin
 * object-URL link — the only reliable way to control the saved filename.
 * A plain `<a href download>` pointed straight at a cross-origin Supabase
 * Storage signed URL isn't consistently honored by browsers (no
 * Content-Disposition: attachment header from Storage), so it can't be used
 * here. Re-signs from storage_path first, same as GenerationMedia, since a
 * persisted output_url may be an expired 1h-TTL signed URL.
 */
async function downloadItem(item: MediaGridItem) {
  let url = item.output_url;
  if (item.storage_path) {
    const { data } = await createClient().storage.from("media").createSignedUrl(item.storage_path, SIGNED_URL_TTL_SECONDS);
    if (data) url = data.signedUrl;
  }
  if (!url) return;

  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const namePrefix = item.scene_number ? `Scene ${item.scene_number} - ${item.type}` : `${item.type}-${item.id.slice(0, 8)}`;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${namePrefix}.${extensionForMime(blob.type, item.type)}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[14px] w-[14px]">
      <path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[14px] w-[14px]">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MediaGrid({
  items,
  emptyLabel,
  columns = 3,
  showPrompt = true,
  onEditPrompt,
  onDelete,
  deletingIds,
}: {
  items: MediaGridItem[];
  emptyLabel: string;
  columns?: 1 | 2 | 3;
  /** Set false when the prompt is already shown/editable elsewhere (e.g. the Assets tab's own description field). */
  showPrompt?: boolean;
  /** When provided, succeeded items with a recorded prompt get an "Edit & regenerate" affordance. */
  onEditPrompt?: (prompt: string) => void;
  /** When provided, every item gets a delete affordance. */
  onDelete?: (id: string) => void;
  deletingIds?: Set<string>;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul
      className={`grid grid-cols-1 gap-4 ${columns === 1 ? "" : "sm:grid-cols-2"} ${columns === 3 ? "lg:grid-cols-3" : ""}`}
    >
      {items.map((item) => {
        const prompt = item.params?.prompt;
        const isDeleting = deletingIds?.has(item.id) ?? false;
        return (
          <li key={item.id} className="card-glow rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium capitalize text-foreground">{item.type}</span>
                {item.scene_number != null && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">
                    Scene {item.scene_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={item.status} />
                {item.status === "succeeded" && item.output_url && (
                  <button
                    type="button"
                    onClick={() => downloadItem(item)}
                    aria-label="Download"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <DownloadIcon />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    disabled={isDeleting}
                    aria-label="Delete"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
            {item.status === "succeeded" && item.output_url && (
              <GenerationMedia
                url={item.output_url}
                storagePath={item.storage_path ?? null}
                alt={`Generated ${item.type}`}
                type={item.type}
              />
            )}
            {item.status === "failed" && item.error && <p className="mt-2 text-xs text-danger">{item.error}</p>}
            {showPrompt && prompt && (
              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs text-muted">{prompt}</p>
                {onEditPrompt && (
                  <button
                    type="button"
                    onClick={() => onEditPrompt(prompt)}
                    className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
                  >
                    Edit &amp; regenerate
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
