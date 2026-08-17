import { createServiceClient } from "@/lib/supabase/service";
import { getPlan } from "@/lib/billing/plans";
import type { BillingProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Demo billing — no real payment happens. Activates (or switches) a
 * subscription and grants that plan's credits synchronously, standing in
 * for what a real Stripe Checkout + webhook round trip would eventually do.
 * Used whenever STRIPE_SECRET_KEY isn't set (see ./index.ts) — same
 * "no key configured, run on a mock" convention as the llm/image/video
 * providers. Writes go through the service-role client (bypassing RLS)
 * because subscriptions/credits_ledger deliberately have no insert/update
 * policy for the authenticated role — crediting an account is a system
 * write, not a user editing their own row (see service.ts).
 */
export const mockBillingAdapter: BillingProvider = {
  name: "mock",
  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    const plan = getPlan(input.plan);
    const supabase = createServiceClient();

    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: input.userId,
        stripe_customer_id: `mock_${input.userId}`,
        stripe_subscription_id: `mock_sub_${crypto.randomUUID()}`,
        plan: plan.id,
        status: "active",
        cancel_at_period_end: false,
        current_period_end: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (subError) throw new Error(subError.message);

    // Re-subscribing or switching plans grants that plan's credits again —
    // fine for a demo standing in for "you'd be charged and credited now";
    // a real deployment relies on Stripe's own webhooks for this instead.
    const { error: ledgerError } = await supabase
      .from("credits_ledger")
      .insert({ user_id: input.userId, amount: plan.monthlyCredits, reason: "subscription_refill" });
    if (ledgerError) throw new Error(ledgerError.message);

    return { url: "/billing?demo=subscribed" };
  },
  async cancelSubscription(userId: string): Promise<void> {
    const supabase = createServiceClient();
    // Mirrors Stripe's own default: cancel takes effect at the end of the
    // current period, not immediately — status stays 'active' until then.
    // A real deployment needs Stripe's period-end webhook (or a scheduled
    // job) to flip status to 'canceled'; there's no such clock here.
    const { error } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
};
