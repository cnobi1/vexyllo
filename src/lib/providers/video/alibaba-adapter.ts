import { alibabaJson } from "../alibaba/client";
import type { GenerateVideoInput, VideoProvider, VideoTaskHandle, VideoTaskResult } from "./types";

// Alibaba Cloud Model Studio (DashScope) — backs the Wan 3.0 models
// ("wan3.0-video" / "wan3.0-video-prime", see generation_models). Both the
// create-task call and the /tasks/{id} poll endpoint have now been
// confirmed against a live run (2026-09-07): create-task succeeds, polling
// reaches a real terminal status, and a real DashScope error message came
// back and round-tripped correctly into the UI. The one bug that live run
// found (media type "file" used for images, rejected as a document-only
// type) is fixed below — see the MediaItem comment.
interface CreateTaskResponse {
  output: { task_id: string; task_status: string };
  request_id: string;
}

interface QueryTaskResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "UNKNOWN";
    video_url?: string;
    code?: string;
    message?: string;
  };
}

// "file" is real but means document uploads (docx/pdf/txt/...) — confirmed
// live (a jpeg sent as type "file" was rejected: "unsupported file format:
// jpeg; allowed: docx, doc, xlsx, xls, pptx, ppt, pdf, txt, key, pages,
// numbers, md"). Images use "first_frame"/"reference_image" instead.
type MediaItem = { type: "first_frame" | "reference_image"; url: string };

export const alibabaVideoAdapter: VideoProvider = {
  name: "alibaba",
  async startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle> {
    if (!process.env.ALIBABA_API_KEY) {
      throw new Error("ALIBABA_API_KEY is not configured");
    }

    // Wan's "media" field is its equivalent of BytePlus's first-frame/
    // reference-image content items — a source image wins over reference
    // images when both are present, same "first-frame wins" precedent as
    // video/byteplus-adapter.ts. sourceImageUrl maps to "first_frame" (it
    // drives the whole shot, same role BytePlus gives it); referenceImageUrls
    // map to "reference_image" (style/character references, not a start frame).
    let media: MediaItem[] | undefined;
    if (input.sourceImageUrl) {
      media = [{ type: "first_frame", url: input.sourceImageUrl }];
    } else if (input.referenceImageUrls?.length) {
      media = input.referenceImageUrls.map((url) => ({ type: "reference_image", url }));
    }

    const fullPrompt = [
      input.style ? `Visual style: ${input.style}.` : null,
      input.sceneContext ? `Scene context: ${input.sceneContext}` : null,
      input.sourceImageUrl && input.sourceIsStoryboard
        ? "The attached image is a multi-panel storyboard sheet, not a real photo. Read its panels in reading order (left to right, top to bottom) as the sequence of beats to animate. Do not render the sheet's own panel borders, numbers, arrows, captions, or line-art framing — render the actual scene naturally."
        : null,
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const parameters: Record<string, unknown> = { duration: input.durationSeconds };
    if (input.resolution) parameters.resolution = input.resolution.toUpperCase();
    if (input.ratio) parameters.ratio = input.ratio;

    const result = await alibabaJson<CreateTaskResponse>("/services/aigc/video-generation/video-synthesis", {
      method: "POST",
      headers: { "X-DashScope-Async": "enable" },
      body: JSON.stringify({
        model: input.modelId,
        input: { prompt: fullPrompt, ...(media ? { media } : {}) },
        parameters,
      }),
    });

    return { providerTaskId: result.output.task_id };
  },
  async pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult> {
    const result = await alibabaJson<QueryTaskResponse>(`/tasks/${handle.providerTaskId}`, { method: "GET" });
    const { task_status, video_url, message } = result.output;

    if (task_status === "SUCCEEDED") {
      return { status: "succeeded", url: video_url, cost: null };
    }
    if (task_status === "FAILED") {
      return { status: "failed", errorMessage: message ?? "Wan video generation failed" };
    }
    if (task_status === "CANCELED") {
      // Nothing in this codebase ever cancels a task, so this only ever
      // shows up when Alibaba cancels it on their end (workspace/quota
      // change, model access revoked mid-run, etc.) — treating it as
      // "still running" left it retrying for up to 45 minutes before
      // dying with an opaque "Step exceeded maximum queue deliveries"
      // instead of surfacing the real, immediate terminal state.
      return {
        status: "failed",
        errorMessage:
          (message ? `${message} — ` : "") +
          `Alibaba canceled this video task on their end (task_status: CANCELED, task_id: ${handle.providerTaskId}). This wasn't triggered by this app — check the Alibaba Cloud Model Studio / DashScope console for workspace quota or model-access changes.`,
      };
    }
    if (task_status === "UNKNOWN") {
      // Seen in practice paired with the exact "Access to model denied"
      // workspace-permission error that got Wan 3.0 deactivated once
      // already (20260908020000_deactivate_wan_pending_alibaba_access.sql)
      // — the task never actually started on Alibaba's side, so it will
      // never transition to a real terminal status no matter how long we
      // poll. Failing fast here instead of retrying for 45 minutes turns
      // that into an immediate, actionable error instead of a generic
      // queue-delivery timeout.
      return {
        status: "failed",
        errorMessage:
          (message ? `${message} — ` : "") +
          `Alibaba returned an unrecognized task status (UNKNOWN, task_id: ${handle.providerTaskId}) — this task never actually started running, most likely a workspace/model access issue on Alibaba's side rather than a transient delay. Check the Alibaba Cloud Model Studio console for this workspace's Wan 3.0 access before retrying.`,
      };
    }
    // PENDING/RUNNING are the only genuinely still-in-progress statuses —
    // everything else above is now a fast, specific failure instead of an
    // indefinite retry.
    return { status: "running" };
  },
};
