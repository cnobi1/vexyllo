// Video duration ranges are model-specific (BytePlus ModelArk "Create a
// video generation task" docs). Keyed by known model-id fragments (BytePlus
// appends a version/date suffix, e.g. "seedance-1-0-pro-250528", and may also
// prepend a marketing brand, e.g. "dreamina-seedance-2-0-260128") so the UI's
// duration control tracks whatever BYTEPLUS_VIDEO_MODEL is actually
// configured to without a code change when the model changes.
export interface VideoModelLimits {
  minDurationSeconds: number;
  maxDurationSeconds: number;
  /** Whether -1 ("let the model choose") is accepted in place of an explicit duration. */
  supportsAutoDuration: boolean;
}

const VIDEO_MODEL_LIMITS: Record<string, VideoModelLimits> = {
  "seedance-1-0-pro-fast": { minDurationSeconds: 2, maxDurationSeconds: 12, supportsAutoDuration: false },
  "seedance-1-0-pro": { minDurationSeconds: 2, maxDurationSeconds: 12, supportsAutoDuration: false },
  "seedance-1-5-pro": { minDurationSeconds: 4, maxDurationSeconds: 12, supportsAutoDuration: true },
  "seedance-2-0": { minDurationSeconds: 4, maxDurationSeconds: 15, supportsAutoDuration: true },
  "seedance-2-5": { minDurationSeconds: 4, maxDurationSeconds: 30, supportsAutoDuration: true },
};

const DEFAULT_LIMITS: VideoModelLimits = {
  minDurationSeconds: 4,
  maxDurationSeconds: 15,
  supportsAutoDuration: true,
};

export function getVideoModelLimits(modelId: string | undefined): VideoModelLimits {
  if (!modelId) return DEFAULT_LIMITS;
  const match = Object.keys(VIDEO_MODEL_LIMITS)
    .filter((key) => modelId.includes(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? VIDEO_MODEL_LIMITS[match] : DEFAULT_LIMITS;
}
