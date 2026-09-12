import { PLANS } from "@/lib/billing/plans";
import type { PlanCreditsRow } from "./plan-credits-table";

export type SubscriptionActivityRow = { plan: string; status: string; creditBalance: number };

/**
 * Live snapshot of "what's happening in billing right now" — computed
 * directly from the subscriptions table on every page load (no caching),
 * since this is a small table and admins checking this page want current
 * numbers, not a stale summary. Price comes from the static PLANS array
 * (see plans.ts) since it's code-level, not admin-editable — only the
 * credit allotment (plans prop, from subscription_plans) is live-tunable.
 */
export function SubscriptionActivity({ rows, plans }: { rows: SubscriptionActivityRow[]; plans: PlanCreditsRow[] }) {
  const active = rows.filter((row) => row.status === "active");
  const mrr = active.reduce((sum, row) => {
    const price = PLANS.find((plan) => plan.id === row.plan)?.priceUsd ?? 0;
    return sum + price;
  }, 0);
  const totalCreditsOutstanding = rows.reduce((sum, row) => sum + row.creditBalance, 0);

  const byPlan = plans.map((plan) => {
    const planRows = rows.filter((row) => row.plan === plan.id);
    const planActive = planRows.filter((row) => row.status === "active");
    return {
      ...plan,
      activeCount: planActive.length,
      creditsRemaining: planRows.reduce((sum, row) => sum + row.creditBalance, 0),
    };
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-glow flex flex-col gap-1 rounded-2xl p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-2">MRR</span>
          <span className="text-2xl font-semibold text-foreground">${mrr}</span>
          <span className="text-xs text-muted">from {active.length} active subscriber{active.length === 1 ? "" : "s"}</span>
        </div>
        <div className="card-glow flex flex-col gap-1 rounded-2xl p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Total subscriptions</span>
          <span className="text-2xl font-semibold text-foreground">{rows.length}</span>
          <span className="text-xs text-muted">across every status (active, canceled, etc.)</span>
        </div>
        <div className="card-glow flex flex-col gap-1 rounded-2xl p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Credits outstanding</span>
          <span className="text-2xl font-semibold text-foreground">{totalCreditsOutstanding.toLocaleString()}</span>
          <span className="text-xs text-muted">unspent, across all accounts</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Active subscribers</th>
              <th className="px-4 py-3 font-medium">Credits remaining (sum)</th>
            </tr>
          </thead>
          <tbody>
            {byPlan.map((plan) => (
              <tr key={plan.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{plan.name}</td>
                <td className="px-4 py-3 text-muted">{plan.activeCount}</td>
                <td className="px-4 py-3 text-muted">{plan.creditsRemaining.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
