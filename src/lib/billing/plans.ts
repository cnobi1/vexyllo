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
// bigger loss per generation. Re-validate against real BytePlus invoice
// numbers once available; swap in real Stripe Price IDs (via env vars) once
// a Stripe account is connected — no live STRIPE_SECRET_KEY is set yet, so
// billing currently runs on the mock adapter and collects no real payment.
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
