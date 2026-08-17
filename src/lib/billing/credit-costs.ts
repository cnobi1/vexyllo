// Pricing — sized against real BytePlus per-call cost (Seedream ~$0.075/image,
// Seedance roughly $0.03/$0.07/$0.12-0.15 per second at 480p/720p/1080p) with
// a margin buffer, on a working assumption of 1 credit ~= $0.05 of provider
// cost budget. See src/lib/billing/plans.ts for the $/credit these are sold
// at — that number must stay comfortably above these costs at every plan
// tier, not just on average. Re-validate against the actual BytePlus billing
// dashboard once available; these are estimates from third-party pricing
// pages, not the real invoice.
export const IMAGE_CREDIT_COST = 2;
export const VIDEO_CREDITS_PER_SECOND = 3;

// Flat per-request costs for LLM (DeepSeek) calls — script generation and
// scene breakdown were previously unmetered entirely. DeepSeek's own cost
// per call is small enough that precise metering isn't worth the UX
// friction; these exist mainly to close the "unlimited free generation"
// gap rather than to track DeepSeek cost precisely. BREAKDOWN_CREDIT_COST
// is charged once per generateSceneBreakdown request regardless of how many
// internal batches chunkScriptForBreakdown splits a long script into.
export const SCRIPT_CREDIT_COST = 2;
export const BREAKDOWN_CREDIT_COST = 3;

// Lower resolutions cost the provider less compute, so picking 480p/720p
// over the 1080p baseline should lower the credit charge, not just the
// output size. An unset/unrecognized resolution prices as "1080p" — this
// matches BytePlus's own behavior when no resolution is sent (it falls back
// to its default, which is 1080p), so existing callers that don't pass a
// resolution see no cost change. The "4k" entry is inert today (the UI's
// resolution-control.tsx only ever offers 480p/720p/1080p) but is kept for
// forward compatibility if a higher tier is ever exposed.
const RESOLUTION_COST_MULTIPLIER: Record<string, number> = {
  "480p": 1 / 3,
  "720p": 0.5,
  "1080p": 1,
  "4k": 1.5,
};

export function videoCreditCost(durationSeconds: number, resolution?: string): number {
  const multiplier = resolution ? (RESOLUTION_COST_MULTIPLIER[resolution] ?? 1) : 1;
  return Math.max(1, Math.ceil(durationSeconds * VIDEO_CREDITS_PER_SECOND * multiplier));
}
