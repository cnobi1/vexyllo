"use client";

import { useState } from "react";
import { AssetGenerateForm } from "./asset-generate-form";
import { GenerationFeed } from "./generation-feed";
import type { MediaGridItem } from "./media-grid";

/**
 * Lifts prompt-prefill state above the generate form and the feed (siblings
 * under the server component) so clicking "Edit & regenerate" on a
 * generated image below can populate the form above it. Same pattern as
 * images-workspace.tsx. Shared by the inline "Generate" accordion on each
 * card in the Characters list and the Scenes Assets tab — there is no
 * separate asset detail page; every asset (character/location/prop) is
 * created, edited, and generated inline in its list.
 */
export function AssetGenerationWorkspace({
  projectId,
  assetId,
  initialItems,
  columns,
  showPrompt,
}: {
  projectId: string;
  assetId: string;
  initialItems: (MediaGridItem & { kind: string; asset_id?: string | null; created_at: string })[];
  columns?: 2 | 3;
  /** Set false when the prompt is already shown/editable elsewhere (e.g. the Assets tab's own description field). Defaults true. */
  showPrompt?: boolean;
}) {
  const [prefill, setPrefill] = useState<{ value: string; nonce: number } | null>(null);

  return (
    <>
      <AssetGenerateForm projectId={projectId} assetId={assetId} prefill={prefill} />
      <GenerationFeed
        projectId={projectId}
        kinds={["character_sheet"]}
        assetId={assetId}
        initialItems={initialItems}
        emptyLabel="No generations yet — describe it above."
        columns={columns}
        showPrompt={showPrompt}
        onEditPrompt={(prompt) => setPrefill({ value: prompt, nonce: Date.now() })}
      />
    </>
  );
}
