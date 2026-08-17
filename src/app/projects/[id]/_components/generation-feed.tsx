"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteGeneration } from "@/lib/actions/media";
import { ConfirmDialog } from "../../../_components/confirm-dialog";
import { MediaGrid, type MediaGridItem } from "./media-grid";

type Row = MediaGridItem & { kind: string; asset_id?: string | null; created_at: string };

/**
 * Realtime-subscribed grid for any project-scoped generation kind(s)
 * (freeform images, image-to-video, character sheets). Subscribes on
 * project_id (the only column Supabase Realtime filters on here) and
 * filters kind/assetId client-side, since a single row's `kind` can't be
 * expressed as part of the postgres_changes filter string alongside
 * project_id without a compound filter.
 */
export function GenerationFeed({
  projectId,
  kinds,
  type,
  assetId,
  initialItems,
  emptyLabel,
  columns,
  showPrompt,
  onEditPrompt,
}: {
  projectId: string;
  kinds: string[];
  /** When provided, only rows whose `type` column also matches are included — needed because kind='shot' rows can be either "image" or "video", and kind alone can't tell them apart. */
  type?: string;
  assetId?: string;
  initialItems: Row[];
  emptyLabel: string;
  columns?: 2 | 3;
  /** Set false when the prompt is already shown/editable elsewhere (e.g. the Assets tab's own description field). Defaults true. */
  showPrompt?: boolean;
  onEditPrompt?: (prompt: string) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    // RLS on `generations` is keyed off auth.uid(), so Realtime must have the
    // user's JWT before a channel joins — createBrowserClient resolves the
    // session asynchronously, and joining before that resolves silently
    // authorizes the socket as anon, which makes every future broadcast on
    // this channel invisible under RLS for the socket's whole lifetime (no
    // error, just no events). Awaiting getSession() + realtime.setAuth()
    // before .subscribe() avoids that race.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      const channel = supabase
        .channel(`generations:${projectId}:${kinds.join(",")}${type ? `:${type}` : ""}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "generations", filter: `project_id=eq.${projectId}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as { id?: string } | undefined)?.id;
              if (!deletedId) return;
              setItems((prev) => prev.filter((item) => item.id !== deletedId));
              return;
            }
            const row = payload.new as Row | undefined;
            if (!row?.id || !kinds.includes(row.kind)) return;
            if (type && row.type !== type) return;
            if (assetId && row.asset_id !== assetId) return;
            setItems((prev) => {
              const existing = prev.find((item) => item.id === row.id);
              if (existing) {
                return prev.map((item) => (item.id === row.id ? { ...item, ...row } : item));
              }
              return [row, ...prev];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kinds/type/assetId are effectively static per-page, re-subscribing on identity churn is unnecessary
  }, [projectId]);

  async function confirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteGeneration(projectId, id);
      // The DELETE realtime event above removes it from `items` once it
      // arrives — no local removal here, so a failed delete doesn't need
      // to be rolled back.
    } catch (err) {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      window.alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <>
      <MediaGrid
        items={items}
        emptyLabel={emptyLabel}
        columns={columns}
        showPrompt={showPrompt}
        onEditPrompt={onEditPrompt}
        onDelete={setConfirmDeleteId}
        deletingIds={deletingIds}
      />
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this item?"
          description="This can't be undone."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </>
  );
}
