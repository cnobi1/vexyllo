import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Resolves each requested asset to its primary (or most recent, as a
 * fallback) `asset_images.storage_path` — the permanent record — rather
 * than trusting `assets.reference_image_url`, which is a signed URL cached
 * at generation time with a 1h TTL and never refreshed. That column going
 * stale is the same class of bug already fixed for `generations.output_url`
 * via `storage_path`; this is the shared lookup both resolvers below build on.
 */
async function resolveAssetImagePaths(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
  /** assetId -> a specific asset_images.id to prefer over primary/latest, for outfit-variant selection. */
  imageOverridesByAsset?: Record<string, string>,
): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();

  // Ownership/scoping check: only resolve ids that actually belong to this project.
  const { data: ownedAssets, error: assetsError } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .in("id", assetIds);
  if (assetsError) throw new Error(assetsError.message);
  const ownedIds = (ownedAssets ?? []).map((asset) => asset.id);
  if (ownedIds.length === 0) return new Map();

  const { data: images, error: imagesError } = await supabase
    .from("asset_images")
    .select("id, asset_id, storage_path, is_primary, created_at")
    .in("asset_id", ownedIds)
    .order("created_at", { ascending: false });
  if (imagesError) throw new Error(imagesError.message);

  // Prefer each asset's flagged primary image; fall back to its most
  // recent one if a primary was never set.
  const latestByAsset = new Map<string, string>();
  const primaryByAsset = new Map<string, string>();
  for (const image of images ?? []) {
    if (!latestByAsset.has(image.asset_id)) latestByAsset.set(image.asset_id, image.storage_path);
    if (image.is_primary) primaryByAsset.set(image.asset_id, image.storage_path);
  }

  const pathByAsset = new Map<string, string>();
  for (const id of ownedIds) {
    const overrideImageId = imageOverridesByAsset?.[id];
    // Re-verify asset_id against the already ownership-checked `images`
    // result — the override id is untrusted input from a server action
    // argument, not something we've scoped to this project/asset ourselves.
    const overrideImage = overrideImageId
      ? (images ?? []).find((image) => image.id === overrideImageId && image.asset_id === id)
      : undefined;
    const path = overrideImage?.storage_path ?? primaryByAsset.get(id) ?? latestByAsset.get(id);
    if (path) pathByAsset.set(id, path);
  }
  return pathByAsset;
}

/** For a generation request: a flat list of fresh reference-image URLs. */
export async function resolveAssetReferenceUrls(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
  imageOverridesByAsset?: Record<string, string>,
): Promise<string[] | undefined> {
  const pathByAsset = await resolveAssetImagePaths(supabase, projectId, assetIds, imageOverridesByAsset);
  if (pathByAsset.size === 0) return undefined;

  const signed = await Promise.all(
    [...pathByAsset.values()].map((path) => supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL_SECONDS)),
  );
  const urls = signed.map((result) => result.data?.signedUrl).filter((url): url is string => Boolean(url));
  return urls.length > 0 ? urls : undefined;
}

/** For the reference picker: every asset_image (with label) per asset, freshly signed, for outfit-variant selection UI. */
export async function resolveAssetImageVariants(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
): Promise<Record<string, { id: string; label: string | null; url: string | null; isPrimary: boolean }[]>> {
  if (assetIds.length === 0) return {};

  const { data: ownedAssets, error: assetsError } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .in("id", assetIds);
  if (assetsError) throw new Error(assetsError.message);
  const ownedIds = (ownedAssets ?? []).map((asset) => asset.id);
  if (ownedIds.length === 0) return {};

  const { data: images, error: imagesError } = await supabase
    .from("asset_images")
    .select("id, asset_id, storage_path, is_primary, label, created_at")
    .in("asset_id", ownedIds)
    .order("created_at", { ascending: false });
  if (imagesError) throw new Error(imagesError.message);

  const variantsByAsset: Record<string, { id: string; label: string | null; url: string | null; isPrimary: boolean }[]> = {};
  for (const image of images ?? []) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(image.storage_path, SIGNED_URL_TTL_SECONDS);
    (variantsByAsset[image.asset_id] ??= []).push({
      id: image.id,
      label: image.label,
      url: signed?.signedUrl ?? null,
      isPrimary: image.is_primary,
    });
  }
  return variantsByAsset;
}

/** For display: a fresh URL per asset id, keyed for lookup (e.g. thumbnails, picker options). */
export async function resolveAssetImageUrlMap(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
): Promise<Record<string, string>> {
  const pathByAsset = await resolveAssetImagePaths(supabase, projectId, assetIds);
  const entries = await Promise.all(
    [...pathByAsset.entries()].map(async ([assetId, path]) => {
      const { data } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ? ([assetId, data.signedUrl] as const) : null;
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
}
