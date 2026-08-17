import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    title: "Script generation & editing",
    description: "Start from a one-line idea or paste your own script. AI drafts, enhances, and edits it with you, scene by scene.",
  },
  {
    title: "Scene breakdown",
    description: "Every script becomes a structured breakdown: summary, dialogue, duration, and the characters, locations, and props in play.",
  },
  {
    title: "Scene & character images",
    description: "Generate on-model character art and full scene images straight from your breakdown, in whatever visual style fits.",
  },
  {
    title: "Video generation",
    description: "Turn a still into motion: image-to-video and character-referenced clips, with duration and resolution control.",
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
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold sm:text-5xl">
            If you can write it, <span className="gradient-text">VeXyllo AI</span> can shoot it
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Script → scenes → rendered clips, powered by AI generation. Built for filmmakers, indie
            creators, concept artists, and anyone with an idea for a scene.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white">
              Get started free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {showcaseItems.length > 0 && (
        <section className="pb-20">
          <h2 className="mx-auto max-w-6xl px-6 text-center text-2xl font-semibold sm:text-3xl">
            Made with <span className="gradient-text">VeXyllo AI</span>
          </h2>
          <div className="mx-auto mt-8 grid w-full max-w-6xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcaseItems.map((item) => (
              <div key={item.id} className="card-glow flex flex-col gap-3 rounded-2xl p-5">
                <div className="aspect-video overflow-hidden rounded-lg bg-background/60">
                  {item.kind === "video" ? (
                    <video src={item.url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.prompt ?? "Made with VeXyllo AI"} className="h-full w-full object-cover" />
                  )}
                </div>
                {item.prompt && <p className="line-clamp-2 text-sm text-muted">{item.prompt}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card-glow flex flex-col gap-2 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

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
    </div>
  );
}
