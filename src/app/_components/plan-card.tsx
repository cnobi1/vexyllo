import type { ReactNode } from "react";
import type { Plan } from "@/lib/billing/plans";
import { IMAGE_CREDIT_COST, videoCreditCost } from "@/lib/billing/credit-costs";
import { CheckIcon } from "./check-icon";

/**
 * Shared plan-card shell for /pricing (logged-out) and /billing
 * (authenticated) — same pitch (price, credits, feature checklist,
 * "Most popular" badge on Pro) either way. Only the call-to-action differs:
 * pricing links to /signup, billing renders SubscribeButton/CancelButton
 * wired to the real Stripe flow — so the CTA is a slot, not baked in here.
 */
export function PlanCard({
  plan,
  cta,
  featuredBadge = true,
  creditsPerVideoSecond1080p = videoCreditCost(1, "1080p"),
}: {
  plan: Plan;
  cta: ReactNode;
  featuredBadge?: boolean;
  /** Live value from credit_cost_settings ('min_video_floor') — see faqs.ts's buildBillingFaqs for the same reasoning. Defaults to the hardcoded constant if a caller hasn't loaded live settings. */
  creditsPerVideoSecond1080p?: number;
}) {
  const approxImages = Math.floor(plan.monthlyCredits / IMAGE_CREDIT_COST);
  const approxVideoSeconds = Math.floor(plan.monthlyCredits / creditsPerVideoSecond1080p);
  const isFeatured = plan.id === "pro";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl ${
        isFeatured ? "card-glow is-active sm:-translate-y-3" : "card-glow"
      }`}
    >
      {isFeatured && featuredBadge && (
        <div className="btn-primary flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white">
          ✦ Most popular
        </div>
      )}
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
          <p className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground sm:text-5xl">${plan.priceUsd}</span>
            <span className="text-sm text-muted">/month</span>
          </p>
        </div>
        <ul className="flex flex-1 flex-col gap-3 text-sm text-muted">
          <li className="flex items-center gap-2.5">
            <CheckIcon />
            <span>
              <span className="font-medium text-foreground">{plan.monthlyCredits} credits</span> every month
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckIcon />
            <span>~{approxImages} images/month</span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckIcon />
            <span>~{approxVideoSeconds}s of 1080p video/month</span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckIcon />
            <span>Credits roll over, never expire</span>
          </li>
        </ul>
        {cta}
      </div>
    </div>
  );
}
