import { createServiceClient } from "@/lib/supabase/service";

export class InsufficientCreditsError extends Error {
  constructor(available: number, required: number) {
    super(`Not enough credits for this — it needs ${required}, you have ${available}. Upgrade your plan or wait for your next refill.`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Throws InsufficientCreditsError if the caller can't afford `cost` credits.
 * Call this before creating any generation ledger row, so an unaffordable
 * request never leaves a stray "pending" row behind. No subscription row at
 * all reads as a balance of 0 — generation is subscription-gated by design.
 *
 * Uses the service-role client: subscriptions/credits_ledger deliberately
 * have no RLS write policy for the authenticated role (crediting/debiting
 * an account is a system operation, not the user editing their own data —
 * see src/lib/supabase/service.ts), but reading a balance to decide whether
 * to proceed is safe to centralize here the same way.
 */
export async function requireCredits(userId: string, cost: number): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("credit_balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const balance = data?.credit_balance ?? 0;
  if (balance < cost) throw new InsufficientCreditsError(balance, cost);
}

/**
 * Debits `cost` credits for a generation that just succeeded — call only
 * once a generation is confirmed "succeeded" (never up front, and never for
 * a failed attempt). requireCredits still gates *starting* a generation the
 * customer obviously can't afford, but the actual charge only lands once
 * there's something to show for it, so a failure never costs a credit and
 * needs no compensating refund.
 */
export async function recordSpend(
  userId: string,
  cost: number,
  reason: "generation_image" | "generation_video" | "generation_script",
  generationId: string | null,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("credits_ledger")
    .insert({ user_id: userId, amount: -cost, reason, generation_id: generationId });
  if (error) throw new Error(error.message);
}
