"use client";

import { useState, useTransition } from "react";
import { removeAdmin, updateAdminRole, type AdminListRow } from "@/lib/actions/admin-admins";
import type { AdminRole } from "@/lib/actions/admin-guard";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function AdminsTable({ admins, currentUserId }: { admins: AdminListRow[]; currentUserId: string }) {
  if (admins.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-2">No admins yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Added</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <AdminRow key={admin.userId} admin={admin} isSelf={admin.userId === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminRow({ admin, isSelf }: { admin: AdminListRow; isSelf: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(role: AdminRole) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminRole(admin.userId, role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update role");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeAdmin(admin.userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove admin");
      }
    });
  }

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover/60">
      <td className="px-4 py-3 text-foreground">
        {admin.email ?? "—"}
        {isSelf && <span className="ml-2 text-xs text-muted-2">(you)</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted">{dateFormatter.format(new Date(admin.createdAt))}</td>
      <td className="px-4 py-3">
        <select
          value={admin.role}
          onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
          disabled={isPending}
          className="rounded-lg border border-border bg-background/60 px-2 py-1 text-sm text-foreground outline-none focus:border-border-strong disabled:opacity-50"
        >
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending || isSelf}
            title={isSelf ? "You can't remove your own admin access." : undefined}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:border-danger/50 hover:bg-danger/10 disabled:opacity-40"
          >
            Remove
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
