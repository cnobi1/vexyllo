"use client";

const DEFAULT_OPTIONS = [
  { value: "", label: "Auto", w: 14, h: 14 },
  { value: "16:9", label: "16:9", w: 18, h: 11 },
  { value: "9:16", label: "9:16", w: 11, h: 18 },
  { value: "1:1", label: "1:1", w: 14, h: 14 },
] as const;

const MAX_ICON_SIDE = 18;
const MIN_ICON_SIDE = 8;

/** Derives an icon size for a ratio not in DEFAULT_OPTIONS (e.g. a model-specific "adaptive"/"21:9") by parsing "W:H". */
function iconSizeFor(ratio: string): { w: number; h: number } {
  const known = DEFAULT_OPTIONS.find((option) => option.value === ratio);
  if (known) return { w: known.w, h: known.h };
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return { w: 14, h: 14 };
  const scale = MAX_ICON_SIDE / Math.max(w, h);
  return {
    w: Math.max(MIN_ICON_SIDE, Math.round(w * scale)),
    h: Math.max(MIN_ICON_SIDE, Math.round(h * scale)),
  };
}

/** `options` lets the selected model's own allowedRatios (see generation_models) narrow the choices — omit to fall back to the historical fixed set. */
export function RatioControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[] | null;
}) {
  const resolvedOptions = options?.length
    ? options.map((ratio) => ({ value: ratio, label: ratio === "adaptive" ? "Auto" : ratio, ...iconSizeFor(ratio) }))
    : DEFAULT_OPTIONS;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Aspect ratio</span>
      <div className="flex items-center gap-1">
        {resolvedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? "border-border-strong bg-primary/15 text-foreground"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            <span
              className="rounded-[2px] border border-current opacity-70"
              style={{ width: option.w, height: option.h }}
            />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
