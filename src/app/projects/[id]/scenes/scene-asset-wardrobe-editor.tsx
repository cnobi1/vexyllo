"use client";

import { useState, useTransition } from "react";
import { updateSceneAssetWardrobe } from "@/lib/actions/scenes";
import { isActionError } from "@/lib/actions/action-result";
import { useTextLimits } from "@/app/_components/use-text-limits";

/**
 * Manual correction for one character's wardrobe note within one scene
 * (a single scene_assets row) — same edit-toggle-then-save shape as
 * SceneDialogueEditor, just sized for the compact asset chip it lives
 * inside rather than the full card width.
 */
export function SceneAssetWardrobeEditor({
  projectId,
  sceneId,
  assetId,
  initialWardrobeNote,
}: {
  projectId: string;
  sceneId: string;
  assetId: string;
  initialWardrobeNote: string | null;
}) {
  const [wardrobeNote, setWardrobeNote] = useState(initialWardrobeNote ?? "");
  const [draft, setDraft] = useState(wardrobeNote);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const limits = useTextLimits();

  function startEditing() {
    setDraft(wardrobeNote);
    setError(null);
    setIsEditing(true);
  }

  function cancel() {
    setError(null);
    setIsEditing(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateSceneAssetWardrobe(projectId, sceneId, assetId, draft);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      setWardrobeNote(draft.trim());
      setIsEditing(false);
    });
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="max-w-[220px] text-left text-muted hover:text-foreground hover:underline"
      >
        {wardrobeNote || "+ Add wardrobe note"}
      </button>
    );
  }

  return (
    <div className="flex w-[220px] flex-col gap-1.5">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={2}
        maxLength={limits.note}
        placeholder="What are they wearing in this scene?"
        className="rounded-lg border border-border bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-border-strong"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="btn-primary rounded-full px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
