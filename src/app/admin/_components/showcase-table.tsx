"use client";

import { useState, useTransition } from "react";
import { deleteShowcaseItem } from "@/lib/actions/showcase";
import { ConfirmDialog } from "../../_components/confirm-dialog";

export type ShowcaseItem = {
  id: string;
  kind: "image" | "video";
  prompt: string | null;
  url: string;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ShowcaseTable({ items, emptyLabel }: { items: ShowcaseItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-2">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Preview</th>
            <th className="px-4 py-3 font-medium">Prompt</th>
            <th className="px-4 py-3 font-medium">Added</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ShowcaseRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShowcaseRow({ item }: { item: ShowcaseItem }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setConfirming(false);
    startTransition(async () => {
      await deleteShowcaseItem(item.id);
    });
  }

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover/60">
      <td className="px-4 py-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background/60">
          {item.kind === "video" ? (
            <video src={item.url} muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            <img src={item.url} alt={item.prompt ?? ""} className="h-full w-full object-cover" />
          )}
        </div>
      </td>
      <td className="max-w-xs px-4 py-3 text-muted">
        {item.prompt ? <span className="line-clamp-2">{item.prompt}</span> : <span className="text-muted-2">—</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted">{dateFormatter.format(new Date(item.createdAt))}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(true)}
          className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
        {confirming && (
          <ConfirmDialog
            title="Delete this showcase item?"
            description="This removes it from the homepage immediately. This can't be undone."
            confirmLabel="Delete"
            onConfirm={handleConfirm}
            onCancel={() => setConfirming(false)}
          />
        )}
      </td>
    </tr>
  );
}
