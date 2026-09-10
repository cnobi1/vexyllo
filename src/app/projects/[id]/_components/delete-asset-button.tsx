"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAsset } from "@/lib/actions/assets";
import { isActionError } from "@/lib/actions/action-result";
import { ConfirmDialog } from "../../../_components/confirm-dialog";

export function DeleteAssetButton({
  projectId,
  assetId,
  redirectTo,
  label = "Delete",
  className,
}: {
  projectId: string;
  assetId: string;
  /** Navigate here after a successful delete — needed on the standalone detail page, since the asset it's showing is now gone. Omit to stay put (e.g. an inline list, where revalidation alone is enough). */
  redirectTo?: string;
  label?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const result = await deleteAsset(projectId, assetId);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirming(true)}
        className={
          className ??
          "rounded-full border border-danger/30 px-4 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
        }
      >
        {isPending ? "Deleting…" : label}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {confirming && (
        <ConfirmDialog
          title="Delete this asset?"
          description="This removes it and its generated images. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
