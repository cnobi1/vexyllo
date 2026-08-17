import { buildPlaceholderSvg } from "../placeholder-svg";
import type { GenerateVideoInput, VideoProvider, VideoTaskHandle, VideoTaskResult } from "./types";

// Video generation is meaningfully slower than image generation in
// practice, and real providers are asynchronous (create task, then poll).
// The mock models both: startVideoTask returns instantly with a handle
// carrying a "ready at" timestamp, so pollVideoTask reports "running" for
// a bit before "succeeded" — exercising the same retry/backoff path a real
// provider would need, without any real waiting logic in the workflow.
const SIMULATED_DURATION_MS = 2800;

export const mockVideoAdapter: VideoProvider = {
  name: "mock",
  async startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle> {
    return {
      providerTaskId: `mock-${crypto.randomUUID()}`,
      meta: {
        readyAtMs: Date.now() + SIMULATED_DURATION_MS,
        prompt: input.prompt,
        style: input.style,
      },
    };
  },
  async pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult> {
    const meta = handle.meta ?? {};
    if (Date.now() < (meta.readyAtMs as number)) {
      return { status: "running" };
    }
    const svg = buildPlaceholderSvg(
      (meta.prompt as string | null) ?? "(image-to-video, no text prompt)",
      (meta.style as string | null) ?? null,
      "MOCK VIDEO",
    );
    const base64 = Buffer.from(svg).toString("base64");
    return { status: "succeeded", url: `data:image/svg+xml;base64,${base64}`, cost: 0 };
  },
};
