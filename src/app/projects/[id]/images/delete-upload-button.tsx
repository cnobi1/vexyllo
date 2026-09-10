"use client";

import { useTransition } from "react";
import { deleteUpload } from "@/lib/actions/uploads";
import { isActionError } from "@/lib/actions/action-result";

export function DeleteUploadButton({ projectId, uploadId }: { projectId: string; uploadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteUpload(projectId, uploadId);
          if (isActionError(result)) {
            window.alert(result.error);
            return;
          }
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
