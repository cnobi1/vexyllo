"use client";

const OPTIONS = [
  { value: "", label: "Auto", w: 14, h: 14 },
  { value: "16:9", label: "16:9", w: 18, h: 11 },
  { value: "9:16", label: "9:16", w: 11, h: 18 },
  { value: "1:1", label: "1:1", w: 14, h: 14 },
] as const;

export function RatioControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Aspect ratio</span>
      <div className="flex items-center gap-1">
        {OPTIONS.map((option) => (
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
