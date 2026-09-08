import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/actions/admin-guard";
import { listAdmins } from "@/lib/actions/admin-admins";
import { AdminsTable } from "@/app/admin/_components/admins-table";
import { AddAdminForm } from "@/app/admin/_components/add-admin-form";

export default async function AdminAdminsPage() {
  const supabase = await createClient();
  const session = await requireSuperAdmin(supabase);
  const admins = await listAdmins();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Admins</h1>
        <p className="mt-0.5 text-sm text-muted">
          Super Admins can manage other admins; Admins can manage the model catalog and showcase.
        </p>
      </header>

      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <AddAdminForm />
        <AdminsTable admins={admins} currentUserId={session.id} />
      </div>
    </div>
  );
}
