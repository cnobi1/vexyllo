"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extFromContentType } from "@/lib/media/copy-to-storage";
import { loadOwnedProject } from "./project-guard";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Returns the uploaded image's URL directly to the caller rather than
 * relying purely on revalidatePath/realtime, because the immediately
 * following "turn into video" step needs it without waiting on a
 * server-rendered page re-fetch.
 */
export async function uploadImage(projectId: string, formData: FormData): Promise<{ uploadId: string; url: string }> {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image file to upload.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Images must be under 10MB.");
  }

  const uploadId = crypto.randomUUID();
  const path = `${projectId}/uploads/${uploadId}.${extFromContentType(file.type)}`;

  const { error: storageError } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type });
  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: insertError } = await supabase.from("uploads").insert({
    id: uploadId,
    project_id: projectId,
    storage_path: path,
    original_filename: file.name || null,
    content_type: file.type,
    size_bytes: file.size,
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60);
  if (signError || !signed) {
    throw new Error(signError?.message ?? "Failed to sign uploaded image URL");
  }

  revalidatePath(`/projects/${projectId}/images`);

  return { uploadId, url: signed.signedUrl };
}

export async function deleteUpload(projectId: string, uploadId: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, projectId);

  const { data: upload, error: fetchError } = await supabase
    .from("uploads")
    .select("storage_path")
    .eq("id", uploadId)
    .single();
  if (fetchError || !upload) {
    throw new Error(fetchError?.message ?? "Upload not found");
  }

  const { error: deleteError } = await supabase.from("uploads").delete().eq("id", uploadId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await supabase.storage.from("media").remove([upload.storage_path]);

  revalidatePath(`/projects/${projectId}/images`);
}
