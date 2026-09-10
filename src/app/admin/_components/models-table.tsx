"use client";

import { useState } from "react";
import { createModel, updateModel, deleteModel, setModelActive } from "@/lib/actions/model-catalog";
import { isActionError } from "@/lib/actions/action-result";
import { ModelForm, type ModelFormValues } from "./model-form";

export interface AdminModelRow extends ModelFormValues {
  id: string;
  isActive: boolean;
}

export function ModelsTable({ models }: { models: AdminModelRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const byCapability = {
    video: models.filter((m) => m.capability === "video"),
    image: models.filter((m) => m.capability === "image"),
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
        >
          {adding ? "− Cancel" : "+ Add model"}
        </button>
      </div>

      {adding && (
        <ModelForm
          submitLabel="Create model"
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            const result = await createModel(values);
            if (isActionError(result)) throw new Error(result.error);
            setAdding(false);
          }}
        />
      )}

      {(["video", "image"] as const).map((capability) => (
        <div key={capability} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">{capability}</h2>
          {byCapability[capability].length === 0 ? (
            <p className="text-sm text-muted-2">No {capability} models yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byCapability[capability].map((model) =>
                editingId === model.id ? (
                  <ModelForm
                    key={model.id}
                    initial={model}
                    submitLabel="Save changes"
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (values) => {
                      const result = await updateModel(model.id, values);
                      if (isActionError(result)) throw new Error(result.error);
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <ModelRow key={model.id} model={model} onEdit={() => setEditingId(model.id)} />
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function pricingSummary(model: AdminModelRow): string {
  if (model.creditCostMode === "flat") return `${model.flatCreditCost ?? "?"} credits / generation`;
  const base = `${model.creditsPerSecond ?? "?"} credits / second`;
  return model.creditsPerReferenceImage
    ? `${base} + ${model.creditsPerReferenceImage} / extra reference image`
    : base;
}

function ModelRow({ model, onEdit }: { model: AdminModelRow; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function toggleActive() {
    setError(null);
    setIsToggling(true);
    const result = await setModelActive(model.id, !model.isActive);
    if (isActionError(result)) {
      setError(result.error);
    }
    setIsToggling(false);
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    const result = await deleteModel(model.id);
    if (isActionError(result)) {
      setError(result.error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="card-glow flex flex-col gap-2 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{model.displayName}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{model.providerKey}</span>
            {!model.isActive && (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">Inactive</span>
            )}
          </div>
          <span className="text-xs text-muted-2">{model.providerModelId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{pricingSummary(model)}</span>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={isToggling}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong disabled:opacity-50"
          >
            {model.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:border-danger/50 hover:bg-danger/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {model.description && <p className="text-xs text-muted">{model.description}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
