"use client";

import { useState, useTransition } from "react";
import type { ModelCatalogInput } from "@/lib/actions/model-catalog";
import { useTextLimits } from "@/app/_components/use-text-limits";

export type ModelFormValues = ModelCatalogInput;

const RESOLUTION_KEYS = ["480p", "720p", "1080p", "4k"] as const;

function emptyValues(capability: "image" | "video"): ModelFormValues {
  return {
    capability,
    providerKey: "mock",
    providerModelId: "",
    displayName: "",
    description: "",
    creditCostMode: capability === "image" ? "flat" : "duration_multiplier",
    flatCreditCost: capability === "image" ? 2 : null,
    creditsPerSecond: capability === "video" ? 3 : null,
    resolutionCostMultiplier: null,
    creditsPerReferenceImage: null,
    allowedDurations: capability === "video" ? { min: 2, max: 12 } : null,
    allowedResolutions: capability === "video" ? ["480p", "720p", "1080p"] : null,
    allowedRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: false,
    supportsReferenceImages: false,
    maxReferenceImages: null,
    sortOrder: 0,
  };
}

function parseList(value: string): string[] | null {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/** Shared create/edit form — a Server Action `onSubmit` is passed in so this component doesn't need to know whether it's creating or updating. */
export function ModelForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: ModelFormValues;
  onSubmit: (values: ModelFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ModelFormValues>(initial ?? emptyValues("video"));
  const [resolutionMultiplierText, setResolutionMultiplierText] = useState<Record<string, string>>(() => {
    const table = initial?.resolutionCostMultiplier ?? {};
    return Object.fromEntries(RESOLUTION_KEYS.map((key) => [key, table[key] != null ? String(table[key]) : ""]));
  });
  const [allowedResolutionsText, setAllowedResolutionsText] = useState(
    (initial?.allowedResolutions ?? []).join(", "),
  );
  const [allowedRatiosText, setAllowedRatiosText] = useState((initial?.allowedRatios ?? []).join(", "));
  const [durationMin, setDurationMin] = useState(String(initial?.allowedDurations?.min ?? ""));
  const [durationMax, setDurationMax] = useState(String(initial?.allowedDurations?.max ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const limits = useTextLimits();

  function set<K extends keyof ModelFormValues>(key: K, value: ModelFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.providerModelId.trim() || !values.displayName.trim()) {
      setError("Provider model id and display name are required.");
      return;
    }

    const resolutionCostMultiplier: Record<string, number> = {};
    for (const key of RESOLUTION_KEYS) {
      const raw = resolutionMultiplierText[key];
      if (raw?.trim()) resolutionCostMultiplier[key] = Number(raw);
    }

    const min = Number(durationMin);
    const max = Number(durationMax);

    const payload: ModelFormValues = {
      ...values,
      resolutionCostMultiplier: Object.keys(resolutionCostMultiplier).length > 0 ? resolutionCostMultiplier : null,
      allowedDurations: durationMin && durationMax ? { min, max } : null,
      allowedResolutions: parseList(allowedResolutionsText),
      allowedRatios: parseList(allowedRatiosText),
    };

    startTransition(async () => {
      try {
        await onSubmit(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save model");
      }
    });
  }

  const isVideo = values.capability === "video";

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-col gap-4 rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Capability">
          <select
            value={values.capability}
            onChange={(e) => {
              const capability = e.target.value as "image" | "video";
              set("capability", capability);
              set("creditCostMode", capability === "image" ? "flat" : "duration_multiplier");
            }}
            className="input"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </Field>
        <Field label="Provider">
          <select value={values.providerKey} onChange={(e) => set("providerKey", e.target.value as ModelFormValues["providerKey"])} className="input">
            <option value="mock">Mock</option>
            <option value="byteplus">BytePlus</option>
            <option value="gateway">Gateway</option>
            {isVideo && <option value="alibaba">Alibaba (DashScope)</option>}
          </select>
        </Field>
        <Field label="Provider model id">
          <input
            value={values.providerModelId}
            onChange={(e) => set("providerModelId", e.target.value)}
            placeholder="e.g. wan3.0-video-prime"
            maxLength={limits.technical_id}
            className="input"
          />
        </Field>
        <Field label="Display name">
          <input
            value={values.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            maxLength={limits.name}
            className="input"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={values.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={limits.description}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pricing mode">
          <select value={values.creditCostMode} onChange={(e) => set("creditCostMode", e.target.value as ModelFormValues["creditCostMode"])} className="input">
            <option value="flat">Flat per generation</option>
            <option value="duration_multiplier">Duration × resolution</option>
          </select>
        </Field>
        {values.creditCostMode === "flat" ? (
          <Field label="Credits per generation">
            <input
              type="number"
              step="0.01"
              value={values.flatCreditCost ?? ""}
              onChange={(e) => set("flatCreditCost", e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>
        ) : (
          <Field label="Credits per second">
            <input
              type="number"
              step="0.01"
              value={values.creditsPerSecond ?? ""}
              onChange={(e) => set("creditsPerSecond", e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>
        )}
      </div>

      {values.creditCostMode === "duration_multiplier" && (
        <Field label="Resolution cost multiplier (blank = use the default table)">
          <div className="grid grid-cols-4 gap-2">
            {RESOLUTION_KEYS.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs text-muted-2">{key}</span>
                <input
                  type="number"
                  step="0.01"
                  value={resolutionMultiplierText[key] ?? ""}
                  onChange={(e) => setResolutionMultiplierText((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="input"
                />
              </div>
            ))}
          </div>
        </Field>
      )}

      {values.creditCostMode === "duration_multiplier" && (
        <Field label="Credits per extra reference image (charged for each reference/source image beyond the first; blank = use the default)">
          <input
            type="number"
            step="0.01"
            value={values.creditsPerReferenceImage ?? ""}
            onChange={(e) => set("creditsPerReferenceImage", e.target.value ? Number(e.target.value) : null)}
            className="input w-32"
          />
        </Field>
      )}

      {isVideo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min duration (seconds)">
              <input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className="input" />
            </Field>
            <Field label="Max duration (seconds)">
              <input type="number" value={durationMax} onChange={(e) => setDurationMax(e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="Allowed resolutions (comma-separated)">
            <input
              value={allowedResolutionsText}
              onChange={(e) => setAllowedResolutionsText(e.target.value)}
              placeholder="480p, 720p, 1080p"
              maxLength={limits.description}
              className="input"
            />
          </Field>
        </>
      )}

      <Field label="Allowed ratios (comma-separated, blank = any)">
        <input
          value={allowedRatiosText}
          onChange={(e) => setAllowedRatiosText(e.target.value)}
          placeholder="16:9, 9:16, 1:1"
          maxLength={limits.description}
          className="input"
        />
      </Field>

      {isVideo && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={values.supportsImageToVideo ?? false}
              onChange={(e) => set("supportsImageToVideo", e.target.checked)}
            />
            Supports image-to-video
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={values.supportsReferenceImages ?? false}
              onChange={(e) => set("supportsReferenceImages", e.target.checked)}
            />
            Supports reference images
          </label>
          <Field label="Max reference images">
            <input
              type="number"
              value={values.maxReferenceImages ?? ""}
              onChange={(e) => set("maxReferenceImages", e.target.value ? Number(e.target.value) : null)}
              className="input w-24"
            />
          </Field>
        </div>
      )}

      <Field label="Sort order (lower shows first; models default to the lowest active row)">
        <input
          type="number"
          value={values.sortOrder ?? 0}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
          className="input w-24"
        />
      </Field>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-border-strong">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isPending} className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      <span className="text-xs text-muted-2">{label}</span>
      {children}
    </label>
  );
}
