"use client";

import { useState, useTransition } from "react";
import { addAdmin } from "@/lib/actions/admin-admins";
import { isActionError } from "@/lib/actions/action-result";
import type { AdminRole } from "@/lib/actions/admin-guard";

export function AddAdminForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }
    startTransition(async () => {
      const result = await addAdmin(trimmed, role);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      setEmail("");
      setRole("admin");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="admin-email" className="text-xs text-muted">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            disabled={isPending}
            className="w-64 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-border-strong disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="admin-role" className="text-xs text-muted">
            Role
          </label>
          <select
            id="admin-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            disabled={isPending}
            className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-border-strong disabled:opacity-50"
          >
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add admin"}
        </button>
      </div>
      <p className="text-xs text-muted-2">The account must already have signed up — this doesn&apos;t create one.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
