import { byteplusImageAdapter } from "./byteplus-adapter";
import { gatewayImageAdapter } from "./gateway-adapter";
import { mockImageAdapter } from "./mock-adapter";
import type { ImageProvider } from "./types";

// Shares its provider-key union with GenerateVideoInput/generation_models
// (rather than a narrower image-only type) so callers can pass a
// GenerationModel's providerKey straight through without casting — the
// catalog's own check constraint plus the "alibaba" branch below (a
// defensive runtime error, not just a type-level guarantee) are what
// actually keep an image row from ever pointing at Wan, since Wan is
// video-only.
export type ImageProviderKey = "byteplus" | "gateway" | "alibaba" | "mock";

// Per-generation model choice (see generation_models table) replaced the old
// env-var-priority "first configured key wins" lookup — see video/index.ts
// for the fuller reasoning.
export function getImageProvider(providerKey: ImageProviderKey): ImageProvider {
  switch (providerKey) {
    case "byteplus":
      return byteplusImageAdapter;
    case "gateway":
      return gatewayImageAdapter;
    case "mock":
      return mockImageAdapter;
    case "alibaba":
      throw new Error("Alibaba does not have an image generation adapter — this model is misconfigured.");
  }
}

export type { GenerateImageInput, GeneratedImage, GenerateImageResult, ImageProvider } from "./types";
