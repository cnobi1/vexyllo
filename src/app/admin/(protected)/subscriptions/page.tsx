import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { PlanCreditsTable, type PlanCreditsRow } from "@/app/admin/_components/plan-credits-table";
import { CreditCostSettingsTable, type CreditCostSettingRow } from "@/app/admin/_components/credit-cost-settings-table";
import { SubscriptionActivity, type SubscriptionActivityRow } from "@/app/admin/_components/subscription-activity";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const [{ data: plans, error: plansError }, { data: costSettings, error: costError }, { data: subscriptions }] =
    await Promise.all([
      supabase.from("subscription_plans").select("id, name, monthly_credits").order("monthly_credits", { ascending: true }),
      supabase.from("credit_cost_settings").select("key, label, credits").order("key", { ascending: true }),
      supabase.from("subscriptions").select("plan, status, credit_balance"),
    ]);
  if (plansError) throw new Error(plansError.message);
  if (costError) throw new Error(costError.message);

  const planRows: PlanCreditsRow[] = (plans ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    monthlyCredits: row.monthly_credits,
  }));

  const costRows: CreditCostSettingRow[] = (costSettings ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    credits: row.credits,
  }));

  const activityRows: SubscriptionActivityRow[] = (subscriptions ?? []).map((row) => ({
    plan: row.plan,
    status: row.status,
    creditBalance: row.credit_balance,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Subscriptions</h1>
        <p className="mt-0.5 text-sm text-muted">
          What&apos;s happening in billing right now, and the two knobs that control it: how many credits each plan
          grants, and what the non-per-model generation costs are.
        </p>
      </header>

      <div className="flex w-full flex-col gap-10 px-6 py-8">
        <SubscriptionActivity rows={activityRows} plans={planRows} />

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Credits per plan</h2>
            <p className="text-xs text-muted-2">
              How many credits a subscriber gets on signup and every renewal. Price and Stripe billing stay
              code-level — Stripe doesn&apos;t allow editing an existing price, so changing what a plan actually charges
              still needs a new Stripe Price created first.
            </p>
          </div>
          <PlanCreditsTable plans={planRows} />
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Credit costs not tied to a model</h2>
            <p className="text-xs text-muted-2">
              Per-model image/video costs are set on the{" "}
              <a href="/admin/models" className="underline underline-offset-2 hover:text-foreground">
                Models
              </a>{" "}
              page. These three apply everywhere else.
            </p>
          </div>
          <CreditCostSettingsTable settings={costRows} />
        </section>
      </div>
    </div>
  );
}
