import { FatalError, RetryableError, getStepMetadata } from "workflow";
import { NoVideoGeneratedError } from "ai";
import { createServiceClient } from "@/lib/supabase/service";
import { copyToMediaBucket } from "@/lib/media/copy-to-storage";
import { getVideoProvider } from "@/lib/providers/video";
import { recordSpend } from "@/lib/billing/spend-credits";
import { isTransientProviderError } from "@/lib/providers/retry";
import type { GenerateVideoInput, VideoTaskHandle, VideoTaskResult } from "@/lib/providers/video";

// A step that exhausts its retry budget propagates its failure back to the
// "use workflow" function across a durability boundary (the run's event log
// gets replayed to reconstruct state) — confirmed via `workflow inspect
// steps -d`, that reconstruction doesn't reliably preserve `instanceof
// Error` for the wrapper Workflow itself throws (only FatalError/
// RetryableError/HookConflictError get the cross-realm identity fix-up),
// so `err instanceof Error` silently failing here was replacing the real
// BytePlus error text with the generic "Generation failed" fallback on
// every single video failure. Falling back to reading `.message` off
// whatever shape `err` actually is recovers the real message either way.
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Generation failed";
}

async function startVideoTask(input: GenerateVideoInput): Promise<VideoTaskHandle> {
  "use step";
  try {
    return await getVideoProvider().startVideoTask(input);
  } catch (err) {
    if (err instanceof NoVideoGeneratedError) {
      // The model declined to produce a video for this input — retrying
      // the same request against the same model won't change the outcome.
      throw new FatalError(err.message);
    }
    // Only genuinely transient-looking failures (network blips, timeouts,
    // 5xx) get Workflow's automatic step retry. Everything else — a bad
    // parameter, a content-policy rejection ("may contain real person"),
    // an auth failure — is deterministic: retrying the identical request
    // fails identically every time, so treating it as retryable (the old
    // behavior here) just burns the retry budget and delays the real
    // error reaching the customer by three attempts' worth of latency.
    if (isTransientProviderError(err)) {
      // Known cost risk, not fixed here: BytePlus's create-task call has no
      // idempotency key, so if the create actually succeeded on BytePlus's
      // side but the response was lost to the same transient failure that
      // triggers this retry, Workflow's re-invocation of this step issues a
      // second real create-task call — a real duplicate charge for one
      // credit-charged generation. Fixing this needs an idempotency key on
      // the BytePlus call (check their API docs for support) before relying
      // on retry counts alone.
      throw new RetryableError(err instanceof Error ? err.message : "Failed to start video task");
    }
    throw new FatalError(err instanceof Error ? err.message : "Failed to start video task");
  }
}

async function pollVideoTask(handle: VideoTaskHandle): Promise<VideoTaskResult> {
  "use step";
  const result = await getVideoProvider().pollVideoTask(handle);
  if (result.status === "queued" || result.status === "running") {
    // Escalating backoff: fast at first (short clips resolve in a couple of
    // polls), slowing down for long-running jobs so we don't hammer the
    // API. Throwing here causes Workflow's runtime to reschedule *this
    // step* itself per retryAfter — no custom sleep loop, and it survives
    // a server restart mid-poll (unlike an in-memory wait loop would).
    const { attempt } = getStepMetadata();
    const retryAfter = attempt < 6 ? "5s" : attempt < 26 ? "15s" : "30s";
    throw new RetryableError(`Video still ${result.status}`, { retryAfter });
  }
  if (result.status === "failed" || result.status === "expired" || result.status === "cancelled") {
    throw new FatalError(result.errorMessage ?? `Video generation ${result.status}`);
  }
  return result;
}
// Every "use step" function defaults to 3 retries (4 attempts total) unless
// overridden — fine for a one-shot call, but this step is a poll loop by
// design and is expected to be re-invoked dozens of times over a video
// generation that can take several minutes. Left at the default, real
// generations were being marked "failed" with "Video still running" after
// ~25s even though BytePlus was still actively working on them. 100 retries
// against the escalating backoff above works out to roughly 45 minutes of
// polling headroom before genuinely giving up.
pollVideoTask.maxRetries = 100;

type Outcome = { status: "succeeded"; url: string; cost: number | null } | { status: "failed"; error: string };

async function persistOutcome(
  generationId: string,
  projectId: string,
  shotId: string | undefined,
  userId: string,
  creditCost: number,
  outcome: Outcome,
) {
  "use step";
  // Service-role client, not the cookie-based one: this step runs via
  // Workflow's internal callback, outside the original user request, and
  // has no session cookie to read. See src/lib/supabase/service.ts.
  const supabase = createServiceClient();
  if (outcome.status === "succeeded") {
    // BytePlus (and any other provider) URLs are not ours to keep alive —
    // copy into our own bucket before recording success. See
    // src/lib/media/copy-to-storage.ts.
    const copied = await copyToMediaBucket(supabase, projectId, "generations", generationId, outcome.url);
    await supabase
      .from("generations")
      .update({ status: "succeeded", output_url: copied.signedUrl, storage_path: copied.path, cost: outcome.cost })
      .eq("id", generationId);
    if (shotId) {
      await supabase.from("shots").update({ status: "ready" }).eq("id", shotId);
    }
    // Only charged on a confirmed success — the caller (generateShotVideo /
    // generateVideoFromImage) never spends up front, so a failed attempt
    // below simply never gets billed, no refund needed.
    await recordSpend(userId, creditCost, "generation_video", generationId);
  } else {
    await supabase.from("generations").update({ status: "failed", error: outcome.error }).eq("id", generationId);
    if (shotId) {
      await supabase.from("shots").update({ status: "failed" }).eq("id", shotId);
    }
  }
}

/**
 * Durable video generation: works for shot-attached video (shotId set,
 * mirrors the pre-phase5 per-shot flow exactly) and for project-scoped
 * video (freeform image-to-video, upload-to-video — shotId omitted).
 */
export async function generateVideoWorkflow(
  generationId: string,
  projectId: string,
  input: GenerateVideoInput,
  userId: string,
  creditCost: number,
  shotId?: string,
) {
  "use workflow";
  try {
    const handle = await startVideoTask(input);
    const result = await pollVideoTask(handle);
    if (result.status !== "succeeded" || !result.url) {
      throw new Error("Video task resolved without a URL");
    }
    await persistOutcome(generationId, projectId, shotId, userId, creditCost, {
      status: "succeeded",
      url: result.url,
      cost: result.cost ?? null,
    });
  } catch (err) {
    await persistOutcome(generationId, projectId, shotId, userId, creditCost, {
      status: "failed",
      error: extractErrorMessage(err),
    });
  }
}
