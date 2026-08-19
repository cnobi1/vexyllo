"use client";

import { useState, useTransition } from "react";
import { getPlan, isPlanId } from "@/lib/billing/plans";
import { grantUserCredits } from "@/lib/actions/admin-users";

export type AdminUser = {
  userId: string;
  email: string | null;
  createdAt: string;
  plan: string | null;
  status: string | null;
  creditBalance: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/15 text-success",
  trialing: "bg-primary/15 text-primary",
  past_due: "bg-warning/15 text-warning",
  canceled: "bg-danger/15 text-danger",
};

export function UsersTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-2">No registered users yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Signed up</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Credits</th>
            <th className="px-4 py-3 font-medium text-right">Add credits</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow key={user.userId} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Enter a positive whole number.");
      return;
    }
    startTransition(async () => {
      try {
        await grantUserCredits(user.userId, parsed);
        setAmount("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add credits");
      }
    });
  }

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover/60">
      <td className="px-4 py-3 text-foreground">{user.email ?? "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 text-muted">{dateFormatter.format(new Date(user.createdAt))}</td>
      <td className="px-4 py-3 text-muted">
        {user.plan && isPlanId(user.plan) ? getPlan(user.plan).name : <span className="text-muted-2">No plan</span>}
      </td>
      <td className="px-4 py-3">
        {user.status ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[user.status] ?? "bg-surface-hover text-muted-2"}`}>
            {user.status.replace("_", " ")}
          </span>
        ) : (
          <span className="text-muted-2">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-foreground">{user.creditBalance ?? "—"}</td>
      <td className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              step={1}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              className="w-20 rounded-lg border border-border bg-background/60 px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-border-strong disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </td>
    </tr>
  );
}
