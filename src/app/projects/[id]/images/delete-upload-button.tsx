"use client";

import { useTransition } from "react";
import { deleteUpload } from "@/lib/actions/uploads";

export function DeleteUploadButton({ projectId, uploadId }: { projectId: string; uploadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteUpload(projectId, uploadId);
          // See image-generate-form.tsx's handleFileUpload — router.refresh() has proven unreliable here.
          window.location.reload();
        })
      }
      className="text-xs font-medium text-danger disabled:opacity-50"
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}
