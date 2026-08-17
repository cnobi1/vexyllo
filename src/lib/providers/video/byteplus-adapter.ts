import { byteplusJson } from "../byteplus/client";
import type { GenerateVideoInput, VideoProvider, VideoTaskHandle, VideoTaskResult, VideoTaskStatus } from "./types";

const MODEL = process.env.BYTEPLUS_VIDEO_MODEL;
// Seedance 2.0's multimodal reference-image mode caps at 9 references;
// other models only support a single first-frame image. Enforced here
// rather than silently dropping extras or letting BytePlus reject the call.
const MAX_REFERENCE_IMAGES = 9;

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string }; role?: "first_frame" | "reference_image" };

interface CreateTaskResponse {
  id: string;
}

interface RetrieveTaskResponse {
  id: string;
  status: VideoTaskStatus;
  error?: { code: string; message: string } | null;
  content?: { video_url: string };
}

export const byteplusVideoAdapter: VideoProvider = {
  name: "byteplus:" + (MODEL ?? "unconfigured"),
  async startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle> {
    if (!MODEL) {
      throw new Error("BYTEPLUS_VIDEO_MODEL is not configured");
    }
    // BytePlus rejects a request that combines a first-frame image with
    // reference images outright ("first/last frame content cannot be mixed
    // with reference media content") — confirmed via a live failed
    // generation. This contradicts what this adapter used to assume
    // ("Universal Reference Mode" lets them be sent together); a
    // first-frame image, when present, wins and reference images are
    // dropped entirely below — same "first-frame wins" precedent as the
    // ratio param further down, and the first-frame image already carries
    // whatever visual consistency it was itself generated with.
    const useReferenceImages = !input.sourceImageUrl && Boolean(input.referenceImageUrls?.length);
    if (useReferenceImages && input.referenceImageUrls!.length > MAX_REFERENCE_IMAGES) {
      throw new Error(`At most ${MAX_REFERENCE_IMAGES} reference images are supported.`);
    }

    const fullPrompt = [
      // No leading scene-setting sentence here — see image/byteplus-adapter.ts's
      // buildFullPrompt for why (it was rendering onto the output as literal text).
      input.style ? `Visual style: ${input.style}.` : null,
      input.sceneContext ? `Scene context: ${input.sceneContext}` : null,
      // A generated storyboard sheet is a diagrammatic reference, not a
      // photo the model should render as-is — spell out how to treat it,
      // same caveat BytePlus's own Seedance prompt guide calls out for
      // storyboard-grid input.
      input.sourceImageUrl && input.sourceIsStoryboard
        ? "The first-frame image is a multi-panel storyboard sheet, not a real photo. Read its panels in reading order (left to right, top to bottom) as the sequence of beats to animate. Do not render the sheet's own panel borders, numbers, arrows, captions, or line-art framing — render the actual scene naturally."
        : null,
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const content: ContentItem[] = [];
    if (fullPrompt) content.push({ type: "text", text: fullPrompt });
    if (input.sourceImageUrl) {
      content.push({ type: "image_url", image_url: { url: input.sourceImageUrl }, role: "first_frame" });
    } else if (useReferenceImages) {
      for (const url of input.referenceImageUrls!) {
        content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
      }
    }

    const body: Record<string, unknown> = {
      model: MODEL,
      content,
      // The user-facing "how many seconds" control, passed straight
      // through — no clamping here. An out-of-range value surfaces as a
      // normal BytePlus 4xx error rather than being silently coerced.
      duration: input.durationSeconds,
      watermark: false,
    };
    if (input.resolution) body.resolution = input.resolution;
    // BytePlus rejects an explicit ratio whenever a first-frame image is
    // supplied — the output ratio always follows that image's own aspect
    // ratio in first-frame/first-last-frame generation, so sending one is a
    // hard validation error, not just a hint that gets overridden.
    if (input.ratio && !input.sourceImageUrl) body.ratio = input.ratio;

    const result = await byteplusJson<CreateTaskResponse>("/contents/generations/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { providerTaskId: result.id };
  },
  async pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult> {
    const result = await byteplusJson<RetrieveTaskResponse>(`/contents/generations/tasks/${handle.providerTaskId}`, {
      method: "GET",
    });
    return {
      status: result.status,
      url: result.content?.video_url,
      // BytePlus doesn't return a per-task dollar cost in this response
      // (only completion_tokens/total_tokens usage) — left unset rather
      // than guessed, matching the Gateway video adapter's COST_PER_VIDEO caveat.
      cost: null,
      errorMessage: result.error?.message,
    };
  },
};
