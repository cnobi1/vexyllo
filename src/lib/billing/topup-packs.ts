export type TopUpPackId = "small" | "medium" | "large";

export interface TopUpPack {
  id: TopUpPackId;
  name: string;
  credits: number;
  priceUsd: number;
  /** Stripe Price ID for this pack (one-time, not recurring) — only set once created via the Stripe API/dashboard; the mock adapter doesn't need it. */
  stripePriceId?: string;
}

// Priced at a deliberate ~15-33% premium over the subscription $/credit rate
// (~$0.11-0.113, see plans.ts) so topping up never becomes cheaper than just
// upgrading a plan tier — a top-up is a convenience for mid-cycle overflow,
// not a way to undercut the subscription pricing.
export const TOPUP_PACKS: TopUpPack[] = [
  { id: "small", name: "Small top-up", credits: 200, priceUsd: 30, stripePriceId: process.env.STRIPE_PRICE_TOPUP_SMALL },
  { id: "medium", name: "Medium top-up", credits: 500, priceUsd: 70, stripePriceId: process.env.STRIPE_PRICE_TOPUP_MEDIUM },
  { id: "large", name: "Large top-up", credits: 1000, priceUsd: 130, stripePriceId: process.env.STRIPE_PRICE_TOPUP_LARGE },
];

export function getTopUpPack(id: TopUpPackId): TopUpPack {
  const pack = TOPUP_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown top-up pack: ${id}`);
  return pack;
}

export function isTopUpPackId(value: string): value is TopUpPackId {
  return TOPUP_PACKS.some((p) => p.id === value);
}
