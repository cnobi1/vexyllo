import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { logout } from "@/lib/actions/auth";
import { AdminShell } from "@/app/admin/_components/admin-shell";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);

  return (
    <AdminShell email={user.email ?? ""} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
