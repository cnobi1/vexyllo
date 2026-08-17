import { generateImage } from "ai";
import type { GenerateImageInput, GenerateImageResult, ImageProvider } from "./types";

const MODEL = "google/imagen-4.0-fast-generate-001";
// Per-image cost from the AI Gateway /v1/models pricing endpoint, checked 2026-07-25.
// Re-check periodically — the gateway does not return actual cost per call.
const COST_PER_IMAGE = 0.02;

export const gatewayImageAdapter: ImageProvider = {
  name: "gateway:" + MODEL,
  async generateImage({ prompt, style }: GenerateImageInput): Promise<GenerateImageResult> {
    // Reference images and batch quantity are BytePlus-specific capabilities
    // (see image/byteplus-adapter.ts) — the AI Gateway/Imagen path here only
    // ever produces a single image from a text prompt. No leading
    // scene-setting sentence here — see byteplus-adapter.ts's buildFullPrompt
    // for why (it was rendering onto the image as literal text).
    const fullPrompt = [style ? `Visual style: ${style}.` : null, prompt].filter(Boolean).join("\n\n");

    const { image } = await generateImage({
      model: MODEL,
      prompt: fullPrompt,
      aspectRatio: "16:9",
    });

    return {
      images: [{ url: `data:${image.mediaType};base64,${image.base64}`, cost: COST_PER_IMAGE }],
    };
  },
};
