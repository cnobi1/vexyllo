"use client";

import { useState, useTransition } from "react";
import { subscribe, cancelSubscription } from "@/lib/actions/billing";
import type { PlanId } from "@/lib/billing/plans";

export function SubscribeButton({ planId, isCurrent }: { planId: PlanId; isCurrent: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isCurrent) {
    return (
      <span className="btn-primary block rounded-full px-4 py-2 text-center text-sm font-medium text-white opacity-60">
        Current plan
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await subscribe(planId);
            } catch (err) {
              // redirect() throws internally on success — only a genuine
              // failure (e.g. no Stripe price configured) reaches here.
              setError(err instanceof Error ? err.message : "Failed to start checkout");
            }
          });
        }}
        className="btn-primary block w-full rounded-full px-4 py-2 text-center text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : "Subscribe"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function CancelButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await cancelSubscription();
              // See src/app/projects/[id]/images/delete-upload-button.tsx —
              // router.refresh() after a directly-invoked Server Action has
              // proven unreliable in this dev setup, and subscriptions isn't
              // a realtime-published table.
              window.location.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to cancel");
            }
          });
        }}
        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-50"
      >
        {isPending ? "Canceling…" : "Cancel subscription"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
