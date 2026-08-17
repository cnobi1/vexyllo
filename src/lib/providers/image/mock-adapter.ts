import { buildPlaceholderSvg } from "../placeholder-svg";
import type { GenerateImageInput, GenerateImageResult, ImageProvider } from "./types";

export const mockImageAdapter: ImageProvider = {
  name: "mock",
  async generateImage({ prompt, style, quantity = 1 }: GenerateImageInput): Promise<GenerateImageResult> {
    // Simulated latency so the pending -> succeeded ledger transition is visibly exercised.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const images = Array.from({ length: quantity }, (_, i) => {
      const svg = buildPlaceholderSvg(prompt, style, quantity > 1 ? `MOCK IMAGE ${i + 1}/${quantity}` : "MOCK IMAGE");
      const base64 = Buffer.from(svg).toString("base64");
      return { url: `data:image/svg+xml;base64,${base64}`, cost: 0 };
    });
    return { images };
  },
};
