// BytePlus (and other providers) sometimes have to download our own
// reference images back from Supabase Storage as part of a generation
// request — a transient blip on either side ("Timeout while downloading
// url=...") fails the whole call even though nothing about the request
// itself was wrong. The video pipeline already gets this kind of retry for
// free via Workflow DevKit's RetryableError; image generation runs in a
// plain after() with no retry budget at all, so it needs its own.
const TRANSIENT_ERROR_PATTERN =
  /timeout|timed out|econnreset|etimedout|fetch failed|network error|socket hang up|\(5\d\d\)/i;

export function isTransientProviderError(err: unknown): boolean {
  return err instanceof Error && TRANSIENT_ERROR_PATTERN.test(err.message);
}

/**
 * Retries `fn` when it fails with what looks like a transient/network
 * error, leaving anything else (bad prompt, invalid parameter, auth
 * failure) to fail immediately — retrying those would just waste the
 * provider call and delay the real error. Runs entirely inside the
 * caller's own background execution (after() / a workflow step), so a
 * short fixed delay between attempts is fine — nothing is blocking a
 * request/response cycle on this.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isTransientProviderError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}
