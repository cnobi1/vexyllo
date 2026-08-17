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
};

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
              <span className="text-xs font-medium capitalize text-foreground">{item.type}</span>
              <div className="flex items-center gap-2">
                <StatusPill status={item.status} />
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
