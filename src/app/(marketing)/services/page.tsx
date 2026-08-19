import Link from "next/link";
import { HeroImagePlaceholder, ImagePlaceholder } from "../_components/image-placeholder";

const SERVICES = [
  {
    title: "Script generation & editing",
    description:
      "Write from a one-line idea, upload an existing script, or paste one in, then keep refining it with AI-driven edits and enhancements until it's ready to break down into scenes.",
    imagePrompt:
      "Close-up of a screenplay page mid-edit, with an AI-suggested rewrite highlighted in violet. Laptop screen glow, minimal desk setup, moody dark background.",
    kind: "image" as const,
    image: "/marketing/services-script.jpg",
    alt: "Screenplay page mid-edit with an AI-suggested rewrite",
  },
  {
    title: "Scene breakdown",
    description:
      "Turn a finished script into a structured breakdown, the way an Assistant Director would: each scene gets its own summary, dialogue, estimated duration, and the characters, locations, and props that appear in it, wardrobe notes included.",
    imagePrompt:
      "Top-down flat lay of a scene breakdown sheet with small character, location, and prop icons arranged like a director's shot list. Violet and indigo accent highlights, clean modern illustration style.",
    kind: "image" as const,
    image: "/marketing/services-scene-breakdown.jpg",
    alt: "Scene breakdown sheet with character, location, and prop icons",
  },
  {
    title: "Scene & character images",
    description:
      "Generate a combined scene image per scene, or freeform text-to-image panels, with batch generation and reference-image support so recurring characters and locations stay visually consistent.",
    imagePrompt:
      "A single cinematic scene still: two characters on a rain-soaked city street at night, dramatic violet and orange neon lighting, film-still composition.",
    kind: "image" as const,
    image: "/marketing/services-scene-characters.jpg",
    alt: "Cinematic scene still of two characters on a rain-soaked street at night",
  },
  {
    title: "Character library",
    description:
      "Build out a character (or location, or prop) once, generate a reference sheet, save multiple outfit/variant images, and reuse it across every scene and shot with a simple @mention in your prompt.",
    imagePrompt:
      "A character reference sheet showing one character in three outfit variations, consistent studio lighting and neutral background, concept-art style.",
    kind: "image" as const,
    image: "/marketing/services-character-library.jpg",
    alt: "Character reference sheet with three outfit variations",
  },
  {
    title: "Video generation",
    description:
      "Turn a still into motion: image-to-video and character-referenced video generation, with duration and resolution controls tuned to what the underlying model actually supports.",
    imagePrompt:
      "A short clip of a static storyboard sketch dissolving into a full-color motion still of a character mid-action, violet light streaks indicating movement.",
    kind: "video" as const,
    image: "/marketing/services-video-generation.mp4",
    alt: "Storyboard sketch dissolving into a full-color motion clip",
  },
  {
    title: "Media library",
    description:
      "Every image and clip you generate, across scenes, characters, and freeform prompts, lands in one searchable, realtime-updating media library for the project.",
    imagePrompt:
      "Overhead view of a grid of image and video thumbnails on a dark UI, like a media library, soft violet glow highlighting one selected clip.",
    kind: "image" as const,
    image: "/marketing/services-media-library.jpg",
    alt: "Grid of image and video thumbnails in a media library UI",
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-bold sm:text-4xl">
            One pipeline, <span className="gradient-text">script to screen</span>
          </h1>
          <p className="max-w-xl text-sm text-muted sm:text-base">
            Everything VeXyllo AI does, in the order you&apos;ll actually use it, from a raw idea to
            rendered clips.
          </p>
        </div>
        <HeroImagePlaceholder
          src="/marketing/services-hero-bg.jpg"
          prompt="Abstract cinematic collage: a script page dissolving into a storyboard grid, then into a rendered video frame, connected by flowing violet-to-cyan light trails. Dark background, high detail, 21:9 wide."
        />
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-20">
        <ol className="flex flex-col gap-4">
          {SERVICES.map((service, index) => (
            <li key={service.title} className="card-glow flex flex-col gap-4 rounded-2xl p-6 sm:flex-row">
              <div className="flex gap-4 sm:flex-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full btn-primary text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-foreground">{service.title}</h2>
                  <p className="text-sm text-muted">{service.description}</p>
                </div>
              </div>
              <ImagePlaceholder
                prompt={service.imagePrompt}
                kind={service.kind}
                aspect="aspect-video"
                src={service.image}
                alt={service.alt}
                className="sm:w-56 sm:shrink-0"
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24 text-center">
        <Link href="/signup" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white">
          Get started free
        </Link>
      </section>
    </div>
  );
}
