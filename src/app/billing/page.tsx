import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "@/lib/providers/billing";
import { PLANS, isPlanId } from "@/lib/billing/plans";
import { SubscribeButton, CancelButton } from "./_components/plan-actions";
import { Logo } from "../_components/logo";

const STATUS_STYLE: Record<string, string> = {
  active: "border-success/30 bg-success/10 text-success",
  trialing: "border-primary/40 bg-primary/10 text-violet-300",
  past_due: "border-warning/30 bg-warning/10 text-warning",
  canceled: "border-danger/30 bg-danger/10 text-danger",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, credit_balance, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const provider = getBillingProvider();
  const isDemo = provider.name === "mock";
  const currentPlanId = subscription && isPlanId(subscription.plan) ? subscription.plan : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link href="/dashboard">
          <Logo className="h-7 w-auto" />
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
        >
          Back to projects
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-14">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">Billing</h2>
          <p className="text-sm text-muted">Manage your subscription and credit balance.</p>
        </div>

        {isDemo && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
            <span className="font-semibold">Demo mode.</span> No Stripe account is connected yet, so subscribing
            here doesn&apos;t charge a card — it just activates the plan and grants its credits immediately, so you
            can build and test against real credit balances. Connect Stripe (
            <code className="rounded bg-background/40 px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code>) to switch this
            over to real payments.
          </div>
        )}

        <section className="card-glow flex flex-col gap-4 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-foreground">Current plan</h3>
          {subscription ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold capitalize text-foreground">{subscription.plan}</span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                  STATUS_STYLE[subscription.status] ?? "border-border bg-background/60 text-muted"
                }`}
              >
                {subscription.status}
              </span>
              {subscription.cancel_at_period_end && (
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs text-warning">
                  Cancels at period end
                </span>
              )}
              <span className="ml-auto text-sm text-muted">
                <span className="font-semibold text-foreground">{subscription.credit_balance}</span> credits
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted">No active subscription — pick a plan below to get started.</p>
          )}
          {subscription?.current_period_end && (
            <p className="text-xs text-muted-2">
              {subscription.cancel_at_period_end ? "Access ends" : "Renews"}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          {subscription && subscription.status !== "canceled" && !subscription.cancel_at_period_end && (
            <div className="pt-1">
              <CancelButton />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Plans</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.id} className="card-glow flex flex-col gap-4 rounded-2xl p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted">{plan.name}</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${plan.priceUsd}
                    <span className="text-sm font-normal text-muted">/mo</span>
                  </span>
                  <span className="text-sm text-muted">{plan.monthlyCredits} credits / month</span>
                </div>
                <SubscribeButton planId={plan.id} isCurrent={currentPlanId === plan.id} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
