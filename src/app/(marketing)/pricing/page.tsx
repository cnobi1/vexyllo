import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { IMAGE_CREDIT_COST, videoCreditCost } from "@/lib/billing/credit-costs";

const CREDITS_PER_1080P_SECOND = videoCreditCost(1, "1080p");

const FAQS = [
  {
    question: "What's a credit?",
    answer: `A credit is what generation costs come out of. An image generation costs ${IMAGE_CREDIT_COST} credits; video costs ${CREDITS_PER_1080P_SECOND} credits per second at 1080p (less at lower resolutions). A failed generation never costs a credit.`,
  },
  {
    question: "Do unused credits roll over?",
    answer: "Yes, credits don't expire. Every renewal adds your plan's credits on top of whatever you have left.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, upgrade or downgrade any time from your billing page. It takes effect on your next renewal.",
  },
];

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-3 w-3 text-primary">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Simple, <span className="gradient-text">credit-based</span> pricing
          </h1>
          <p className="max-w-lg text-sm text-muted sm:text-base">
            One plan, one credit balance, no per-generation invoices. Pick the plan that matches how much
            you generate.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
          {PLANS.map((plan) => {
            const approxImages = Math.floor(plan.monthlyCredits / IMAGE_CREDIT_COST);
            const approxVideoSeconds = Math.floor(plan.monthlyCredits / CREDITS_PER_1080P_SECOND);
            const isFeatured = plan.id === "pro";
            const isTopTier = plan.id === "studio";

            const ctaClass = isFeatured
              ? "btn-primary rounded-full px-5 py-3 text-center text-sm font-semibold text-white"
              : isTopTier
                ? "rounded-full bg-primary-2 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:brightness-110"
                : "rounded-full border border-border px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl ${
                  isFeatured ? "card-glow is-active sm:-translate-y-3" : "card-glow"
                }`}
              >
                {isFeatured && (
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
                  <Link href="/signup" className={ctaClass}>
                    Get started
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mx-auto w-full max-w-5xl px-6 pb-16 text-center text-xs text-muted-2">
        Prices in USD. Upgrade, downgrade, or cancel any time from your billing page.
      </p>

      <section className="mx-auto w-full max-w-2xl px-6 pb-24">
        <h2 className="mb-6 text-center text-xl font-semibold text-foreground">Questions</h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div key={faq.question} className="card-glow rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
              <p className="mt-1 text-sm text-muted">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
