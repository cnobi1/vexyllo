"use client";

const DEFAULT_OPTIONS = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
] as const;

/** `options` lets the selected model's own allowedResolutions (see generation_models) narrow the choices — omit to fall back to the historical fixed set. */
export function ResolutionControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[] | null;
}) {
  const resolvedOptions = options?.length ? options.map((value) => ({ value, label: value })) : DEFAULT_OPTIONS;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Resolution</span>
      <div className="flex items-center gap-1">
        {resolvedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? "border-border-strong bg-primary/15 text-foreground"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
