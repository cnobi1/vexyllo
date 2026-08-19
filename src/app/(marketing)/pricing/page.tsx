import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { BILLING_FAQS } from "@/lib/billing/faqs";
import { HeroImagePlaceholder, ImagePlaceholder } from "../_components/image-placeholder";
import { PlanCard } from "@/app/_components/plan-card";

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
        <HeroImagePlaceholder
          src="/marketing/pricing-hero-bg.jpg"
          prompt="Abstract dark background with softly glowing violet and indigo credit-token shapes made of light, floating in shallow depth of field, subtle film grain, minimal and premium."
        />
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
          {PLANS.map((plan) => {
            const isFeatured = plan.id === "pro";
            const isTopTier = plan.id === "studio";

            const ctaClass = isFeatured
              ? "btn-primary rounded-full px-5 py-3 text-center text-sm font-semibold text-white"
              : isTopTier
                ? "rounded-full bg-primary-2 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:brightness-110"
                : "rounded-full border border-border px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover";

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                cta={
                  <Link href="/signup" className={ctaClass}>
                    Get started
                  </Link>
                }
              />
            );
          })}
        </div>
      </section>

      <p className="mx-auto w-full max-w-5xl px-6 pb-16 text-center text-xs text-muted-2">
        Prices in USD. Upgrade, downgrade, or cancel any time from your billing page.
      </p>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <ImagePlaceholder
          kind="video"
          aspect="aspect-[21/9]"
          src="/marketing/pricing-sample-clip.mp4"
          alt="Sample rendered clip of a lighthouse keeper walking toward a glowing lighthouse at dusk"
          prompt="A short sample clip: a lighthouse keeper walking toward a glowing lighthouse at dusk, warm-to-violet color grade, film-still quality, 16:9 — used to show what a finished credit-funded clip actually looks like."
        />
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-24">
        <h2 className="mb-6 text-center text-xl font-semibold text-foreground">Questions</h2>
        <div className="flex flex-col gap-4">
          {BILLING_FAQS.map((faq) => (
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
