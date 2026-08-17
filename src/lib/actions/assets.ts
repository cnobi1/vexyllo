"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadOwnedProject } from "./project-guard";

export async function createAsset(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "character");
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { error } = await supabase
    .from("assets")
    .insert({ project_id: projectId, type, name, description: description || null });
  if (error) {
    throw new Error(error.message);
  }

  // No redirect: there's no separate asset detail page — the Characters
  // list (and the Scenes Assets tab) both create and edit assets inline, so
  // revalidating in place is enough.
  revalidatePath(`/projects/${projectId}/characters`);
}

export async function updateAsset(projectId: string, assetId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { error } = await supabase
    .from("assets")
    .update({ name, description: description || null })
    .eq("id", assetId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/storyboard`);
}

/**
 * No redirect here — this is called inline from both the Characters list
 * and the Scenes Assets tab, neither of which navigates away on delete
 * (there's no separate asset detail page to navigate away from). A caller
 * that ever needs to navigate away can still do so itself after this resolves.
 */
export async function deleteAsset(projectId: string, assetId: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  // asset_images rows cascade-delete with the asset, but that only removes
  // the DB rows — their files in Storage would otherwise be orphaned, so
  // grab the paths before the cascade wipes the rows that reference them.
  const { data: images } = await supabase.from("asset_images").select("storage_path").eq("asset_id", assetId);

  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) {
    throw new Error(error.message);
  }

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }

  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/storyboard`);
}

export async function updateAssetImageLabel(
  projectId: string,
  assetId: string,
  assetImageId: string,
  formData: FormData,
) {
  const label = String(formData.get("label") ?? "").trim();

  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { data: image, error: imageError } = await supabase
    .from("asset_images")
    .select("id")
    .eq("id", assetImageId)
    .eq("asset_id", assetId)
    .single();
  if (imageError || !image) {
    throw new Error(imageError?.message ?? "Image not found");
  }

  const { error: updateError } = await supabase
    .from("asset_images")
    .update({ label: label || null })
    .eq("id", assetImageId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/projects/${projectId}/characters`);
}

export async function setPrimaryAssetImage(projectId: string, assetId: string, assetImageId: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { data: image, error: imageError } = await supabase
    .from("asset_images")
    .select("id, storage_path")
    .eq("id", assetImageId)
    .eq("asset_id", assetId)
    .single();
  if (imageError || !image) {
    throw new Error(imageError?.message ?? "Image not found");
  }

  // Partial unique index (asset_images_one_primary_per_asset) enforces at
  // most one primary row per asset — clear the old one before setting the
  // new one so the two updates never collide with it mid-transition.
  const { error: clearError } = await supabase
    .from("asset_images")
    .update({ is_primary: false })
    .eq("asset_id", assetId)
    .eq("is_primary", true);
  if (clearError) throw new Error(clearError.message);

  const { error: setError } = await supabase
    .from("asset_images")
    .update({ is_primary: true })
    .eq("id", assetImageId);
  if (setError) throw new Error(setError.message);

  const { data: signed, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(image.storage_path, 60 * 60);
  if (signError || !signed) throw new Error(signError?.message ?? "Failed to sign media URL");

  const { error: assetUpdateError } = await supabase
    .from("assets")
    .update({ reference_image_url: signed.signedUrl })
    .eq("id", assetId);
  if (assetUpdateError) throw new Error(assetUpdateError.message);

  revalidatePath(`/projects/${projectId}/characters`);
}
