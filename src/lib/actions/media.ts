"use server";

import { after } from "next/server";
import { start } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { getImageProvider } from "@/lib/providers/image";
import { getVideoProvider } from "@/lib/providers/video";
import type { GenerateVideoInput } from "@/lib/providers/video";
import { copyToMediaBucket } from "@/lib/media/copy-to-storage";
import { resolveAssetReferenceUrls } from "@/lib/media/asset-references";
import { generateVideoWorkflow } from "@/lib/workflows/generate-video";
import { buildCharacterSheetPrompt } from "@/lib/prompts/character-sheet";
import { buildPropSheetPrompt } from "@/lib/prompts/prop-sheet";
import { IMAGE_CREDIT_COST, videoCreditCost } from "@/lib/billing/credit-costs";
import { requireCredits, recordSpend } from "@/lib/billing/spend-credits";
import { withTransientRetry } from "@/lib/providers/retry";
import { loadOwnedProject } from "./project-guard";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// UI-exposed cap on "how many at a go" — BytePlus itself allows up to 15
// (minus however many reference images are supplied), but a much smaller
// ceiling keeps a single click from firing an expensive batch by accident.
const MAX_QUANTITY = 6;
// Videos have no native batch API (unlike images' sequential_image_generation)
// — each unit is its own independent task/workflow run, and each one is far
// slower/costlier than an image, so the ceiling here is tighter.
const MAX_VIDEO_QUANTITY = 4;

function clampVideoQuantity(quantity: number): number {
  return Math.min(MAX_VIDEO_QUANTITY, Math.max(1, Math.round(quantity)));
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Generation failed";
}

async function insertGenerationBatch(
  supabase: Supabase,
  args: {
    projectId: string;
    kind: "freeform_image" | "character_sheet";
    assetId?: string;
    provider: string;
    batchId: string;
    quantity: number;
    params: Record<string, unknown>;
  },
): Promise<{ id: string }[]> {
  const { data, error } = await supabase
    .from("generations")
    .insert(
      Array.from({ length: args.quantity }, () => ({
        project_id: args.projectId,
        kind: args.kind,
        asset_id: args.assetId ?? null,
        type: "image",
        status: "pending",
        provider: args.provider,
        batch_id: args.batchId,
        params: args.params,
      })),
    )
    .select("id");
  if (error || !data) throw new Error(error?.message ?? "Failed to start generation");
  return data;
}

/**
 * Writes the outcome of a batch image call back onto its pre-created
 * ledger rows, pairing returned images to rows positionally. A batch call
 * can legitimately return fewer images than requested (BytePlus reports
 * per-image failures inside a batch) — any row past the returned count is
 * marked failed individually rather than left pending forever. Returns the
 * rows that succeeded, with both the permanent storage path and a signed
 * URL, for callers (character sheets) that need to do more with them.
 */
async function settleImageBatch(
  supabase: Supabase,
  projectId: string,
  userId: string,
  rows: { id: string }[],
  images: { url: string; cost: number | null }[],
): Promise<{ id: string; path: string; signedUrl: string }[]> {
  const succeeded: { id: string; path: string; signedUrl: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const image = images[i];
    if (image) {
      const copied = await copyToMediaBucket(supabase, projectId, "generations", rows[i].id, image.url);
      await supabase
        .from("generations")
        .update({ status: "succeeded", output_url: copied.signedUrl, storage_path: copied.path, cost: image.cost })
        .eq("id", rows[i].id);
      // Only charged on a confirmed success — a row that fails below
      // (fewer images than requested) simply never gets billed.
      await recordSpend(userId, IMAGE_CREDIT_COST, "generation_image", rows[i].id);
      succeeded.push({ id: rows[i].id, ...copied });
    } else {
      await supabase
        .from("generations")
        .update({ status: "failed", error: "Provider returned fewer images than requested" })
        .eq("id", rows[i].id);
    }
  }
  return succeeded;
}

