"use client";

import { useState } from "react";
import { createPlanFeature, updatePlanFeature, deletePlanFeature } from "@/lib/actions/subscription-settings";
import { isActionError } from "@/lib/actions/action-result";
import { useTextLimits } from "@/app/_components/use-text-limits";

export type PlanFeatureRow = { id: string; planId: string; label: string; sortOrder: number };

/**
 * Grouped by plan, one card per bullet — mirrors ModelsTable's
 * group-by-capability shape (models-table.tsx) since both are "a handful of
 * admin-added rows under a fixed set of categories."
 */
export function PlanFeaturesTable({
  features,
  plans,
}: {
  features: PlanFeatureRow[];
  plans: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {plans.map((plan) => (
        <PlanFeatureGroup
          key={plan.id}
          planId={plan.id}
          planName={plan.name}
          rows={features.filter((f) => f.planId === plan.id)}
        />
      ))}
    </div>
  );
}

function nextSortOrder(rows: PlanFeatureRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

function PlanFeatureGroup({ planId, planName, rows }: { planId: string; planName: string; rows: PlanFeatureRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{planName}</h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
        >
          {adding ? "− Cancel" : "+ Add feature"}
        </button>
      </div>

      {rows.length === 0 && !adding && <p className="text-xs text-muted-2">No extra bullets on this card yet.</p>}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <PlanFeatureRowItem key={row.id} row={row} />
        ))}
        {adding && (
          <PlanFeatureAddForm planId={planId} defaultSortOrder={nextSortOrder(rows)} onDone={() => setAdding(false)} />
        )}
      </div>
    </div>
  );
}

function PlanFeatureAddForm({
  planId,
  defaultSortOrder,
  onDone,
}: {
  planId: string;
  defaultSortOrder: number;
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const limits = useTextLimits();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setError(null);
    setIsPending(true);
    const result = await createPlanFeature(planId, label, sortOrder);
    setIsPending(false);
    if (isActionError(result)) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-wrap items-end gap-2 rounded-xl p-3">
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm text-muted">
        <span className="text-xs text-muted-2">Bullet text</span>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Priority rendering queue"
          maxLength={limits.short_text}
          className="input"
        />
      </label>
      <label className="flex w-24 flex-col gap-1 text-sm text-muted">
        <span className="text-xs text-muted-2">Order</span>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="input"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}

function PlanFeatureRowItem({ row }: { row: PlanFeatureRow }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [sortOrder, setSortOrder] = useState(row.sortOrder);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const limits = useTextLimits();

  async function handleSave() {
    if (!label.trim()) return;
    setError(null);
    setIsPending(true);
    const result = await updatePlanFeature(row.id, label, sortOrder);
    setIsPending(false);
    if (isActionError(result)) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  async function handleDelete() {
    setError(null);
    setIsPending(true);
    const result = await deletePlanFeature(row.id);
    if (isActionError(result)) {
      setError(result.error);
      setIsPending(false);
    }
  }

  if (editing) {
    return (
      <div className="card-glow flex flex-wrap items-end gap-2 rounded-xl p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm text-muted">
          <span className="text-xs text-muted-2">Bullet text</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={limits.short_text} className="input" />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm text-muted">
          <span className="text-xs text-muted-2">Order</span>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="input" />
        </label>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-border-strong"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {error && <p className="w-full text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5 text-sm">
      <span className="text-foreground">{row.label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-full border border-danger/30 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
