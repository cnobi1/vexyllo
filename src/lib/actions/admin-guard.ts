import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

/**
 * Shared "is this user an admin" check, mirroring loadOwnedProject's
 * pattern in project-guard.ts. RLS on `admins`/`showcase_items` is the
 * backstop, not the only check — this runs before every admin page render
 * and every admin server action.
 */
export async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/dashboard");

  return user;
}
