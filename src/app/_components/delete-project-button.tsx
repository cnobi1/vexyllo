"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "@/lib/actions/projects";
import { isActionError } from "@/lib/actions/action-result";
import { ConfirmDialog } from "./confirm-dialog";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[15px] w-[15px]">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A per-card delete affordance for the home page's project grid. The confirm
 * step matters more here than elsewhere: this button sits on a dense grid of
 * other projects, one misclick away, rather than behind a dedicated project page.
 */
export function DeleteProjectButton({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      // deleteProjectImpl redirects to /dashboard on success (its own
      // thrown "NEXT_REDIRECT" propagates straight through runAction) —
      // this only ever resolves to an {error} value for a genuine failure.
      const result = await deleteProject(projectId);
      if (isActionError(result)) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${projectTitle}`}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 text-muted opacity-0 backdrop-blur-sm transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
      >
        <TrashIcon />
      </button>
      {error && (
        <p className="absolute right-3 top-14 z-10 max-w-[200px] rounded-lg bg-background/90 px-2 py-1 text-xs text-danger backdrop-blur-sm">
          {error}
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          title="Delete this project?"
          description={`This permanently deletes "${projectTitle}" and everything in it — scenes, characters, generated images and videos, uploads. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
