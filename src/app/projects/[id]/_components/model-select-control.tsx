"use client";

export interface ModelOption {
  /** generation_models.id — what actually gets submitted to the server action. */
  id: string;
  displayName: string;
  description?: string | null;
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

// A <select> rather than the button-row pattern ResolutionControl/RatioControl
// use — those have a fixed, tiny option set; the model catalog is expected
// to keep growing past what a button row scales to.
export function ModelSelectControl({
  options,
  value,
  onChange,
}: {
  options: ModelOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="model-select" className="text-sm text-muted">
        Model
      </label>
      <select
        id="model-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
