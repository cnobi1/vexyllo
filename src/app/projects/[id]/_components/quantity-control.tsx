"use client";

export function QuantityControl({
  value,
  onChange,
  max = 6,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Quantity</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-border-strong"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-medium text-foreground">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-border-strong"
        >
          +
        </button>
      </div>
      <span className="text-xs text-muted-2">up to {max} at a time</span>
    </div>
  );
}
