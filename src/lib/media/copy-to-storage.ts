import type { SupabaseClient } from "@supabase/supabase-js";

export function extFromContentType(contentType: string): string {
  const subtype = contentType.split("/")[1]?.split(";")[0]?.split("+")[0];
  return subtype && /^[a-z0-9]+$/i.test(subtype) ? subtype : "bin";
}

export interface CopiedMedia {
  /** Bucket-relative path — store this (not the signed URL) for anything that outlives an hour. */
  path: string;
  /** Signed URL, 1h TTL — convenient for immediate display, but regenerate from `path` on later reads. */
  signedUrl: string;
}

/**
 * Downloads a provider-returned media URL (or a mock adapter's data: URI)
 * and re-uploads it into our own private "media" Storage bucket. Provider
 * URLs are not something we control the lifetime of — BytePlus's image
 * links expire within 24h — so nothing may persist a raw provider URL as a
 * generation's terminal output_url. This is the one place that copy
 * happens, shared by the short after()-based image path and the durable
 * video Workflow.
 *
 * Works with either the cookie-based client (in-request) or the
 * service-role client (inside a Workflow step) — both are plain
 * SupabaseClient instances with a .storage accessor.
 */
export async function copyToMediaBucket(
  supabase: SupabaseClient,
  projectId: string,
  category: "generations" | "characters" | "uploads",
  id: string,
  sourceUrl: string,
): Promise<CopiedMedia> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated media (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await response.arrayBuffer();
  const path = `${projectId}/${category}/${id}.${extFromContentType(contentType)}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data: signed, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60);
  if (signError || !signed) throw new Error(signError?.message ?? "Failed to sign media URL");

  return { path, signedUrl: signed.signedUrl };
}
