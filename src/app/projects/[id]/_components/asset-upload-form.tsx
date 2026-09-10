"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { uploadAssetImage } from "@/lib/actions/assets";
import { isActionError } from "@/lib/actions/action-result";

/**
 * Alternative to AssetGenerateForm for a user who already has a
 * character/location/prop image made outside the platform. Single file,
 * no variant picker — an upload always replaces whatever image the asset
 * is currently showing (see uploadAssetImage).
 */
export function AssetUploadForm({ projectId, assetId }: { projectId: string; assetId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same filename later
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAssetImage(projectId, assetId, formData);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      // The realtime hook behind each card's thumbnail only listens for
      // generations UPDATE events — an upload has no generation row, so
      // it wouldn't otherwise be picked up. Same reload workaround
      // image-generate-form.tsx already uses for the identical reason.
      window.location.reload();
    });
  }

  return (
    <div className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <p className="text-sm text-muted">Bring in a reference image generated elsewhere.</p>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          disabled={isPending}
          onChange={handleFileChange}
          className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:opacity-50"
        />
        {isPending && <span className="text-xs text-muted">Uploading…</span>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
