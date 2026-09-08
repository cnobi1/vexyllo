import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { ModelsTable, type AdminModelRow } from "@/app/admin/_components/models-table";

type Row = {
  id: string;
  capability: "image" | "video";
  provider_key: "byteplus" | "gateway" | "alibaba" | "mock";
  provider_model_id: string;
  display_name: string;
  description: string | null;
  credit_cost_mode: "flat" | "duration_multiplier";
  flat_credit_cost: number | null;
  credits_per_second: number | null;
  resolution_cost_multiplier: Record<string, number> | null;
  credits_per_reference_image: number | null;
  allowed_durations: { min: number; max: number } | null;
  allowed_resolutions: string[] | null;
  allowed_ratios: string[] | null;
  supports_image_to_video: boolean;
  supports_reference_images: boolean;
  max_reference_images: number | null;
  is_active: boolean;
  sort_order: number;
};

export default async function AdminModelsPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data, error } = await supabase
    .from("generation_models")
    .select(
      "id, capability, provider_key, provider_model_id, display_name, description, credit_cost_mode, flat_credit_cost, credits_per_second, resolution_cost_multiplier, credits_per_reference_image, allowed_durations, allowed_resolutions, allowed_ratios, supports_image_to_video, supports_reference_images, max_reference_images, is_active, sort_order",
    )
    .order("capability", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  const models: AdminModelRow[] = ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    capability: row.capability,
    providerKey: row.provider_key,
    providerModelId: row.provider_model_id,
    displayName: row.display_name,
    description: row.description ?? "",
    creditCostMode: row.credit_cost_mode,
    flatCreditCost: row.flat_credit_cost,
    creditsPerSecond: row.credits_per_second,
    resolutionCostMultiplier: row.resolution_cost_multiplier,
    creditsPerReferenceImage: row.credits_per_reference_image,
    allowedDurations: row.allowed_durations,
    allowedResolutions: row.allowed_resolutions,
    allowedRatios: row.allowed_ratios,
    supportsImageToVideo: row.supports_image_to_video,
    supportsReferenceImages: row.supports_reference_images,
    maxReferenceImages: row.max_reference_images,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Generation models</h1>
        <p className="mt-0.5 text-sm text-muted">
          Which image/video models users can pick from, and what each one costs in credits.
        </p>
      </header>

      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <ModelsTable models={models} />
      </div>
    </div>
  );
}
