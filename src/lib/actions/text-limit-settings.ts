"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./admin-guard";
import { runAction } from "./action-result";

// Fixed key set — text_limits has no insert/delete policy (see the
// add_text_limits_table migration) and no admin UI to add a row, since app
// code references these keys by name; an admin can retune the numbers, not
// invent categories nothing reads.
export async function updateTextLimit(key: string, maxLength: number) {
  return runAction(() => updateTextLimitImpl(key, maxLength));
}

async function updateTextLimitImpl(key: string, maxLength: number) {
  if (!Number.isInteger(maxLength) || maxLength <= 0) {
    throw new Error("Max length must be a positive whole number.");
  }

  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from("text_limits").update({ max_length: maxLength }).eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/text-limits");
}
