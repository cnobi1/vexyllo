"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions/projects";
import { isActionError } from "@/lib/actions/action-result";
import { SparkleIcon } from "../../_components/sparkle-icon";
import { NewProjectStyleField } from "./new-project-style-field";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Plain onSubmit (not `<form action={createProject}>`) so a failed insert
 * shows its real message — createProject now returns {error} instead of
 * throwing (see action-result.ts), which a bare form action has no way to
 * read back and display.
 */
export function CreateProjectForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createProject(formData);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      // createProjectImpl redirects to the new project on success, which
      // throws internally and propagates straight through runAction — but
      // guard with a client-side nav too in case that ever changes.
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-glow relative mx-auto flex w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-2xl p-6"
    >
      <div className="card-spotlight" aria-hidden="true" />
      <div className="relative flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <PlusIcon />
          </span>
          New project
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="title" className="text-sm text-muted">
              Title
            </label>
            <input
              id="title"
              name="title"
              placeholder="Project title, e.g. Neon Skyline"
              required
              className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
            />
          </div>
          <div className="sm:w-56">
            <NewProjectStyleField />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex w-fit items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <SparkleIcon />
          {isPending ? "Creating…" : "Create project"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
