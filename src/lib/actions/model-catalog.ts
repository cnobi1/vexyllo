"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./admin-guard";
import { runAction } from "./action-result";

export interface ModelCatalogInput {
  capability: "image" | "video";
  providerKey: "byteplus" | "gateway" | "alibaba" | "mock";
  providerModelId: string;
  displayName: string;
  description?: string;
  creditCostMode: "flat" | "duration_multiplier";
  flatCreditCost?: number | null;
  creditsPerSecond?: number | null;
  resolutionCostMultiplier?: Record<string, number> | null;
  creditsPerReferenceImage?: number | null;
  allowedDurations?: { min: number; max: number } | null;
  allowedResolutions?: string[] | null;
  allowedRatios?: string[] | null;
  supportsImageToVideo?: boolean;
  supportsReferenceImages?: boolean;
  maxReferenceImages?: number | null;
  sortOrder?: number;
}

function toRow(input: ModelCatalogInput) {
  return {
    capability: input.capability,
    provider_key: input.providerKey,
    provider_model_id: input.providerModelId,
    display_name: input.displayName,
    description: input.description ?? null,
    credit_cost_mode: input.creditCostMode,
    flat_credit_cost: input.flatCreditCost ?? null,
    credits_per_second: input.creditsPerSecond ?? null,
    resolution_cost_multiplier: input.resolutionCostMultiplier ?? null,
    credits_per_reference_image: input.creditsPerReferenceImage ?? null,
    allowed_durations: input.allowedDurations ?? null,
    allowed_resolutions: input.allowedResolutions ?? null,
    allowed_ratios: input.allowedRatios ?? null,
    supports_image_to_video: input.supportsImageToVideo ?? false,
    supports_reference_images: input.supportsReferenceImages ?? false,
    max_reference_images: input.maxReferenceImages ?? null,
    sort_order: input.sortOrder ?? 0,
  };
}

// Both admin roles manage the catalog per the two-tier role split — only
// managing other admins is Super Admin-only (see admin-admins.ts).
export async function createModel(input: ModelCatalogInput) {
  return runAction(() => createModelImpl(input));
}

async function createModelImpl(input: ModelCatalogInput) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  if (input.creditCostMode === "flat" && input.flatCreditCost == null) {
    throw new Error("Flat-cost models need a credit cost.");
  }
  if (input.creditCostMode === "duration_multiplier" && input.creditsPerSecond == null) {
    throw new Error("Duration-priced models need a credits-per-second rate.");
  }

  const { error } = await supabase.from("generation_models").insert(toRow(input));
  if (error) throw new Error(error.message);

  revalidatePath("/admin/models");
}

export async function updateModel(id: string, input: ModelCatalogInput) {
  return runAction(() => updateModelImpl(id, input));
}

async function updateModelImpl(id: string, input: ModelCatalogInput) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  if (input.creditCostMode === "flat" && input.flatCreditCost == null) {
    throw new Error("Flat-cost models need a credit cost.");
  }
  if (input.creditCostMode === "duration_multiplier" && input.creditsPerSecond == null) {
    throw new Error("Duration-priced models need a credits-per-second rate.");
  }

  const { error } = await supabase.from("generation_models").update(toRow(input)).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/models");
}

export async function setModelActive(id: string, isActive: boolean) {
  return runAction(() => setModelActiveImpl(id, isActive));
}

async function setModelActiveImpl(id: string, isActive: boolean) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from("generation_models").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/models");
}

export async function deleteModel(id: string) {
  return runAction(() => deleteModelImpl(id));
}

async function deleteModelImpl(id: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from("generation_models").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/models");
}
