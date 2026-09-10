"use client";

import { useRef, useState, type FormEvent } from "react";
import { enhanceScriptFromUpload } from "@/lib/actions/projects";
import { useActionForm } from "@/app/_components/use-action-form";
import { SubmitButton } from "./submit-button";

/**
 * Neither the file input nor the pasted-script textarea can be `required`
 * on its own (either one alone satisfies the form), so an empty submission
 * of both was reaching enhanceScriptFromUpload — guarded client-side before
 * the request ever goes out, same as any other client-side form validation.
 * A genuine server-side failure (bad file, LLM error, etc.) now surfaces via
 * useActionForm's returned {error} instead of a thrown, production-redacted
 * exception — see action-result.ts.
 */
export function EnhanceScriptForm({ projectId }: { projectId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pastedRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction] = useActionForm(enhanceScriptFromUpload.bind(null, projectId));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const hasFile = (fileRef.current?.files?.length ?? 0) > 0;
    const hasPasted = Boolean(pastedRef.current?.value.trim());
    if (!hasFile && !hasPasted) {
      event.preventDefault();
      setError("Upload a script file or paste script text to enhance.");
      return;
    }
    setError(null);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="card-glow flex flex-col gap-3 rounded-2xl p-6"
    >
      <h2 className="text-base font-semibold text-foreground">Upload &amp; Enhance</h2>
      <p className="text-sm text-muted">
        Already have a script? Upload it or paste it in, and the agent will punch up
        dialogue, tighten pacing, and fix formatting — without changing your story. Your
        original stays recoverable from the Edit tab.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm text-muted">
          Script file
        </label>
        <input
          ref={fileRef}
          id="file"
          name="file"
          type="file"
          accept=".txt,.fountain,.pdf,.docx"
          onChange={() => error && setError(null)}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary/15 file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground focus:border-border-strong"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pasted_script" className="text-sm text-muted">
          Or paste your script
        </label>
        <textarea
          ref={pastedRef}
          id="pasted_script"
          name="pasted_script"
          rows={8}
          onChange={() => error && setError(null)}
          placeholder="Paste your script text here instead of uploading a file…"
          className="rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="instructions" className="text-sm text-muted">
          What should the agent focus on? (optional)
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={2}
          placeholder="e.g. Tighten the pacing in Act 2, make the dialogue punchier…"
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
      </div>
      {(error ?? state?.error) && <p className="text-sm text-danger">{error ?? state?.error}</p>}
      <SubmitButton label="✦ Enhance Script" pendingLabel="Enhancing…" />
    </form>
  );
}