export async function generateFreeformImages(
  projectId: string,
  input: {
    prompt: string;
    quantity: number;
    ratio?: string;
    referenceAssetIds?: string[];
    /** assetId -> a specific asset_images.id, for picking a labeled outfit variant instead of the primary image. */
    referenceImageOverrides?: Record<string, string>;
    /** Reference image URLs already resolved client-side (e.g. from an @-mentioned upload or a previously-generated image, not tied to a character/location/prop asset) — merged with the asset-derived references below before the provider call. */
    extraReferenceImageUrls?: string[];
  },
) {
  const supabase = await createClient();
  const project = await loadOwnedProject(supabase, projectId);
  const provider = getImageProvider();

  const assetReferenceImageUrls = input.referenceAssetIds?.length
    ? await resolveAssetReferenceUrls(supabase, projectId, input.referenceAssetIds, input.referenceImageOverrides)
    : undefined;
  const referenceImageUrls = [...(assetReferenceImageUrls ?? []), ...(input.extraReferenceImageUrls ?? [])];

  const quantity = clampQuantity(input.quantity);
  await requireCredits(project.userId, IMAGE_CREDIT_COST * quantity);

  const batchId = crypto.randomUUID();
  const rows = await insertGenerationBatch(supabase, {
    projectId,
    kind: "freeform_image",
    provider: provider.name,
    batchId,
    quantity,
    params: {
      prompt: input.prompt,
      ratio: input.ratio ?? null,
      quantity,
      referenceAssetIds: input.referenceAssetIds ?? [],
      referenceImageOverrides: input.referenceImageOverrides ?? {},
      extraReferenceImageUrls: input.extraReferenceImageUrls ?? [],
    },
  });

  after(async () => {
    // Fresh client: this runs after the response is sent. See generations.ts.
    const worker = await createClient();
    try {
      const result = await withTransientRetry(() =>
        provider.generateImage({
          prompt: input.prompt,
          style: project.style,
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          quantity,
          ratio: input.ratio,
        }),
      );
      // settleImageBatch charges each row only as it confirms success.
      await settleImageBatch(worker, projectId, project.userId, rows, result.images);
    } catch (err) {
      // Only rows settleImageBatch never got to (still "pending") get
      // marked failed here — rows it already settled have their own status
      // and must not be touched twice. Nothing was charged for any of
      // these, so there's nothing to refund.
      await worker
        .from("generations")
        .update({ status: "failed", error: errorMessage(err) })
        .in(
          "id",
          rows.map((r) => r.id),
        )
        .eq("status", "pending");
    }
  });
}

