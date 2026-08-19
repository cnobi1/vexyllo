"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { subscribe, cancelSubscription } from "@/lib/actions/billing";
import type { PlanId } from "@/lib/billing/plans";

// Mirrors the CTA color logic on /pricing (featured/top-tier/default) so a
// plan's call-to-action reads the same whether the visitor is logged in or
// not.
const VARIANT_CLASS = {
  featured: "btn-primary",
  top: "bg-primary-2 text-white transition-colors hover:brightness-110",
  default:
    "border border-border text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover",
} as const;

export function SubscribeButton({
  planId,
  isCurrent,
  variant = "default",
}: {
  planId: PlanId;
  isCurrent: boolean;
  variant?: keyof typeof VARIANT_CLASS;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isCurrent) {
    return (
      <span className="btn-primary block rounded-full px-5 py-3 text-center text-sm font-semibold text-white opacity-60">
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
              // redirect() throws internally on success (digest
              // "NEXT_REDIRECT") — unstable_rethrow lets that specific
              // throw continue on to Next's own navigation handling
              // instead of being swallowed here as a fake error. Only a
              // genuine failure (e.g. no Stripe price configured) reaches
              // setError below.
              unstable_rethrow(err);
              setError(err instanceof Error ? err.message : "Failed to start checkout");
            }
          });
        }}
        className={`block w-full rounded-full px-5 py-3 text-center text-sm font-semibold disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
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
