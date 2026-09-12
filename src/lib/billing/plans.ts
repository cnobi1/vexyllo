import type { createClient } from "@/lib/supabase/server";

export type PlanId = "starter" | "pro" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  /** Credits granted on subscribe and on every renewal. */
  monthlyCredits: number;
  /** Stripe Price ID for this plan — only set once a real Stripe account is connected and its prices are created; the mock adapter doesn't need it. */
  stripePriceId?: string;
}

// Credit grants are sized so $/credit stays roughly flat (~$0.11-0.113)
// across every tier instead of discounting as plan size goes up — a
// discount here previously undercut the real cost of a credit (see
// credit-costs.ts) at the Pro and Studio tiers, turning a bigger plan into a
// bigger loss per generation. Swap in real Stripe Price IDs (via env vars)
// once a Stripe account is connected — no live STRIPE_SECRET_KEY is set yet,
// so billing currently runs on the mock adapter and collects no real payment.
//
// Video credit pricing was recalibrated against a real BytePlus invoice on
// 2026-09-08 (see credit-costs.ts and
// supabase/migrations/20260908000000_recalibrate_video_credit_pricing.sql) —
// Seedance video generation was underpriced 5-10x. monthlyCredits below were
// deliberately left unchanged in that fix: at the corrected price, a Studio
// subscriber's 700 credits now buys roughly 3-4 videos/month (8s/480p)
// instead of ~29. Whether to raise these allotments/prices for video is a
// separate, still-open pricing decision — not resolved by this comment.
export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", priceUsd: 9, monthlyCredits: 80, stripePriceId: process.env.STRIPE_PRICE_STARTER },
  { id: "pro", name: "Pro", priceUsd: 29, monthlyCredits: 260, stripePriceId: process.env.STRIPE_PRICE_PRO },
  { id: "studio", name: "Studio", priceUsd: 79, monthlyCredits: 700, stripePriceId: process.env.STRIPE_PRICE_STUDIO },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function isPlanId(value: string): value is PlanId {
  return PLANS.some((p) => p.id === value);
}

// Admin-tunable credit allotment per plan — editable at /admin/subscriptions
// with no code deploy. Price/name/stripePriceId deliberately stay static
// (see the subscription_plans migration's comment: Stripe doesn't allow
// editing an existing Price's amount, so price isn't a DB-row concern).
// Falls back to the hardcoded PLANS value above if the DB read fails or a
// row is missing, same defensive pattern as text-limits.ts/credit-costs.ts.
export async function loadPlans(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Plan[]> {
  const { data } = await supabase.from("subscription_plans").select("id, monthly_credits");
  const creditsById = new Map((data ?? []).map((row) => [row.id, row.monthly_credits]));
  return PLANS.map((plan) => ({ ...plan, monthlyCredits: creditsById.get(plan.id) ?? plan.monthlyCredits }));
}

export async function loadPlan(supabase: Awaited<ReturnType<typeof createClient>>, id: PlanId): Promise<Plan> {
  const plan = getPlan(id);
  const { data } = await supabase.from("subscription_plans").select("monthly_credits").eq("id", id).maybeSingle();
  return data ? { ...plan, monthlyCredits: data.monthly_credits } : plan;
}
