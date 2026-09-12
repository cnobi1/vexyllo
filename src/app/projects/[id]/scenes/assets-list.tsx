"use client";

import { useRef, useState } from "react";
import { updateAsset } from "@/lib/actions/assets";
import { autofillAssetImages } from "@/lib/actions/media";
import { useActionForm } from "@/app/_components/use-action-form";
import { SubmitButton } from "../_components/submit-button";
import { DeleteAssetButton } from "../_components/delete-asset-button";
import { ExpandableTextarea } from "../_components/expandable-textarea";
import { AssetGenerationWorkspace } from "../_components/asset-generation-workspace";
import { ZoomableImage } from "../_components/zoomable-image";
import { useAssetPrimaryImage } from "../_components/use-asset-primary-image";
import type { MediaGridItem } from "../_components/media-grid";
import { useTextLimits } from "@/app/_components/use-text-limits";

const SECTION_ORDER = ["character", "location", "prop"] as const;
const SECTION_LABEL: Record<string, string> = { character: "Characters", location: "Locations", prop: "Props" };
const ASSET_TYPE_LABEL: Record<string, string> = { character: "Character", location: "Location", prop: "Prop" };

type Asset = { id: string; type: string; name: string; description: string | null };
type Generation = MediaGridItem & { kind: string; asset_id?: string | null; created_at: string };

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Overview of every character/location/prop extracted from the script, with
 * inline name/description editing — this is the only place a location or
 * prop can be renamed or re-described (Characters is a character-only
 * management page). Each card also has its own "Generate" accordion
 * (AssetGenerationWorkspace, shared with the character detail page) and each
 * section header has an "Autofill" button (autofillAssetImages) that
 * one-shot generates a reference image for every asset of that type still
 * missing one, so a full breakdown doesn't require opening every card by hand.
 */
export function AssetsList({
  projectId,
  assets,
  imageUrlByAsset,
  generationsByAsset,
}: {
  projectId: string;
  assets: Asset[];
  imageUrlByAsset: Record<string, string>;
  generationsByAsset: Record<string, Generation[]>;
}) {
  const groups = SECTION_ORDER.map((type) => ({
    type,
    assets: assets.filter((asset) => asset.type === type),
  })).filter((group) => group.assets.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.type} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{SECTION_LABEL[group.type] ?? `${group.type}s`}</h3>
            <AutofillButton projectId={projectId} type={group.type} />
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.assets.map((asset) => (
              <AssetCard
                key={asset.id}
                projectId={projectId}
                asset={asset}
                imageUrl={imageUrlByAsset[asset.id] ?? null}
                initialGenerations={generationsByAsset[asset.id] ?? []}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AutofillButton({ projectId, type }: { projectId: string; type: string }) {
  const [state, formAction] = useActionForm(autofillAssetImages.bind(null, projectId, type));

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <SubmitButton
          label="✦ Autofill images"
          pendingLabel="Autofilling…"
          className="btn-primary rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        />
      </form>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

function AssetCard({
  projectId,
  asset,
  imageUrl: initialImageUrl,
  initialGenerations,
}: {
  projectId: string;
  asset: Asset;
  imageUrl: string | null;
  initialGenerations: Generation[];
}) {
  const [description, setDescription] = useState(asset.description ?? "");
  const [showGenerate, setShowGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(() => initialGenerations.some((g) => g.status === "pending"));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageUrl = useAssetPrimaryImage(projectId, asset.id, initialImageUrl);
  const [saveState, saveAction] = useActionForm(updateAsset.bind(null, projectId, asset.id));
  const limits = useTextLimits();

  return (
    <li className="card-glow flex flex-col gap-3 rounded-xl p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border-strong bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
            {ASSET_TYPE_LABEL[asset.type] ?? asset.type}
          </span>
          <span className="font-medium text-foreground">{asset.name}</span>
        </div>
        <DeleteAssetButton
          projectId={projectId}
          assetId={asset.id}
          className="rounded-full border border-danger/30 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
        />
      </div>

      {imageUrl ? (
        <div className="relative">
          <ZoomableImage url={imageUrl} alt={asset.name} />
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/70 text-xs font-medium text-foreground backdrop-blur-sm">
              <SpinnerIcon />
              Generating…
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-2">
          {isGenerating ? (
            <span className="flex items-center gap-2 text-foreground">
              <SpinnerIcon />
              Generating…
            </span>
          ) : (
            "No image yet"
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowGenerate((prev) => !prev)}
        className="btn-primary self-stretch rounded-full px-4 py-1.5 text-xs font-medium text-white"
      >
        {showGenerate ? "Hide generate" : isGenerating ? "✦ Generate (in progress…)" : "✦ Generate"}
      </button>

      {showGenerate && (
        <div className="flex flex-col gap-3">
          <AssetGenerationWorkspace
            projectId={projectId}
            assetId={asset.id}
            initialItems={initialGenerations}
            columns={2}
            showPrompt={false}
            onPendingChange={setIsGenerating}
          />
        </div>
      )}

      <form action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="name" value={asset.name} />
        <ExpandableTextarea
          ref={textareaRef}
          name="description"
          value={description}
          onChange={setDescription}
          placeholder="Describe its appearance…"
          maxLength={limits.prompt}
        />
        <SubmitButton
          label="Save"
          pendingLabel="Saving…"
          className="self-start rounded-full border border-border-strong bg-primary/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 disabled:opacity-50"
        />
        {saveState?.error && <p className="text-xs text-danger">{saveState.error}</p>}
      </form>
    </li>
  );
}
