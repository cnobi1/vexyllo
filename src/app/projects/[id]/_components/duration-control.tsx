"use client";

export function DurationControl({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="duration-seconds" className="text-sm text-muted">
        Duration
      </label>
      <input
        id="duration-seconds"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="w-20 rounded-lg border border-border bg-background/60 px-2 py-1 text-sm text-foreground outline-none focus:border-border-strong"
      />
      <span className="text-xs text-muted-2">
        seconds ({min}–{max})
      </span>
    </div>
  );
}
