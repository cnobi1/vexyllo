import type { PlanId } from "@/lib/billing/plans";
import type { TopUpPackId } from "@/lib/billing/topup-packs";

export interface StartCheckoutInput {
  userId: string;
  email: string;
  plan: PlanId;
}

/** A top-up isn't a plan (no recurring price, no monthlyCredits shape) — kept as its own input type rather than overloading StartCheckoutInput.plan. */
export interface StartTopUpCheckoutInput {
  userId: string;
  email: string;
  packId: TopUpPackId;
}

export interface StartCheckoutResult {
  /**
   * Where to send the customer next. The real Stripe adapter returns a
   * Stripe-hosted Checkout URL to redirect to. The mock adapter activates
   * the subscription synchronously (no external payment step exists) and
   * returns a local URL back to the billing page — callers don't need to
   * know which happened, they just redirect to `url`.
   */
  url: string;
}

export interface BillingProvider {
  name: string;
  startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult>;
  /** Cancels at the end of the current billing period — no refund, matches Stripe's default cancellation behavior. */
  cancelSubscription(userId: string): Promise<void>;
  /** One-time credit purchase, independent of the subscription lifecycle — see StartTopUpCheckoutInput. */
  startTopUpCheckout(input: StartTopUpCheckoutInput): Promise<StartCheckoutResult>;
}
