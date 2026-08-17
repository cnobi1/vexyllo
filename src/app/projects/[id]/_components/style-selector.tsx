"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateProjectStyle } from "@/lib/actions/projects";

const PRESET_STYLES = ["3D-Animation", "Charcoal", "Claymation", "Concept-Sketch", "Realistic"];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Persistent, project-wide style picker — every generation prompt (script
 * breakdown, shot images/videos, freeform images, character sheets) already
 * reads projects.style, so setting it once here from anywhere in the
 * project is what makes every downstream generation match what the
 * customer actually expects to get.
 */
export function StyleSelector({ projectId, currentStyle }: { projectId: string; currentStyle: string | null }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState(
    currentStyle && !PRESET_STYLES.includes(currentStyle) ? currentStyle : "",
  );
  const [isPending, startTransition] = useTransition();

  function applyStyle(style: string) {
    setOpen(false);
    setCustomMode(false);
    startTransition(async () => {
      await updateProjectStyle(projectId, style);
    });
  }

  function handleCustomSubmit(event: FormEvent) {
    event.preventDefault();
    if (!customValue.trim()) return;
    applyStyle(customValue.trim());
  }

  const label = currentStyle?.trim() || "No style set";

  return (
    <div className="relative pb-3">
      <span className="mb-1 block text-xs font-medium text-muted-2">Style</span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong disabled:opacity-50"
      >
        <span className="truncate">{isPending ? "Saving…" : label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close style menu"
            onClick={() => {
              setOpen(false);
              setCustomMode(false);
            }}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border-strong bg-surface p-1 shadow-lg">
            {customMode ? (
              <form onSubmit={handleCustomSubmit} className="flex flex-col gap-1.5 p-1.5">
                <input
                  autoFocus
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  placeholder="e.g. noir, anime, watercolor…"
                  className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-border-strong"
                />
                <button type="submit" className="btn-primary rounded-md px-2 py-1 text-xs font-medium text-white">
                  Use this style
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <span className="text-primary">+</span> Create custom style
                </button>
                <div className="my-1 border-t border-border" />
                {PRESET_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => applyStyle(style)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-surface-hover ${
                      currentStyle === style ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {style}
                    {currentStyle === style && <span>✓</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