export async function generateCharacterSheet(
  projectId: string,
  assetId: string,
  input: { prompt: string; quantity: number; ratio?: string },
) {
  const supabase = await createClient();
  const project = await loadOwnedProject(supabase, projectId);
  const provider = getImageProvider();

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, name, type, reference_image_url")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (assetError || !asset) {
    throw new Error(assetError?.message ?? "Character not found");
  }

  // Auto-include the character's existing primary image (if any) as a
  // reference so regenerating a sheet stays consistent with the first
  // generation instead of drifting to a new-looking character each time.
  const referenceImageUrls = asset.reference_image_url
    ? await resolveAssetReferenceUrls(supabase, projectId, [assetId])
    : undefined;

  // Characters always render as a full multi-panel reference board (front/
  // back/side/expressions/etc, see prompts/character-sheet.ts). Props render
  // as an isolated product-style shot on a plain white background (see
  // prompts/prop-sheet.ts) so they can be dropped into other generations as
  // a clean reference of just the object. Locations keep using the
  // description as-is, a single-subject scenic prompt.
  const effectivePrompt =
    asset.type === "character"
      ? buildCharacterSheetPrompt(input.prompt, asset.name)
      : asset.type === "prop"
        ? buildPropSheetPrompt(input.prompt, asset.name)
        : input.prompt;

  const quantity = clampQuantity(input.quantity);
  await requireCredits(project.userId, IMAGE_CREDIT_COST * quantity);

  const batchId = crypto.randomUUID();
  const rows = await insertGenerationBatch(supabase, {
    projectId,
    kind: "character_sheet",
    assetId,
    provider: provider.name,
    batchId,
    quantity,
    params: { prompt: input.prompt, quantity, ratio: input.ratio ?? null, hasReference: Boolean(referenceImageUrls) },
  });

  after(async () => {
    const worker = await createClient();
    try {
      const result = await withTransientRetry(() =>
        provider.generateImage({
          prompt: effectivePrompt,
          style: project.style,
          referenceImageUrls,
          quantity,
          ratio: input.ratio,
        }),
      );
      const succeeded = await settleImageBatch(worker, projectId, project.userId, rows, result.images);
      if (succeeded.length === 0) return;

      await worker.from("asset_images").insert(
        succeeded.map((row) => ({
          asset_id: assetId,
          generation_id: row.id,
          storage_path: row.path,
        })),
      );

      // Always promote the newest generation's first image to primary, not
      // just the very first one this asset ever got — the Characters/Assets
      // cards show only the primary image with no separate variant picker,
      // so "regenerate" needs to visibly replace what's shown each time
      // rather than silently adding an image nothing ever displays.
      const [first] = succeeded;
      await worker.from("asset_images").update({ is_primary: false }).eq("asset_id", assetId).eq("is_primary", true);
      await worker.from("asset_images").update({ is_primary: true }).eq("generation_id", first.id);
      await worker.from("assets").update({ reference_image_url: first.signedUrl }).eq("id", assetId);
    } catch (err) {
      // Nothing was charged for any pending row — see settleImageBatch.
      await worker
        .from("generations")
        .update({ status: "failed", error: errorMessage(err) })
        .in(
          "id",
          rows.map((r) => r.id),
        )
        .eq("status", "pending");
    }
  });
}

/**
 * Bulk-generates one reference image for every asset of a given type that
 * doesn't have one yet — reuses generateCharacterSheet per asset rather
 * than duplicating its ledger/storage/primary-image logic, so autofilled
 * assets go through the exact same, already-hardened path as a manual
 * single-asset generation.
 *
 * Always quantity 1, matching the per-asset "Generate"/"Regenerate" controls
 * in the Characters and Scenes Assets cards — locations previously
 * requested 4 per asset ("a few different angles"), but only the first
 * image of any batch ever becomes the asset's shown reference image (see
 * generateCharacterSheet's primary-promotion block) and neither card has a
 * variant picker to ever see the other images in a batch, so requesting more
 * than 1 here would just spend credits on results nothing displays.
 *
 * Fixed at 16:9 (not user-configurable) to match the Scenes > Assets tab's
 * default for the per-card "Generate" control too (see AssetGenerateForm) —
 * reference boards for a scene breakdown are meant to read like widescreen
 * storyboard panels, not square/portrait crops.
 */
export async function autofillAssetImages(projectId: string, type: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, description, reference_image_url")
    .eq("project_id", projectId)
    .eq("type", type);

  const targets = (assets ?? []).filter((asset) => !asset.reference_image_url);

  await Promise.all(
    targets.map((asset) =>
      generateCharacterSheet(projectId, asset.id, {
        prompt: asset.description?.trim() || asset.name,
        quantity: 1,
        ratio: "16:9",
      }),
    ),
  );
}

