"use client";

import { useState, useTransition } from "react";
import { subscribe, cancelSubscription, topUpCredits } from "@/lib/actions/billing";
import { isActionError } from "@/lib/actions/action-result";
import type { PlanId } from "@/lib/billing/plans";
import type { TopUpPackId } from "@/lib/billing/topup-packs";

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
            // On success, subscribeImpl's own redirect() throws internally
            // (digest "NEXT_REDIRECT") and propagates straight through
            // runAction (see action-result.ts) — this only ever resolves to
            // an {error} value for a genuine failure (e.g. no Stripe price
            // configured).
            const result = await subscribe(planId);
            if (isActionError(result)) {
              setError(result.error);
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

export function TopUpButton({ packId }: { packId: TopUpPackId }) {
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
            // Same redirect()-throws-internally caveat as SubscribeButton.
            const result = await topUpCredits(packId);
            if (isActionError(result)) {
              setError(result.error);
            }
          });
        }}
        className="block w-full rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : "Buy credits"}
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
            const result = await cancelSubscription();
            if (isActionError(result)) {
              setError(result.error);
              return;
            }
            // See src/app/projects/[id]/images/delete-upload-button.tsx —
            // router.refresh() after a directly-invoked Server Action has
            // proven unreliable in this dev setup, and subscriptions isn't
            // a realtime-published table.
            window.location.reload();
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
