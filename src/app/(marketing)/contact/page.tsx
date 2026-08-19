import { HeroImagePlaceholder, ImagePlaceholder } from "../_components/image-placeholder";
import { ContactForm } from "./_components/contact-form";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 text-primary">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 text-primary">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Get in <span className="gradient-text">touch</span>
          </h1>
          <p className="max-w-lg text-sm text-muted sm:text-base">
            Questions about a project, a plan, or something that looks broken — we read every message.
          </p>
        </div>
        <HeroImagePlaceholder
          src="/marketing/contact-hero-bg.jpg"
          prompt="Soft-focus wide shot of a cozy creative studio at dusk, string lights and a glowing monitor in the background, warm and approachable mood with violet accent lighting, plenty of negative space for text overlay."
        />
      </section>

      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2 sm:items-center">
        <div className="card-glow flex flex-col gap-5 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <MailIcon />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Email us</h2>
              <a
                href="mailto:support@vexyllo.com"
                className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                support@vexyllo.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ClockIcon />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Response time</h2>
              <p className="text-sm text-muted">We typically reply within one business day.</p>
            </div>
          </div>
        </div>

        <ImagePlaceholder
          aspect="aspect-square"
          src="/marketing/contact-illustration.jpg"
          alt="Illustration of a person at a desk wearing a headset, ready to help"
          prompt="Friendly, flat-illustration support scene: a person at a desk wearing a headset, laptop showing a chat bubble, rendered in the site's violet-to-indigo gradient style."
        />
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-24">
        <ContactForm />
      </section>
    </div>
  );
}
