"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "@/lib/providers/billing";
import { isPlanId } from "@/lib/billing/plans";
import { isTopUpPackId } from "@/lib/billing/topup-packs";

export async function subscribe(plan: string) {
  if (!isPlanId(plan)) {
    throw new Error(`Unknown plan: ${plan}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const provider = getBillingProvider();
  const result = await provider.startCheckout({ userId: user.id, email: user.email ?? "", plan });

  // Real Stripe returns its own hosted Checkout URL; the mock adapter
  // returns a local "/billing?..." path — both are just redirect targets.
  redirect(result.url);
}

export async function topUpCredits(packId: string) {
  if (!isTopUpPackId(packId)) {
    throw new Error(`Unknown top-up pack: ${packId}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Top-ups are only for existing subscribers — the credits_ledger_apply
  // trigger updates credit_balance on the matching subscriptions row and
  // silently no-ops if there isn't one yet (see topup-packs.ts's scope
  // note). The UI already hides this option for a never-subscribed user;
  // this is the server-side backstop.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!subscription) {
    throw new Error("Subscribe to a plan before topping up credits.");
  }

  const provider = getBillingProvider();
  const result = await provider.startTopUpCheckout({ userId: user.id, email: user.email ?? "", packId });

  redirect(result.url);
}

export async function cancelSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const provider = getBillingProvider();
  await provider.cancelSubscription(user.id);

  // Unlike subscribe(), this doesn't redirect anywhere new — the customer
  // stays on /billing, so the updated cancel_at_period_end needs an
  // explicit revalidate to show up.
  revalidatePath("/billing");
}
