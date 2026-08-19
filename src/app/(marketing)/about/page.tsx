import Link from "next/link";
import { HeroImagePlaceholder, ImagePlaceholder } from "../_components/image-placeholder";

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Why <span className="gradient-text">VeXyllo AI</span> exists
          </h1>
          <p className="text-sm text-muted sm:text-base">
            The gap between &ldquo;I have an idea for a scene&rdquo; and &ldquo;here&apos;s a clip of it&rdquo; used to require a
            camera, a cast, a location, and a lot of time. AI generation closes most of that gap, so we built
            VeXyllo AI to put the whole pipeline in one place: write or refine a script, break it into scenes,
            generate scene and character images, then turn stills into motion. No crew required.
          </p>
        </div>
        <HeroImagePlaceholder
          src="/marketing/about-hero-bg.jpg"
          alt=""
          prompt="Wide cinematic shot of a moody indie film pre-production desk at night: script pages, a lit storyboard sketch, and a laptop glowing with AI-generated scene art. Soft violet and indigo neon rim light, shallow depth of field, inspiring and a little mysterious, 21:9."
        />
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-4">
        <ImagePlaceholder
          aspect="aspect-[21/9]"
          src="/marketing/about-desk.jpg"
          alt="Filmmaker sketching a storyboard panel beside a laptop"
          prompt="Close-up, documentary-style shot of a filmmaker's hands sketching a storyboard panel next to a laptop displaying an AI-generated character sheet. Warm desk-lamp light mixed with cool violet monitor glow, shallow depth of field."
        />
      </section>

      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-3">
        <div className="card-glow flex flex-col gap-2 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">What we believe</h2>
          <p className="text-sm text-muted">
            A good idea shouldn&apos;t need a production budget to become watchable. Generation should
            handle the mechanical parts so you can spend your time on the story.
          </p>
        </div>
        <div className="card-glow flex flex-col gap-2 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Who we build for</h2>
          <p className="text-sm text-muted">
            Filmmakers first, and every other creator besides: indie creators, concept artists,
            and marketers, anyone who thinks in scenes and shots.
          </p>
        </div>
        <div className="card-glow flex flex-col gap-2 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Where we&apos;re headed</h2>
          <p className="text-sm text-muted">
            We&apos;re a small, hands-on team shipping quickly. The pipeline you see today is the same
            one we use, and it gets tighter every week.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-24 text-center">
        <Link href="/signup" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white">
          Try VeXyllo AI
        </Link>
      </section>
    </div>
  );
}
