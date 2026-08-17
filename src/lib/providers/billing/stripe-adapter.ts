import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlan } from "@/lib/billing/plans";
import type { BillingProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// Where Stripe should send the customer back to after Checkout — needs to
// be a real, publicly reachable URL in production, unlike every other
// provider adapter in this app (BytePlus, Gateway) which only ever get
// called server-to-server.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(STRIPE_SECRET_KEY);
}

/**
 * Real Stripe billing. Deliberately does NOT write subscriptions/
 * credits_ledger itself — unlike the mock adapter, a real payment isn't
 * confirmed until Stripe calls the webhook (checkout.session.completed /
 * invoice.paid), so that's the only place those rows get written for this
 * adapter. See src/app/api/webhooks/stripe/route.ts.
 */
export const stripeBillingAdapter: BillingProvider = {
  name: "stripe",
  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    const plan = getPlan(input.plan);
    if (!plan.stripePriceId) {
      throw new Error(`No Stripe price is configured for the "${plan.id}" plan yet.`);
    }
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${APP_URL}/billing?success=1`,
      cancel_url: `${APP_URL}/billing?canceled=1`,
      client_reference_id: input.userId,
      // Session-level metadata is what the checkout.session.completed
      // webhook reads to know which plan to provision (see
      // src/app/api/webhooks/stripe/route.ts); subscription_data.metadata
      // additionally stamps it onto the Subscription object itself so it's
      // visible from customer.subscription.* events too.
      metadata: { userId: input.userId, plan: plan.id },
      subscription_data: { metadata: { userId: input.userId, plan: plan.id } },
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { url: session.url };
  },
  async cancelSubscription(userId: string): Promise<void> {
    const stripe = getStripeClient();
    const supabase = createServiceClient();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .single();
    if (error || !subscription?.stripe_subscription_id) {
      throw new Error(error?.message ?? "No active subscription to cancel");
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });

    // Optimistic local update so the UI reflects it immediately — Stripe's
    // customer.subscription.updated webhook will arrive moments later and
    // reconcile the row to whatever Stripe's own state actually is.
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("user_id", userId);
    if (updateError) throw new Error(updateError.message);
  },
};
