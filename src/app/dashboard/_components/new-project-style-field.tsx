"use client";

import { useState } from "react";
import { PRESET_STYLES, CUSTOM_STYLE_VALUE } from "@/lib/project-styles";
import { useTextLimits } from "@/app/_components/use-text-limits";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`h-3.5 w-3.5 shrink-0 text-muted-2 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-primary">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Lets the style be picked at creation time instead of only afterward via
 * the in-project StyleSelector — every generation downstream reads
 * projects.style, so setting it up front saves a trip back to change it
 * before the first generation.
 *
 * Custom button+listbox (not a native <select>) to match the same shell as
 * every other dropdown in the app (StyleSelector, ModelSelectControl) —
 * `style`/`customStyle` stay as plain named form fields (a hidden input plus
 * the visible text input) so createProject's existing formData.get() contract
 * doesn't need to change.
 */
export function NewProjectStyleField() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const limits = useTextLimits();

  const isCustom = selected === CUSTOM_STYLE_VALUE;
  const label = selected === "" ? "No style" : isCustom ? "Custom style…" : selected;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">
        Style <span className="text-muted-2">(optional)</span>
      </span>
      <input type="hidden" name="style" value={selected} />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors hover:border-border-strong"
        >
          <span className="truncate">{label}</span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="Close style menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="listbox"
              className="card-glow absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-surface p-1 shadow-lg"
            >
              <button
                type="button"
                role="option"
                aria-selected={selected === ""}
                onClick={() => {
                  setSelected("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors hover:bg-surface-hover ${
                  selected === "" ? "text-foreground" : "text-muted"
                }`}
              >
                No style
                {selected === "" && <CheckIcon />}
              </button>
              {PRESET_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  role="option"
                  aria-selected={selected === style}
                  onClick={() => {
                    setSelected(style);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors hover:bg-surface-hover ${
                    selected === style ? "text-foreground" : "text-muted"
                  }`}
                >
                  {style}
                  {selected === style && <CheckIcon />}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                role="option"
                aria-selected={isCustom}
                onClick={() => {
                  setSelected(CUSTOM_STYLE_VALUE);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors hover:bg-surface-hover ${
                  isCustom ? "text-foreground" : "text-primary"
                }`}
              >
                <span className="text-primary">+</span> Custom style…
                {isCustom && <CheckIcon />}
              </button>
            </div>
          </>
        )}
      </div>
      {isCustom && (
        <input
          name="customStyle"
          autoFocus
          maxLength={limits.short_text}
          placeholder="e.g. noir, anime, watercolor…"
          className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
      )}
    </div>
  );
}
