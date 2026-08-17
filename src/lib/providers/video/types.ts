export interface GenerateVideoInput {
  /** Optional when the video is driven purely by a source/reference image. */
  prompt: string | null;
  style: string | null;
  /** Freeform scene-level context — e.g. the Generate Scenes breakdown's scene summary plus any per-character wardrobe notes — merged into the generation prompt by adapters that only accept a single text field (see byteplus-adapter.ts/gateway-adapter.ts's fullPrompt join), the same way `style` already is. */
  sceneContext?: string;
  /** Image-to-video: used as the video's first frame. */
  sourceImageUrl?: string;
  /** True when sourceImageUrl is a generated multi-panel storyboard sheet (not a plain photo) — adapters that support it should instruct the model to read the panels in order and ignore the sheet's own borders/numbers/line art rather than rendering them. */
  sourceIsStoryboard?: boolean;
  /** Character-consistency multi-reference images (provider-dependent support). */
  referenceImageUrls?: string[];
  /** The user-facing "how many seconds" control. No hidden default — every caller must decide. */
  durationSeconds: number;
  resolution?: "480p" | "720p" | "1080p" | "4k";
  ratio?: "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9" | "adaptive";
}

export type VideoTaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";

export interface VideoTaskHandle {
  providerTaskId: string;
  /**
   * Provider-specific, JSON-serializable state carried alongside the task
   * id (this travels across a Workflow step boundary, so it must stay
   * plain data). Providers whose "task" is already complete by the time
   * start() returns (gateway/mock) stash the resolved result here so
   * pollVideoTask has no external state to look up; BytePlus's real
   * create+poll flow ignores this and hits the API by providerTaskId.
   */
  meta?: Record<string, unknown>;
}

export interface VideoTaskResult {
  status: VideoTaskStatus;
  /** Present only when status === "succeeded". */
  url?: string;
  cost?: number | null;
  /** Present only when status is "failed" or "expired". */
  errorMessage?: string;
}

export interface VideoProvider {
  name: string;
  /**
   * Registers a video generation request and returns immediately. For
   * providers with a genuinely async task API (BytePlus) this is a fast
   * "create task" call; for providers with a blocking generation call
   * (AI Gateway/Veo, and the mock) this does the full work up front and
   * returns a handle whose pollVideoTask resolves instantly.
   */
  startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle>;
  /** Checks (or, for already-resolved handles, returns) the task's current state. */
  pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult>;
}
