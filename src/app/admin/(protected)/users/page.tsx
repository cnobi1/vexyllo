import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { UsersTable, type AdminUser } from "@/app/admin/_components/users-table";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    throw new Error(error.message);
  }

  type AdminListUsersRow = {
    user_id: string;
    email: string | null;
    created_at: string;
    plan: string | null;
    status: string | null;
    credit_balance: number | null;
  };

  const users: AdminUser[] = ((data ?? []) as AdminListUsersRow[]).map((row) => ({
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    plan: row.plan,
    status: row.status,
    creditBalance: row.credit_balance,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Registered users</h1>
        <p className="mt-0.5 text-sm text-muted">Everyone who&apos;s signed up, with their current plan and credit balance.</p>
      </header>

      <div className="flex w-full flex-col gap-8 px-6 py-8">
        <UsersTable users={users} />
      </div>
    </div>
  );
}