export async function generateVideoFromImage(
  projectId: string,
  input: {
    /** Omit for a pure character-referenced (multi-reference) video with no source frame. */
    sourceUrl?: string;
    sourceUploadId?: string;
    /** sourceUrl is a generated storyboard sheet, not a plain photo — see GenerateVideoInput.sourceIsStoryboard. */
    sourceIsStoryboard?: boolean;
    prompt: string | null;
    /** Freeform scene context ("From scene" mode only — see GenerateVideoInput.sceneContext) — the breakdown's scene summary plus any per-character wardrobe notes, merged into the generation prompt alongside `prompt` itself. */
    sceneContext?: string;
    durationSeconds: number;
    resolution?: string;
    ratio?: string;
    referenceAssetIds?: string[];
    /** Number of independent clips to generate from this same request. Defaults to 1. */
    quantity?: number;
  },
) {
  if (!input.sourceUrl && !input.referenceAssetIds?.length) {
    throw new Error("Provide a source image or at least one reference character.");
  }

  const supabase = await createClient();
  const project = await loadOwnedProject(supabase, projectId);
  const provider = getVideoProvider();

  const referenceImageUrls = input.referenceAssetIds?.length
    ? await resolveAssetReferenceUrls(supabase, projectId, input.referenceAssetIds)
    : undefined;

  // Unlike images, BytePlus has no native video batch mode — each unit is
  // its own task, so "quantity" here means starting N independent
  // ledger rows + workflow runs that happen to share a batch_id, not one
  // provider call fanning out into N outputs.
  const quantity = clampVideoQuantity(input.quantity ?? 1);
  const batchId = quantity > 1 ? crypto.randomUUID() : null;

  const creditCost = videoCreditCost(input.durationSeconds, input.resolution);
  await requireCredits(project.userId, creditCost * quantity);

  for (let i = 0; i < quantity; i++) {
    const { data: row, error } = await supabase
      .from("generations")
      .insert({
        project_id: projectId,
        // upload_to_video vs image_to_video only distinguishes provenance for
        // display purposes — source_upload_id already carries the real link.
        kind: input.sourceUploadId ? "upload_to_video" : "image_to_video",
        type: "video",
        status: "pending",
        provider: provider.name,
        source_upload_id: input.sourceUploadId ?? null,
        batch_id: batchId,
        params: {
          sourceUrl: input.sourceUrl ?? null,
          sourceIsStoryboard: input.sourceIsStoryboard ?? false,
          prompt: input.prompt,
          sceneContext: input.sceneContext ?? null,
          durationSeconds: input.durationSeconds,
          resolution: input.resolution ?? null,
          ratio: input.ratio ?? null,
          referenceAssetIds: input.referenceAssetIds ?? [],
          quantity,
        },
      })
      .select("id")
      .single();
    if (error || !row) {
      throw new Error(error?.message ?? "Failed to start generation");
    }

    // start() returns as soon as the run is registered, not when it
    // finishes — see generations.ts:generateShotVideo for the same pattern.
    const run = await start(generateVideoWorkflow, [
      row.id,
      projectId,
      {
        prompt: input.prompt,
        style: project.style,
        sceneContext: input.sceneContext,
        sourceImageUrl: input.sourceUrl,
        sourceIsStoryboard: input.sourceIsStoryboard,
        referenceImageUrls,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution as GenerateVideoInput["resolution"] | undefined,
        ratio: input.ratio as GenerateVideoInput["ratio"] | undefined,
      } satisfies GenerateVideoInput,
      project.userId,
      creditCost,
    ]);

    await supabase.from("generations").update({ workflow_run_id: run.runId }).eq("id", row.id);
  }
}

/**
 * No revalidatePath: the generations feed is realtime-subscribed (see
 * generation-feed.tsx), and its postgres_changes listener removes the row
 * on the resulting DELETE event — this is what lets deletion reflect in the
 * UI without a page refresh.
 */
export async function deleteGeneration(projectId: string, generationId: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { data: generation, error: fetchError } = await supabase
    .from("generations")
    .select("storage_path")
    .eq("id", generationId)
    .eq("project_id", projectId)
    .single();
  if (fetchError || !generation) {
    throw new Error(fetchError?.message ?? "Generation not found");
  }

  const { error: deleteError } = await supabase.from("generations").delete().eq("id", generationId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (generation.storage_path) {
    await supabase.storage.from("media").remove([generation.storage_path]);
  }
}
