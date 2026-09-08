import { byteplusJson } from "../byteplus/client";
import { ratioToImageSize } from "../byteplus/image-sizes";
import type { GeneratedImage, GenerateImageInput, GenerateImageResult, ImageProvider } from "./types";

// Confirmed against a real BytePlus invoice
// (bill_detail_3003786644_20260908_20260901_479063.csv, 2026-09-06/07):
// Seedream 5.0 Pro billed $0.09/image ("Piece" unit) — see credit-costs.ts
// for how this compares against IMAGE_CREDIT_COST.
const COST_PER_IMAGE = 0.09;

interface ImageGenerationResponse {
  data?: { url: string; size?: string }[];
}

function buildFullPrompt(input: GenerateImageInput): string {
  // No leading scene-setting sentence here (e.g. "Storyboard panel for a
  // student film production tool.") — a short declarative sentence at the
  // very start of the prompt reads to the model like a title/caption, and
  // it was rendering that exact text onto the generated image instead of
  // treating it as context.
  return [input.style ? `Visual style: ${input.style}.` : null, input.prompt].filter(Boolean).join("\n\n");
}

/** One BytePlus call — `quantity` images together via sequential_image_generation when useSequentialGeneration, otherwise a single image. */
async function requestImages(
  input: GenerateImageInput,
  quantity: number,
  useSequentialGeneration: boolean,
): Promise<GeneratedImage[]> {
  const body: Record<string, unknown> = {
    model: input.modelId,
    prompt: buildFullPrompt(input),
    watermark: false,
    response_format: "url",
  };
  // Character/location/prop consistency: reference image(s) alongside the
  // prompt (see BytePlus "image" request param — up to 14 references).
  if (input.referenceImageUrls?.length) {
    body.image = input.referenceImageUrls.length === 1 ? input.referenceImageUrls[0] : input.referenceImageUrls;
  }
  const size = input.ratio ? ratioToImageSize(input.ratio) : undefined;
  if (size) {
    body.size = size;
  }
  if (useSequentialGeneration && quantity > 1) {
    body.sequential_image_generation = "auto";
    body.sequential_image_generation_options = { max_images: quantity };
  }

  const result = await byteplusJson<ImageGenerationResponse>("/images/generations", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return (result.data ?? []).map((item) => ({ url: item.url, cost: COST_PER_IMAGE }));
}

function isSequentialGenerationUnsupported(err: unknown): boolean {
  return err instanceof Error && err.message.includes("sequential_image_generation");
}

export const byteplusImageAdapter: ImageProvider = {
  name: "byteplus",
  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    if (!process.env.BYTEPLUS_API_KEY) {
      throw new Error("BYTEPLUS_API_KEY is not configured");
    }

    const quantity = input.quantity ?? 1;
    let images: GeneratedImage[];

    if (quantity > 1) {
      try {
        images = await requestImages(input, quantity, true);
      } catch (err) {
        // Not every model supports the "image set" batch mode — some (e.g.
        // Seedream 5.0 Pro, confirmed live) reject the parameter outright
        // with a 400 ("not supported by the current model") instead of
        // silently ignoring it. Fall back to N independent single-image
        // requests so "how many at a go" still works there; any other
        // failure (rate limit, bad prompt, etc.) still propagates normally.
        if (!isSequentialGenerationUnsupported(err)) throw err;
        const settled = await Promise.allSettled(
          Array.from({ length: quantity }, () => requestImages(input, 1, false)),
        );
        // A batch call can legitimately return fewer images than requested
        // (per-image failures) — callers reconcile that against however
        // many ledger rows they pre-created, same contract as a native
        // sequential_image_generation response.
        images = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      }
    } else {
      images = await requestImages(input, 1, false);
    }

    if (images.length === 0) {
      throw new Error("BytePlus returned no images");
    }
    return { images };
  },
};
