import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlan, isPlanId, type PlanId } from "@/lib/billing/plans";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * The one deliberate exception to "server actions are the only way the UI
 * mutates data" (see CLAUDE.md) — Stripe calls this over HTTP, it can't
 * invoke a Next.js server action. Only reachable once a real Stripe account
 * is connected (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET); the mock
 * billing adapter writes subscriptions/credits_ledger synchronously inside
 * startCheckout instead and never needs this route.
 */
function mapStripeStatus(status: Stripe.Subscription.Status): "active" | "trialing" | "past_due" | "canceled" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "past_due";
  }
}

// Period-end moved from the Subscription object itself to its line items in
// recent Stripe API versions — a subscription with a single price (which is
// all this app ever creates) has exactly one item to read it off of.
function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item ? new Date(item.current_period_end * 1000).toISOString() : null;
}

// credits_ledger.stripe_event_id has a unique partial index — this is the
// actual dedupe guard for at-least-once webhook delivery, not application
// logic. Any insert racing/repeating a previously-processed event hits a
// 23505 (unique_violation) here, which is treated as "already applied."
function isDuplicateEventError(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function POST(request: Request) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const planId = session.metadata?.plan;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (!userId || !planId || !isPlanId(planId) || !customerId || !subscriptionId) {
        // Not one of our Checkout sessions (or missing metadata) — nothing
        // to reconcile. Ack with 200 so Stripe doesn't keep retrying.
        break;
      }
      const plan = getPlan(planId);

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: plan.id,
          status: mapStripeStatus(subscription.status),
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: getPeriodEnd(subscription),
        },
        { onConflict: "user_id" },
      );
      if (subError) throw new Error(subError.message);

      const { error: ledgerError } = await supabase
        .from("credits_ledger")
        .insert({ user_id: userId, amount: plan.monthlyCredits, reason: "subscription_refill", stripe_event_id: event.id });
      if (ledgerError && !isDuplicateEventError(ledgerError)) throw new Error(ledgerError.message);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // The invoice tied to checkout itself (billing_reason
      // "subscription_create") is already handled above — only renewals
      // refill credits here, or subscribing once would double-credit.
      if (invoice.billing_reason !== "subscription_cycle") break;

      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (!subscriptionId) break;

      const { data: existing, error: lookupError } = await supabase
        .from("subscriptions")
        .select("user_id, plan")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!existing || !isPlanId(existing.plan)) break;
      const plan = getPlan(existing.plan as PlanId);

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: mapStripeStatus(subscription.status), current_period_end: getPeriodEnd(subscription) })
        .eq("stripe_subscription_id", subscriptionId);
      if (updateError) throw new Error(updateError.message);

      const { error: ledgerError } = await supabase
        .from("credits_ledger")
        .insert({ user_id: existing.user_id, amount: plan.monthlyCredits, reason: "subscription_refill", stripe_event_id: event.id });
      if (ledgerError && !isDuplicateEventError(ledgerError)) throw new Error(ledgerError.message);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: mapStripeStatus(subscription.status),
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: getPeriodEnd(subscription),
        })
        .eq("stripe_subscription_id", subscription.id);
      if (error) throw new Error(error.message);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("stripe_subscription_id", subscription.id);
      if (error) throw new Error(error.message);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
