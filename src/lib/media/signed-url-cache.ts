import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Memoizes Storage signed URLs so repeat reads of the same object within the
 * cache window get back the *exact same URL string* instead of a fresh
 * signed token every time. This matters because a signed URL's query string
 * is part of its cache key from the browser's (and Supabase's CDN's) point
 * of view: minting a new token on every page load/render made every repeat
 * view of the same file a full cache-miss re-download, even though the
 * underlying object never changed. That's what actually blew out this
 * project's egress quota (~24GB served against ~90MB of stored data, on
 * only 5 MAU) — see the investigation that led here.
 *
 * Module-scoped state, not request-scoped: on Vercel Fluid Compute a warm
 * function instance is reused across requests (not one-instance-per-request
 * the way classic serverless worked), so this Map persists across many page
 * loads/navigations, not just within a single render. In the browser it's
 * scoped to the current page session (a full reload resets it, same as any
 * module-level state).
 */

const MAX_ENTRIES = 2000;

// A cached entry is served up until this much of its real TTL remains, so a
// cache hit can never be handed to a caller close enough to its own expiry
// to risk expiring mid-flight (e.g. a slow client download, or an AI
// provider fetching a reference image on the other end).
const SAFETY_MARGIN_MS = 5 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

/**
 * Same contract as `supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds)`
 * (returns just the URL, or null on failure) but serves a cached URL instead
 * of minting a new token when one is already on file and not close to
 * expiring.
 */
export async function getCachedSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  ttlSeconds: number,
): Promise<string | null> {
  const key = cacheKey(bucket, path);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  if (error || !data) return null;

  const ttlMs = ttlSeconds * 1000;
  const expiresAt = now + Math.max(ttlMs - SAFETY_MARGIN_MS, ttlMs / 2);
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { url: data.signedUrl, expiresAt });
  return data.signedUrl;
}

/**
 * Drops a cached URL immediately. Call this anywhere an object at `path` is
 * deleted or replaced (upsert), so a stale — and for a delete, now-invalid —
 * URL can never be served from cache again.
 */
export function invalidateSignedUrl(bucket: string, path: string): void {
  cache.delete(cacheKey(bucket, path));
}
