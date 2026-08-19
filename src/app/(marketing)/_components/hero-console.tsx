"use client";

import { useState } from "react";
import { startProjectFromIdea } from "@/lib/actions/projects";
import { SparkleIcon } from "@/app/_components/sparkle-icon";

const TABS = [
  { id: "script", label: "Script", placeholder: "e.g. A lonely lighthouse keeper finds a message in a bottle that changes everything…" },
  { id: "scenes", label: "Scenes", placeholder: "Describe the story, and we'll break it into a shootable scene sheet…" },
  { id: "video", label: "Video", placeholder: "Describe the clip you want to end up with…" },
] as const;

export function HeroConsole() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("script");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <form action={startProjectFromIdea} className="flex w-full flex-col items-center gap-4">
      <div className="inline-flex rounded-full border border-border bg-surface/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              t.id === tab
                ? "rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-foreground"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-glow is-active w-full rounded-2xl p-4 text-left">
        <textarea
          name="idea"
          required
          rows={2}
          placeholder={active.placeholder}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-2 outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-2">
            Every scene, image, and clip builds from a script — that&apos;s always the first step.
          </span>
          <button
            type="submit"
            className="btn-primary flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white"
          >
            <SparkleIcon />
            Generate
          </button>
        </div>
      </div>
    </form>
  );
}
