"use client";

const OPTIONS = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
] as const;

export function ResolutionControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Resolution</span>
      <div className="flex items-center gap-1">
        {OPTIONS.map((option) => (
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
