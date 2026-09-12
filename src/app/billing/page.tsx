import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "@/lib/providers/billing";
import { loadPlans, isPlanId } from "@/lib/billing/plans";
import { TOPUP_PACKS } from "@/lib/billing/topup-packs";
import { buildBillingFaqs } from "@/lib/billing/faqs";
import { loadCreditCostSettings, videoCreditCost } from "@/lib/billing/credit-costs";
import { SubscribeButton, CancelButton, TopUpButton } from "./_components/plan-actions";
import { Logo } from "../_components/logo";
import { PlanCard } from "../_components/plan-card";

const STATUS_STYLE: Record<string, string> = {
  active: "border-success/30 bg-success/10 text-success",
  trialing: "border-primary/40 bg-primary/10 text-violet-300",
  past_due: "border-warning/30 bg-warning/10 text-warning",
  canceled: "border-danger/30 bg-danger/10 text-danger",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ topup_success?: string; topup_canceled?: string; demo?: string }>;
}) {
  const { topup_success: topUpSuccess, topup_canceled: topUpCanceled, demo } = await searchParams;

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

  const [plans, costSettings] = await Promise.all([loadPlans(supabase), loadCreditCostSettings(supabase)]);
  const creditsPerVideoSecond1080p = videoCreditCost(1, "1080p", costSettings.minVideoCreditCost);
  const billingFaqs = buildBillingFaqs(creditsPerVideoSecond1080p);

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Fixed-height background layer, NOT wrapping the header — the header
          needs to stay a direct child of this full-page container so its
          sticky containing block spans the whole page (nesting it inside a
          hero-only wrapper previously broke stickiness past that wrapper's
          height). The gradient fade masks the fixed height not lining up
          exactly with the hero text's natural height. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden">
        <Image src="/marketing/pricing-hero-bg.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/80 to-background" />
      </div>

      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4">
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

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 pb-16 text-center sm:pb-20">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Simple, <span className="gradient-text">credit-based</span> pricing
        </h1>
        <p className="max-w-lg text-sm text-muted sm:text-base">
          One plan, one credit balance, no per-generation invoices. Pick the plan that matches how much
          you generate.
        </p>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pb-24">
        {isDemo && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
            <span className="font-semibold">Demo mode.</span> No Stripe account is connected yet, so subscribing
            here doesn&apos;t charge a card — it just activates the plan and grants its credits immediately, so you
            can build and test against real credit balances. Connect Stripe (
            <code className="rounded bg-background/40 px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code>) to switch this
            over to real payments.
          </div>
        )}

        {(topUpSuccess || demo === "topup") && (
          <div className="rounded-2xl border border-success/30 bg-success/10 px-5 py-4 text-sm text-success">
            Credits added to your balance.
          </div>
        )}
        {topUpCanceled && (
          <div className="rounded-2xl border border-border bg-background/40 px-5 py-4 text-sm text-muted">
            Top-up canceled — no charge was made.
          </div>
        )}

        <section className="card-glow flex flex-col gap-4 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-foreground">Current plan</h2>
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

        {subscription && (
          <section className="card-glow flex flex-col gap-4 rounded-2xl p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Top up credits</h2>
              <p className="mt-1 text-sm text-muted">
                Need more before your next renewal? Buy extra credits on top of your plan — they never expire and
                stack with your monthly refill.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {TOPUP_PACKS.map((pack) => (
                <div key={pack.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{pack.name}</p>
                    <p className="text-xs text-muted">{pack.credits} credits</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">${pack.priceUsd}</p>
                  <TopUpButton packId={pack.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-6">
          <h2 className="text-base font-semibold text-foreground">Plans</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
            {plans.map((plan) => {
              const variant = plan.id === "pro" ? "featured" : plan.id === "studio" ? "top" : "default";
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cta={<SubscribeButton planId={plan.id} isCurrent={currentPlanId === plan.id} variant={variant} />}
                  creditsPerVideoSecond1080p={creditsPerVideoSecond1080p}
                />
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-2">
            Prices in USD. Upgrade, downgrade, or cancel any time — it takes effect on your next renewal.
          </p>
        </section>

        <section className="mx-auto w-full max-w-2xl">
          <h2 className="mb-6 text-center text-xl font-semibold text-foreground">Questions</h2>
          <div className="flex flex-col gap-4">
            {billingFaqs.map((faq) => (
              <div key={faq.question} className="card-glow rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-1 text-sm text-muted">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
