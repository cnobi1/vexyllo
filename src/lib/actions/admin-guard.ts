import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

export type AdminRole = "admin" | "super_admin";

export interface AdminSession extends User {
  adminRole: AdminRole;
}

/**
 * Shared "is this user an admin, and what role" check, mirroring
 * loadOwnedProject's pattern in project-guard.ts. RLS on `admins`/
 * `showcase_items`/`generation_models` is the backstop, not the only check —
 * this runs before every admin page render and every admin server action.
 *
 * Return type widens User -> AdminSession (a superset) so every existing
 * caller reading only `.email`/`.id` keeps compiling unchanged.
 */
export async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminSession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/dashboard");

  return { ...user, adminRole: admin.role as AdminRole };
}

/** Gate for Super Admin-only capabilities (managing other admins). */
export async function requireSuperAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminSession> {
  const session = await requireAdmin(supabase);
  if (session.adminRole !== "super_admin") redirect("/admin");
  return session;
}
