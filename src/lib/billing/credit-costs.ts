import type { createClient } from "@/lib/supabase/server";

// Pricing — validated against a real BytePlus invoice
// (bill_detail_3003786644_20260908_20260901_479063.csv, 2026-09-06/07):
// Seedream image generation actually costs $0.09/image (IMAGE_CREDIT_COST=2
// at ~$0.1125/credit comfortably covers that, ~60% margin — unchanged here).
//
// Seedance video generation actually cost $5.79-$9.26 per task (avg $6.95).
// Cross-referencing that invoice against the `generations` table showed
// these were image_to_video requests, mostly 25-30s long, with 1-9
// reference images each (each reference image is sent as its own multimodal
// input to BytePlus, which likely adds billed tokens) — NOT 8s/no-reference
// clips as a first pass at this fix assumed. VIDEO_CREDITS_PER_SECOND and
// CREDITS_PER_REFERENCE_IMAGE below were recalibrated off the real duration/
// reference-count range instead:
//   - duration: $6.95 avg / ~27s avg observed duration / 0.5 (720p
//     multiplier) ≈ $0.51/sec baseline; targeting a ~50% margin against the
//     worst observed per-task cost ($9.26 / ~25s) gives ≈ $0.74/sec at 720p
//     ≈ 13.2/sec baseline (1080p-equivalent) → rounded to 14.
//   - reference images: the sample's cost spread ($5.79-$9.26, a $3.47
//     range) loosely tracks the reference-count spread (1-9 images), but
//     duration varies at the same time in the same 7 rows, so this can't be
//     cleanly isolated — treated as a rough upper-bound estimate instead:
//     ~$3.47 / 8 extra images ≈ $0.43/image ≈ 4 credits/image, charged for
//     each reference image beyond the first (the first is covered by the
//     base per-second rate — a single-reference request costs the same as
//     before this surcharge existed).
// MIN_VIDEO_CREDIT_COST guards against a short clip having a fixed
// per-request cost floor independent of duration (the cheapest real task
// observed, ~10s, still cost $5.79 — the duration-only formula alone would
// undercharge it).
// This is a rough estimate from a noisy 7-task/2-day sample where duration
// and reference count vary together — re-validate against a full month of
// invoices once available. The resolution multiplier table is unchanged —
// no real data yet for 1080p/4k. Alibaba/Gateway video models still use
// their original unvalidated per-second rates and have no reference-image
// surcharge configured.
export const IMAGE_CREDIT_COST = 2;
export const VIDEO_CREDITS_PER_SECOND = 14;
export const CREDITS_PER_REFERENCE_IMAGE = 4;
export const MIN_VIDEO_CREDIT_COST = 80;

// Admin-tunable global credit costs — script/breakdown/min-video-floor
// aren't tied to any one generation_models row (unlike per-model image/video
// pricing, already admin-editable via /admin/models), so they live in their
// own small table (credit_cost_settings) instead, editable at
// /admin/subscriptions. Constants above stay as the fallback defaults used
// if the DB read ever fails or a row goes missing — same defensive pattern
// as text-limits.ts.
export interface CreditCostSettings {
  scriptCreditCost: number;
  breakdownCreditCost: number;
  minVideoCreditCost: number;
}

export const DEFAULT_CREDIT_COST_SETTINGS: CreditCostSettings = {
  scriptCreditCost: 2,
  breakdownCreditCost: 3,
  minVideoCreditCost: MIN_VIDEO_CREDIT_COST,
};

const CREDIT_COST_SETTINGS_KEYS: Record<keyof CreditCostSettings, string> = {
  scriptCreditCost: "script",
  breakdownCreditCost: "breakdown",
  minVideoCreditCost: "min_video_floor",
};

/** Server-side loader — call with the request's Supabase client from inside a server action. */
export async function loadCreditCostSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CreditCostSettings> {
  const { data } = await supabase.from("credit_cost_settings").select("key, credits");
  const byKey = new Map((data ?? []).map((row) => [row.key, row.credits]));
  const settings = { ...DEFAULT_CREDIT_COST_SETTINGS };
  for (const field of Object.keys(CREDIT_COST_SETTINGS_KEYS) as (keyof CreditCostSettings)[]) {
    const credits = byKey.get(CREDIT_COST_SETTINGS_KEYS[field]);
    if (credits != null) settings[field] = credits;
  }
  return settings;
}

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

export function videoCreditCost(durationSeconds: number, resolution?: string, minVideoCreditCost = MIN_VIDEO_CREDIT_COST): number {
  const multiplier = resolution ? (RESOLUTION_COST_MULTIPLIER[resolution] ?? 1) : 1;
  return Math.max(minVideoCreditCost, Math.ceil(durationSeconds * VIDEO_CREDITS_PER_SECOND * multiplier));
}

// Per-model pricing, sourced from a generation_models catalog row (see
// resolve-model.ts) rather than the flat constants above — those constants
// are exactly what the catalog's seed migration copied in, so existing
// models still cost the same. computeCreditCost replaces videoCreditCost/
// IMAGE_CREDIT_COST at every generation-action call site now that cost can
// vary per model (e.g. Wan 3.0's two tiers price differently from BytePlus).
export interface GenerationModelPricing {
  creditCostMode: "flat" | "duration_multiplier";
  flatCreditCost: number | null;
  creditsPerSecond: number | null;
  resolutionCostMultiplier: Record<string, number> | null;
  creditsPerReferenceImage: number | null;
}

export function computeCreditCost(
  model: GenerationModelPricing,
  opts: {
    durationSeconds?: number;
    resolution?: string;
    referenceImageCount?: number;
    /** Live value from credit_cost_settings ('min_video_floor') — defaults to the hardcoded constant when a caller doesn't have settings loaded (e.g. hasn't been updated to pass them yet). */
    minVideoCreditCost?: number;
  } = {},
): number {
  if (model.creditCostMode === "flat") {
    if (model.flatCreditCost == null) {
      throw new Error("Model is missing a flat credit cost");
    }
    return model.flatCreditCost;
  }
  const perSecond = model.creditsPerSecond ?? VIDEO_CREDITS_PER_SECOND;
  const table = model.resolutionCostMultiplier ?? RESOLUTION_COST_MULTIPLIER;
  const multiplier = opts.resolution ? (table[opts.resolution] ?? 1) : 1;
  const durationCost = (opts.durationSeconds ?? 0) * perSecond * multiplier;
  // The first reference/source image is covered by the base per-second
  // rate above — only extras beyond that are billed here (see the module
  // comment for how this number was derived).
  const extraReferenceImages = Math.max(0, (opts.referenceImageCount ?? 0) - 1);
  const referenceImageCost = extraReferenceImages * (model.creditsPerReferenceImage ?? CREDITS_PER_REFERENCE_IMAGE);
  return Math.max(opts.minVideoCreditCost ?? MIN_VIDEO_CREDIT_COST, Math.ceil(durationCost + referenceImageCost));
}
