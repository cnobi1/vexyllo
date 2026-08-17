"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./admin-guard";

export type PendingShowcaseItem = {
  id: string;
  kind: "image" | "video";
  storagePath: string;
  prompt: string | null;
};

/**
 * The files themselves never reach this action — showcase-form.tsx uploads
 * each one directly from the browser to the "showcase" Storage bucket
 * (client-side, via the same admin session RLS already gates writes with),
 * then calls this with just the resulting metadata. Routing video files
 * through a Server Action instead used to hit the Next.js server-action
 * body-size limit on multi-file batches — the request gets truncated
 * mid-upload, which the multipart parser reports as "Unexpected end of
 * form" rather than a clear size-limit error. Storage's own bucket-level
 * file_size_limit/allowed_mime_types (see the showcase_bucket_limits
 * migration) is the enforcement point now, not app code.
 */
export async function saveShowcaseItems(items: PendingShowcaseItem[]) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  if (items.length === 0) {
    throw new Error("No uploaded items to save.");
  }

  const { error } = await supabase.from("showcase_items").insert(
    items.map((item) => ({
      id: item.id,
      kind: item.kind,
      storage_path: item.storagePath,
      prompt: item.prompt,
    })),
  );
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteShowcaseItem(id: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data: item, error: fetchError } = await supabase
    .from("showcase_items")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchError || !item) {
    throw new Error(fetchError?.message ?? "Showcase item not found");
  }

  const { error: deleteError } = await supabase.from("showcase_items").delete().eq("id", id);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await supabase.storage.from("showcase").remove([item.storage_path]);

  revalidatePath("/admin");
  revalidatePath("/");
}
