"use client";

import { useState, useTransition } from "react";
import { updateSceneDialogue } from "@/lib/actions/scenes";
import { isActionError } from "@/lib/actions/action-result";
import { useTextLimits } from "@/app/_components/use-text-limits";

/**
 * Manual correction for the AI breakdown's dialogue extraction — collapsed
 * behind an "Edit" toggle, matching SceneAssetEditor's pattern in this same
 * tab. Persists on Save via updateSceneDialogue, not per-keystroke, since
 * unlike an asset toggle this is free text worth letting the customer
 * finish typing before it round-trips.
 */
export function SceneDialogueEditor({
  projectId,
  sceneId,
  initialDialogue,
}: {
  projectId: string;
  sceneId: string;
  initialDialogue: string | null;
}) {
  const [dialogue, setDialogue] = useState(initialDialogue ?? "");
  const [draft, setDraft] = useState(dialogue);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const limits = useTextLimits();

  function startEditing() {
    setDraft(dialogue);
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
      const result = await updateSceneDialogue(projectId, sceneId, draft);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      setDialogue(draft.trim());
      setIsEditing(false);
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs italic text-muted">{dialogue || "No dialogue for this scene."}</p>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        maxLength={limits.prompt}
        placeholder="Dialogue for this scene…"
        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-foreground outline-none focus:border-border-strong"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="btn-primary rounded-full px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
