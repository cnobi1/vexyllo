"use client";

import { useState } from "react";
import { AssetGenerateForm } from "./asset-generate-form";
import { AssetUploadForm } from "./asset-upload-form";
import { GenerationFeed } from "./generation-feed";
import type { MediaGridItem } from "./media-grid";

/**
 * Lifts prompt-prefill state above the generate form and the feed (siblings
 * under the server component) so clicking "Edit & regenerate" on a
 * generated image below can populate the form above it. Same pattern as
 * images-workspace.tsx. Used by the inline "Generate" accordion on each
 * card in the Scenes Assets tab only — the Characters tab has its own
 * separate, simpler RegenerateForm rather than this component. There is no
 * separate asset detail page; every asset (character/location/prop) is
 * created, edited, and generated inline in its list.
 */
export function AssetGenerationWorkspace({
  projectId,
  assetId,
  initialItems,
  columns,
  showPrompt,
  onPendingChange,
}: {
  projectId: string;
  assetId: string;
  initialItems: (MediaGridItem & { kind: string; asset_id?: string | null; created_at: string })[];
  columns?: 2 | 3;
  /** Set false when the prompt is already shown/editable elsewhere (e.g. the Assets tab's own description field). Defaults true. */
  showPrompt?: boolean;
  /** Passed straight through to GenerationFeed — lets a caller (e.g. AssetsList's card) show a generating indicator on the asset's main image, outside this workspace's own collapsed accordion. */
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [prefill, setPrefill] = useState<{ value: string; nonce: number } | null>(null);
  const [mode, setMode] = useState<"generate" | "upload">("generate");

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("generate")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "generate"
              ? "border-border-strong bg-primary/15 text-foreground"
              : "border-border text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "upload"
              ? "border-border-strong bg-primary/15 text-foreground"
              : "border-border text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          Upload image
        </button>
      </div>
      {mode === "generate" ? (
        <AssetGenerateForm projectId={projectId} assetId={assetId} prefill={prefill} />
      ) : (
        <AssetUploadForm projectId={projectId} assetId={assetId} />
      )}
      <GenerationFeed
        projectId={projectId}
        kinds={["character_sheet"]}
        assetId={assetId}
        initialItems={initialItems}
        emptyLabel="No generations yet — describe it above."
        columns={columns}
        showPrompt={showPrompt}
        onEditPrompt={(prompt) => setPrefill({ value: prompt, nonce: Date.now() })}
        onPendingChange={onPendingChange}
      />
    </>
  );
}
