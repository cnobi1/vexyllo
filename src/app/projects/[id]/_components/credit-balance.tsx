"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Persistent credit-balance indicator in the project sidebar — otherwise
 * the only place a balance is visible anywhere in the app is the /billing
 * page, and every generation debits it silently in the background (see
 * spend-credits.ts) with no other feedback. Subscribes to `subscriptions`
 * UPDATE events the same way generation-feed.tsx subscribes to
 * `generations`, so the number moves live as spends/refunds land instead of
 * needing a page reload.
 */
export function CreditBalance({ userId, initialBalance }: { userId: string; initialBalance: number | null }) {
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    // Same session-then-subscribe ordering as generation-feed.tsx: RLS on
    // `subscriptions` is keyed off auth.uid(), so the socket needs the
    // user's JWT before the channel joins, or every event on it is
    // silently invisible under RLS for the channel's whole lifetime.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      const channel = supabase
        .channel(`subscriptions:${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as { credit_balance?: number } | undefined;
            if (typeof row?.credit_balance === "number") setBalance(row.credit_balance);
          },
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [userId]);

  return (
    <Link
      href="/billing"
      className="mb-3 flex items-center justify-between rounded-lg border border-border bg-background/40 px-2.5 py-2 text-xs transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <span className="text-muted-2">Credits</span>
      <span className="font-semibold text-foreground">{balance ?? "—"}</span>
    </Link>
  );
}
