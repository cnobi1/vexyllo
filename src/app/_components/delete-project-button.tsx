"use client";

import { useRef, useState } from "react";
import { deleteProject } from "@/lib/actions/projects";
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
 * A per-card delete affordance for the home page's project grid. Submits
 * through a real <form action={deleteProject}> (same mechanism as the
 * project sidebar's own delete button) rather than calling the server
 * action directly from a click handler, so deleteProject's redirect("/")
 * is handled the same proven way in both places. The confirm step matters
 * more here than in the sidebar: this button sits on a dense grid of other
 * projects, one misclick away, rather than behind a dedicated project page.
 */
export function DeleteProjectButton({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const deleteProjectWithId = deleteProject.bind(null, projectId);

  return (
    <>
      <form ref={formRef} action={deleteProjectWithId}>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${projectTitle}`}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 text-muted opacity-0 backdrop-blur-sm transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <TrashIcon />
        </button>
      </form>
      {confirming && (
        <ConfirmDialog
          title="Delete this project?"
          description={`This permanently deletes "${projectTitle}" and everything in it — scenes, characters, generated images and videos, uploads. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            setConfirming(false);
            formRef.current?.requestSubmit();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
