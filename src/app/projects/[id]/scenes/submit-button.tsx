"use client";

import { useFormStatus } from "react-dom";

export function GenerateButton({ hasScenes }: { hasScenes: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Generating…" : hasScenes ? "✦ Regenerate Scenes" : "✦ Generate Scenes"}
    </button>
  );
}
