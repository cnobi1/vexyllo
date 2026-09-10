"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createAsset } from "@/lib/actions/assets";
import { isActionError } from "@/lib/actions/action-result";

/** Plain onSubmit (not `<form action={createAsset}>`) so a failed insert shows its real message. */
export function CreateCharacterForm({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await createAsset(projectId, formData);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <input type="hidden" name="type" value="character" />
      <input
        name="name"
        placeholder="Character name"
        required
        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
      />
      <textarea
        name="description"
        placeholder="Description — appearance, personality, wardrobe…"
        rows={2}
        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Creating…" : "✦ Create character"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
