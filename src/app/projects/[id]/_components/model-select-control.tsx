"use client";

import { useState } from "react";

export interface ModelOption {
  /** generation_models.id — what actually gets submitted to the server action. */
  id: string;
  displayName: string;
  description?: string | null;
  providerKey: "byteplus" | "gateway" | "alibaba" | "mock";
  allowedDurations?: { min: number; max: number } | null;
  allowedResolutions?: string[] | null;
  allowedRatios?: string[] | null;
  /** Pricing fields, shaped like GenerationModelPricing (credit-costs.ts) — lets the form show a live credit estimate as the customer picks a model/duration/resolution, mirroring the server's own computeCreditCost. */
  creditCostMode: "flat" | "duration_multiplier";
  flatCreditCost: number | null;
  creditsPerSecond: number | null;
  resolutionCostMultiplier: Record<string, number> | null;
  creditsPerReferenceImage: number | null;
}

/**
 * Initial <select> value for a model list: the first non-mock option, same
 * "real provider always outranks the dev fallback" rule as the server's
 * loadDefaultActiveModel (src/lib/billing/resolve-model.ts) — mock only wins
 * here if it's the sole active option for the capability.
 */
export function pickDefaultModelId(options: ModelOption[]): string {
  return (options.find((option) => option.providerKey !== "mock") ?? options[0])?.id ?? "";
}

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
 * Custom listbox instead of a native <select> — a plain <select> can't show
 * a model's description or provider alongside its name, so picking between
 * two similarly-named models (e.g. "Wan 3.0 Video" vs "Wan 3.0 Video
 * (Prime)") meant guessing. Same open/close-on-outside-click shell as
 * StyleSelector (_components/style-selector.tsx) for visual consistency
 * with the rest of the app's custom dropdowns.
 */
export function ModelSelectControl({
  options,
  value,
  onChange,
}: {
  options: ModelOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Model</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-w-[190px] items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors hover:border-border-strong"
        >
          <span className="truncate">{selected?.displayName ?? "Select a model"}</span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="Close model menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="listbox"
              className="card-glow absolute left-0 top-full z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-border-strong bg-surface p-1 shadow-lg"
            >
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isSelected ? "bg-primary/15" : "hover:bg-surface-hover"
                    }`}
                  >
                    <span className="truncate text-sm font-medium text-foreground">{option.displayName}</span>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
