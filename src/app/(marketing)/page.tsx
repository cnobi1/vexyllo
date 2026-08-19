import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroConsole } from "./_components/hero-console";
import { HeroImagePlaceholder, ImagePlaceholder } from "./_components/image-placeholder";
import { ShowcaseMedia } from "./_components/showcase-media";
import { Reveal } from "./_components/reveal";
import { ICONS } from "./_components/marketing-links";

const STEPS = [
  {
    title: "Script generation & editing",
    description: "Start from a one-line idea or paste your own script. AI drafts, enhances, and edits it with you, scene by scene.",
    icon: "script",
    kind: "image" as const,
    image: "/marketing/services-script.jpg",
    alt: "Screenplay page mid-edit with an AI-suggested rewrite",
  },
  {
    title: "Scene breakdown",
    description: "Every script becomes a structured breakdown: summary, dialogue, duration, and the characters, locations, and props in play.",
    icon: "scenes",
    kind: "image" as const,
    image: "/marketing/services-scene-breakdown.jpg",
    alt: "Scene breakdown sheet with character, location, and prop icons",
  },
  {
    title: "Scene & character images",
    description: "Generate on-model character art and full scene images straight from your breakdown, in whatever visual style fits.",
    icon: "images",
    kind: "image" as const,
    image: "/marketing/services-character-library.jpg",
    alt: "Character reference sheet with three outfit variations",
  },
  {
    title: "Video generation",
    description: "Turn a still into motion: image-to-video and character-referenced clips, with duration and resolution control.",
    icon: "videos",
    // A still, not the real .mp4 asset — every video file on this site
    // currently fails to decode in Chrome (HEVC-encoded), so this shows a
    // generated media-library screen instead of a broken/blank box until
    // the source videos get re-encoded to H.264.
    kind: "image" as const,
    image: "/marketing/services-media-library.jpg",
    alt: "Media library UI with a grid of video thumbnails and one clip selected",
  },
];

export default async function MarketingHomePage() {
  const supabase = await createClient();
  const { data: showcaseRows } = await supabase
    .from("showcase_items")
    .select("id, kind, storage_path, prompt")
    .order("created_at", { ascending: true });

  const showcaseItems = (showcaseRows ?? []).map((item) => ({
    id: item.id,
    kind: item.kind as "image" | "video",
    prompt: item.prompt,
    url: supabase.storage.from("showcase").getPublicUrl(item.storage_path).data.publicUrl,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-bold sm:text-5xl">
            If you can write it, <span className="gradient-text">VeXyllo AI</span> can shoot it
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Script → scenes → rendered clips, powered by AI generation. Built for filmmakers, indie
            creators, concept artists, and anyone with an idea for a scene.
          </p>
          <HeroConsole />
        </div>
        <HeroImagePlaceholder
          src="/marketing/services-scene-characters.jpg"
          alt="Cinematic scene still of two characters on a rain-soaked street at night"
          prompt="A single cinematic scene still: two characters on a rain-soaked city street at night, dramatic violet and orange neon lighting, film-still composition."
        />
      </section>

      {showcaseItems.length > 0 && (
        <Reveal>
          <section className="pb-20">
            <h2 className="mx-auto max-w-6xl px-6 text-center text-2xl font-semibold sm:text-3xl">
              Made with <span className="gradient-text">VeXyllo AI</span>
            </h2>
            <div className="mx-auto mt-8 w-full max-w-6xl columns-1 gap-3 px-6 sm:columns-2 lg:columns-3">
              {showcaseItems.map((item) => (
                <div key={item.id} className="card-glow mb-3 flex break-inside-avoid flex-col gap-2 rounded-2xl p-1.5">
                  <div className="overflow-hidden rounded-lg border border-border bg-background/60">
                    <ShowcaseMedia url={item.url} kind={item.kind} alt={item.prompt ?? "Made with VeXyllo AI"} />
                  </div>
                  {item.prompt && <p className="line-clamp-2 px-1.5 pb-1 text-sm text-muted">{item.prompt}</p>}
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              One pipeline, <span className="gradient-text">script to screen</span>
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Four steps, no crew required. Here&apos;s the order you&apos;ll actually use it in.
            </p>
          </div>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, index) => {
              const StepIcon = ICONS[step.icon];
              return (
                <li key={step.title} className="card-glow flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
                  <div className="flex gap-4 sm:flex-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full btn-primary text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-foreground">
                        <StepIcon className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted">{step.description}</p>
                    </div>
                  </div>
                  <ImagePlaceholder
                    prompt={step.description}
                    kind={step.kind}
                    aspect="aspect-video"
                    src={step.image}
                    alt={step.alt}
                    className="sm:w-56 sm:shrink-0"
                  />
                </li>
              );
            })}
          </ol>
          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-medium text-primary transition-colors hover:text-primary-2">
              See the full pipeline →
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mx-auto w-full max-w-3xl px-6 pb-24 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Built for anyone turning ideas into <span className="gradient-text">video</span>
          </h2>
          <p className="mt-4 text-sm text-muted sm:text-base">
            Filmmakers pitching a scene, marketers planning out an ad, and hobbyists visualizing a story,
            all going from script to screen. One pipeline, no crew required.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white">
              Start your first project
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
