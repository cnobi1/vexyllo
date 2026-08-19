"use client";

import Link from "next/link";
import { useCreditBalance } from "@/app/_components/use-credit-balance";

/**
 * Persistent credit-balance indicator in the project sidebar — otherwise
 * the only place a balance is visible anywhere in the app is the /billing
 * page, and every generation debits it silently in the background (see
 * spend-credits.ts) with no other feedback.
 */
export function CreditBalance({ userId, initialBalance }: { userId: string; initialBalance: number | null }) {
  const balance = useCreditBalance(userId, initialBalance);

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
