import { experimental_generateVideo } from "ai";
import type { GenerateVideoInput, VideoProvider, VideoTaskHandle, VideoTaskResult } from "./types";

const MODEL = "google/veo-3.1-generate-001";
// Cost is intentionally left unconfirmed (null) rather than guessed: unlike
// the image adapter's COST_PER_IMAGE (checked against the AI Gateway's
// /v1/models pricing endpoint), this model's per-clip pricing has not been
// verified against a live endpoint. Confirm and set a real figure before
// relying on this for cost accounting — do not assume it's free.
const COST_PER_VIDEO: number | null = null;

export const gatewayVideoAdapter: VideoProvider = {
  name: "gateway:" + MODEL,
  async startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle> {
    // The AI SDK's experimental_generateVideo call is blocking — there's no
    // real "task" to poll, so the work happens here and the result is
    // stashed on the handle for pollVideoTask to return immediately.
    // sourceImageUrl/referenceImageUrls are BytePlus-specific capabilities
    // (see video/byteplus-adapter.ts) and are not honored by this adapter.
    // No leading scene-setting sentence here — see
    // image/byteplus-adapter.ts's buildFullPrompt for why (it was rendering
    // onto the output as literal text).
    const fullPrompt = [
      input.style ? `Visual style: ${input.style}.` : null,
      input.sceneContext ? `Scene context: ${input.sceneContext}` : null,
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { video } = await experimental_generateVideo({
      model: MODEL,
      prompt: fullPrompt,
      aspectRatio: input.ratio && input.ratio !== "adaptive" ? input.ratio : "16:9",
      duration: input.durationSeconds,
    });

    return {
      providerTaskId: `gateway-${crypto.randomUUID()}`,
      meta: { url: `data:${video.mediaType};base64,${video.base64}`, cost: COST_PER_VIDEO },
    };
  },
  async pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult> {
    const meta = handle.meta ?? {};
    return { status: "succeeded", url: meta.url as string, cost: meta.cost as number | null };
  },
};
