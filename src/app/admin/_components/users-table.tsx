import { getPlan, isPlanId } from "@/lib/billing/plans";

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
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Signed up</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Credits</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover/60">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
