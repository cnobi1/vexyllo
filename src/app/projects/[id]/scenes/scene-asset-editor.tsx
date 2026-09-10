"use client";

import { useState, useTransition } from "react";
import { addSceneAsset, removeSceneAsset } from "@/lib/actions/scenes";
import { isActionError } from "@/lib/actions/action-result";
import { CharacterPicker, type CharacterOption } from "../_components/character-picker";

/**
 * Manual override for the AI-generated scene breakdown's asset picks — the
 * breakdown sometimes misses or wrongly assigns a character/location/prop
 * to a scene. Persists on every toggle (add/remove a scene_assets row), no
 * separate Save step, matching StyleSelector/setPrimaryAssetImage elsewhere
 * in this app.
 */
export function SceneAssetEditor({
  projectId,
  sceneId,
  assets,
  initialSelectedIds,
}: {
  projectId: string;
  sceneId: string;
  assets: CharacterOption[];
  initialSelectedIds: string[];
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextIds: string[]) {
    const previousIds = selectedIds;
    const added = nextIds.filter((id) => !previousIds.includes(id));
    const removed = previousIds.filter((id) => !nextIds.includes(id));
    setSelectedIds(nextIds);
    setError(null);

    startTransition(async () => {
      const results = await Promise.all([
        ...added.map((assetId) => addSceneAsset(projectId, sceneId, assetId)),
        ...removed.map((assetId) => removeSceneAsset(projectId, sceneId, assetId)),
      ]);
      const failed = results.find(isActionError);
      if (failed) {
        setSelectedIds(previousIds);
        setError(failed.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShowEditor((value) => !value)}
        className="w-fit rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        {showEditor ? "Hide edit" : "✎ Edit assets"}
      </button>
      {showEditor && (
        <>
          <CharacterPicker
            characters={assets}
            selectedIds={selectedIds}
            onChange={handleChange}
            label="Characters, locations & props in this scene"
          />
          {isPending && <span className="text-xs text-muted">Saving…</span>}
          {error && <p className="text-sm text-danger">{error}</p>}
        </>
      )}
    </div>
  );
}
