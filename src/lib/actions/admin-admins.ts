"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, type AdminRole } from "./admin-guard";
import { runAction } from "./action-result";

export interface AdminListRow {
  userId: string;
  email: string | null;
  role: AdminRole;
  createdAt: string;
}

/**
 * Role management stays behind security-definer RPCs (admin_add_admin_by_email
 * etc., see the admin_roles migration) rather than direct table writes —
 * `admins` has no self-service RLS write policy, same "migration/
 * service-role-only" posture it already had before roles existed.
 */
export async function listAdmins(): Promise<AdminListRow[]> {
  const supabase = await createClient();
  await requireSuperAdmin(supabase);

  const { data, error } = await supabase.rpc("admin_list_admins");
  if (error) throw new Error(error.message);

  type Row = { user_id: string; email: string | null; role: AdminRole; created_at: string };
  return ((data ?? []) as Row[]).map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
}

export async function addAdmin(email: string, role: AdminRole) {
  return runAction(() => addAdminImpl(email, role));
}

async function addAdminImpl(email: string, role: AdminRole) {
  const supabase = await createClient();
  await requireSuperAdmin(supabase);

  const { error } = await supabase.rpc("admin_add_admin_by_email", {
    target_email: email.trim().toLowerCase(),
    target_role: role,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admins");
}

export async function updateAdminRole(userId: string, role: AdminRole) {
  return runAction(() => updateAdminRoleImpl(userId, role));
}

async function updateAdminRoleImpl(userId: string, role: AdminRole) {
  const supabase = await createClient();
  await requireSuperAdmin(supabase);

  const { error } = await supabase.rpc("admin_update_admin_role", { target_user_id: userId, new_role: role });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admins");
}

export async function removeAdmin(userId: string) {
  return runAction(() => removeAdminImpl(userId));
}

async function removeAdminImpl(userId: string) {
  const supabase = await createClient();
  await requireSuperAdmin(supabase);

  const { error } = await supabase.rpc("admin_remove_admin", { target_user_id: userId });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admins");
}
