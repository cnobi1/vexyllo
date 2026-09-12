"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteGeneration } from "@/lib/actions/media";
import { isActionError } from "@/lib/actions/action-result";
import { ConfirmDialog } from "../../../_components/confirm-dialog";
import { MediaGrid, type MediaGridItem } from "./media-grid";

type Row = MediaGridItem & { kind: string; asset_id?: string | null; created_at: string };

// generations.status only ever moves pending -> succeeded/failed (DB check
// constraint), so "still in progress" always means status === "pending" —
// no separate "generating" value exists at this column.
const PENDING_POLL_INTERVAL_MS = 10_000;

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
  onPendingChange,
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
  /** Fires whenever this feed's own "is anything still pending" answer changes — lets a caller show a generating indicator somewhere outside the feed itself (e.g. the asset card's main image, in assets-list.tsx). */
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    onPendingChange?.(items.some((item) => item.status === "pending"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPendingChange is a setState passed down by the caller, not a value this effect should re-run for on its own
  }, [items]);

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

  // Fallback for a realtime event that never arrives — none of this app's
  // postgres_changes subscriptions detect or recover from a dropped/expired
  // WebSocket (no status callback on .subscribe(), no reconnect logic), so a
  // channel that silently dies mid-generation leaves the UI stuck showing
  // "pending" forever with no error. This mainly bites video generation:
  // it runs for minutes via a durable Workflow, which is long enough for a
  // background-tab-throttled or idle-timed-out connection to miss the
  // terminal update, whereas near-instant image generations rarely outlive
  // a fresh connection. Rather than trying to reproduce/diagnose the exact
  // disconnect (browser throttling, network blip, server-side idle
  // timeout — any of which could be the actual cause on a given run),
  // directly re-querying still-pending rows on an interval guarantees the
  // UI self-heals regardless of why realtime missed it.
  useEffect(() => {
    const supabase = createClient();
    const interval = setInterval(async () => {
      const pendingIds = itemsRef.current.filter((item) => item.status === "pending").map((item) => item.id);
      if (pendingIds.length === 0) return;
      const { data } = await supabase
        .from("generations")
        .select("id, status, output_url, storage_path, error")
        .in("id", pendingIds);
      if (!data || data.length === 0) return;
      setItems((prev) =>
        prev.map((item) => {
          const fresh = data.find((row) => row.id === item.id);
          return fresh ? { ...item, ...fresh } : item;
        }),
      );
    }, PENDING_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function confirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    const result = await deleteGeneration(projectId, id);
    if (isActionError(result)) {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      window.alert(result.error);
      return;
    }
    // The DELETE realtime event above removes it from `items` once it
    // arrives — no local removal here, so a failed delete doesn't need
    // to be rolled back.
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
