import { byteplusImageAdapter } from "./byteplus-adapter";
import { gatewayImageAdapter } from "./gateway-adapter";
import { mockImageAdapter } from "./mock-adapter";
import type { ImageProvider } from "./types";

export function getImageProvider(): ImageProvider {
  if (process.env.BYTEPLUS_API_KEY) return byteplusImageAdapter;
  if (process.env.AI_GATEWAY_API_KEY) return gatewayImageAdapter;
  return mockImageAdapter;
}

export type { GenerateImageInput, GeneratedImage, GenerateImageResult, ImageProvider } from "./types";
