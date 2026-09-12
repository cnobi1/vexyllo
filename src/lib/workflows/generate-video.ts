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
    return await getVideoProvider(input.providerKey).startVideoTask(input);
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

// Every "use step" invocation is a message on Vercel's own Queue Service
// (VQS) underneath Workflow's runtime — that queue tracks its own
// server-side delivery count entirely separately from this app's logical
// maxRetries, and that count has a real, non-negotiable ceiling. A real
// generation (Wan 3.0, scene 18, 2026-09-12) died with "Step exceeded
// maximum queue deliveries (79/48)" while this step was still using the
// old maxRetries=100 budget below. Confirmed by reading
// node_modules/@vercel/queue's source directly: the only redelivery-limit
// constant there (DEV_REDELIVERY_MAX_ATTEMPTS=10) is local-dev-only: no
// env var, SDK option, or other app-level knob raises the real production
// ceiling. So the fix isn't waiting less — it's needing far fewer total
// deliveries for roughly the same wait budget, via a shorter maxRetries
// and a longer steady-state poll interval, kept well clear of the ~48
// ceiling observed in that failure.
const POLL_MAX_RETRIES = 40;

async function pollVideoTask(
  handle: VideoTaskHandle,
  providerKey: GenerateVideoInput["providerKey"],
): Promise<VideoTaskResult> {
  "use step";
  const result = await getVideoProvider(providerKey).pollVideoTask(handle);
  if (result.status === "queued" || result.status === "running") {
    const { attempt } = getStepMetadata();
    // Give up on our own terms, with a clear and actionable message, one
    // attempt before Workflow's own maxRetries exhaustion would otherwise
    // surface this same "Video still queued/running" RetryableError text
    // as the terminal failure — which reads like a bug report, not
    // something a customer can act on.
    if (attempt >= POLL_MAX_RETRIES) {
      throw new FatalError(
        "Video generation is taking longer than expected and was stopped after roughly 30 minutes of waiting. The provider may still be processing it behind the scenes, but this app gave up polling — please try generating again.",
      );
    }
    // Escalating backoff: fast at first (short clips resolve in a couple of
    // polls), then straight to a longer steady interval for jobs that are
    // genuinely still running. Fewer, longer-spaced polls than before
    // (was 5s/15s/30s over 100 attempts, ~45min) cover a comparable
    // ~28-minute wait (6 polls @5s + 10 @20s + 24 @60s) in 40 total
    // deliveries instead of 100 — see POLL_MAX_RETRIES comment above for why
    // total delivery count, not wait time, is the thing being budgeted here.
    // Throwing here causes Workflow's runtime to reschedule *this step*
    // itself per retryAfter — no custom sleep loop, and it survives a
    // server restart mid-poll (unlike an in-memory wait loop would).
    const retryAfter = attempt < 6 ? "5s" : attempt < 16 ? "20s" : "60s";
    throw new RetryableError(`Video still ${result.status}`, { retryAfter });
  }
  if (result.status === "failed" || result.status === "expired" || result.status === "cancelled") {
    throw new FatalError(result.errorMessage ?? `Video generation ${result.status}`);
  }
  return result;
}
pollVideoTask.maxRetries = POLL_MAX_RETRIES;

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
    const result = await pollVideoTask(handle, input.providerKey);
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
