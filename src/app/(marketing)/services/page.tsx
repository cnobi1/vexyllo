import Link from "next/link";

const SERVICES = [
  {
    title: "Script generation & editing",
    description:
      "Write from a one-line idea, upload an existing script, or paste one in, then keep refining it with AI-driven edits and enhancements until it's ready to break down into scenes.",
  },
  {
    title: "Scene breakdown",
    description:
      "Turn a finished script into a structured breakdown, the way an Assistant Director would: each scene gets its own summary, dialogue, estimated duration, and the characters, locations, and props that appear in it, wardrobe notes included.",
  },
  {
    title: "Scene & character images",
    description:
      "Generate a combined scene image per scene, or freeform text-to-image panels, with batch generation and reference-image support so recurring characters and locations stay visually consistent.",
  },
  {
    title: "Character library",
    description:
      "Build out a character (or location, or prop) once, generate a reference sheet, save multiple outfit/variant images, and reuse it across every scene and shot with a simple @mention in your prompt.",
  },
  {
    title: "Video generation",
    description:
      "Turn a still into motion: image-to-video and character-referenced video generation, with duration and resolution controls tuned to what the underlying model actually supports.",
  },
  {
    title: "Media library",
    description:
      "Every image and clip you generate, across scenes, characters, and freeform prompts, lands in one searchable, realtime-updating media library for the project.",
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
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-20">
        <ol className="flex flex-col gap-4">
          {SERVICES.map((service, index) => (
            <li key={service.title} className="card-glow flex gap-4 rounded-2xl p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full btn-primary text-sm font-semibold text-white">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">{service.title}</h2>
                <p className="text-sm text-muted">{service.description}</p>
              </div>
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
