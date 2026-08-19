"use client";

import Link from "next/link";
import { useCreditBalance } from "@/app/_components/use-credit-balance";

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
    </svg>
  );
}

/**
 * Header-pill version of the credit balance, for the dashboard — a
 * different rendering of the same live-updating data the project sidebar's
 * CreditBalance shows (see use-credit-balance.ts).
 */
export function CreditBadge({ userId, initialBalance }: { userId: string; initialBalance: number | null }) {
  const balance = useCreditBalance(userId, initialBalance);

  return (
    <Link
      href="/billing"
      className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <BoltIcon />
      {balance ?? "—"} <span className="text-muted">credits</span>
    </Link>
  );
}
