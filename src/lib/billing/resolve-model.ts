import type { createClient } from "@/lib/supabase/server";
import type { GenerationModelPricing } from "./credit-costs";

export interface GenerationModel extends GenerationModelPricing {
  id: string;
  capability: "image" | "video";
  providerKey: "byteplus" | "gateway" | "alibaba" | "mock";
  providerModelId: string;
  allowedDurations: { min: number; max: number } | null;
  allowedResolutions: string[] | null;
  allowedRatios: string[] | null;
}

type Row = {
  id: string;
  capability: "image" | "video";
  provider_key: "byteplus" | "gateway" | "alibaba" | "mock";
  provider_model_id: string;
  credit_cost_mode: "flat" | "duration_multiplier";
  flat_credit_cost: number | null;
  credits_per_second: number | null;
  resolution_cost_multiplier: Record<string, number> | null;
  credits_per_reference_image: number | null;
  allowed_durations: { min: number; max: number } | null;
  allowed_resolutions: string[] | null;
  allowed_ratios: string[] | null;
};

function toModel(row: Row): GenerationModel {
  return {
    id: row.id,
    capability: row.capability,
    providerKey: row.provider_key,
    providerModelId: row.provider_model_id,
    creditCostMode: row.credit_cost_mode,
    flatCreditCost: row.flat_credit_cost,
    creditsPerSecond: row.credits_per_second,
    resolutionCostMultiplier: row.resolution_cost_multiplier,
    creditsPerReferenceImage: row.credits_per_reference_image,
    allowedDurations: row.allowed_durations,
    allowedResolutions: row.allowed_resolutions,
    allowedRatios: row.allowed_ratios,
  };
}

/**
 * The catalog's own "pick for me" default — the lowest sort_order *non-mock*
 * active row for a capability, falling back to mock only if it's the sole
 * active row. Mock is seeded at sort_order 0 so it wins on a pure sort — that
 * was fine when it was also the only configured provider, but once a real
 * key (e.g. BYTEPLUS_API_KEY) goes live, a real model must always outrank it
 * without an admin having to remember to flip mock's is_active off by hand.
 * Used by call sites with no model-picker UI of their own, e.g.
 * autofillAssetImages' bulk "generate one for everything missing an image"
 * action.
 */
export async function loadDefaultActiveModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  capability: "image" | "video",
): Promise<GenerationModel> {
  const { data, error } = await supabase
    .from("generation_models")
    .select(
      "id, capability, provider_key, provider_model_id, credit_cost_mode, flat_credit_cost, credits_per_second, resolution_cost_multiplier, credits_per_reference_image, allowed_durations, allowed_resolutions, allowed_ratios",
    )
    .eq("capability", capability)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  const pick = rows.find((row) => row.provider_key !== "mock") ?? rows[0];
  if (!pick) {
    throw new Error(`No active ${capability} model is configured.`);
  }
  return toModel(pick);
}

/**
 * Active models for a capability, lowest sort_order first — what the
 * Images/Videos tabs' ModelSelectControl renders and defaults to. Shaped
 * for direct use as ModelOption[] (see _components/model-select-control.tsx)
 * without a further mapping step at each call site.
 */
export async function loadModelOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  capability: "image" | "video",
): Promise<
  {
    id: string;
    displayName: string;
    description: string | null;
    providerKey: "byteplus" | "gateway" | "alibaba" | "mock";
    allowedDurations: { min: number; max: number } | null;
    allowedResolutions: string[] | null;
    allowedRatios: string[] | null;
    creditCostMode: "flat" | "duration_multiplier";
    flatCreditCost: number | null;
    creditsPerSecond: number | null;
    resolutionCostMultiplier: Record<string, number> | null;
    creditsPerReferenceImage: number | null;
  }[]
> {
  const { data, error } = await supabase
    .from("generation_models")
    .select(
      "id, display_name, description, provider_key, allowed_durations, allowed_resolutions, allowed_ratios, credit_cost_mode, flat_credit_cost, credits_per_second, resolution_cost_multiplier, credits_per_reference_image",
    )
    .eq("capability", capability)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    description: row.description,
    providerKey: row.provider_key,
    allowedDurations: row.allowed_durations,
    allowedResolutions: row.allowed_resolutions,
    allowedRatios: row.allowed_ratios,
    creditCostMode: row.credit_cost_mode,
    flatCreditCost: row.flat_credit_cost,
    creditsPerSecond: row.credits_per_second,
    resolutionCostMultiplier: row.resolution_cost_multiplier,
    creditsPerReferenceImage: row.credits_per_reference_image,
  }));
}

/**
 * Loads a user-chosen model from the generation_models catalog, scoped to
 * the capability the calling action expects (an image action can't be
 * pointed at a video model id, and vice versa) and to currently-active
 * rows only — an admin deactivating a model immediately stops new
 * generations from using it, even if a stale client still has it selected.
 */
export async function loadActiveModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  modelId: string,
  capability: "image" | "video",
): Promise<GenerationModel> {
  const { data, error } = await supabase
    .from("generation_models")
    .select(
      "id, capability, provider_key, provider_model_id, credit_cost_mode, flat_credit_cost, credits_per_second, resolution_cost_multiplier, credits_per_reference_image, allowed_durations, allowed_resolutions, allowed_ratios",
    )
    .eq("id", modelId)
    .eq("capability", capability)
    .eq("is_active", true)
    .single();
  if (error || !data) {
    throw new Error("Selected model is not available. Please pick another.");
  }
  return toModel(data as Row);
}
