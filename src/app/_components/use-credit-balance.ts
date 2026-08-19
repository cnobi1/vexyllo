"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Live-updating credit balance, shared by the project sidebar's
 * CreditBalance and the dashboard header's CreditBadge — both need the same
 * realtime subscription, just different markup around the number.
 * Subscribes to `subscriptions` UPDATE events so the number moves as
 * spends/refunds land instead of needing a page reload.
 */
export function useCreditBalance(userId: string, initialBalance: number | null) {
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    // Session-then-subscribe ordering matters: RLS on `subscriptions` is
    // keyed off auth.uid(), so the socket needs the user's JWT before the
    // channel joins, or every event on it is silently invisible under RLS
    // for the channel's whole lifetime.
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

  return balance;
}
