"use client";

import { generateScriptFromIdea, editScriptWithAI, updateProject, restoreOriginalScript } from "@/lib/actions/projects";
import { useActionForm } from "@/app/_components/use-action-form";
import { useTextLimits } from "@/app/_components/use-text-limits";
import { SubmitButton } from "./submit-button";
import { ScriptEditor } from "./script-editor";

export function WriteScriptForm({
  projectId,
  hasScript,
  ideaDefault,
}: {
  projectId: string;
  hasScript: boolean;
  ideaDefault?: string;
}) {
  const [state, formAction] = useActionForm(generateScriptFromIdea.bind(null, projectId));
  const limits = useTextLimits();

  return (
    <form action={formAction} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-foreground">Write with AI</h2>
      <p className="text-sm text-muted">
        Describe your idea and the agent will write a title and a full script — scene headings, action, and
        character dialogue — ready to storyboard.
        {hasScript && " This replaces the title and script below."}
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="idea" className="text-sm text-muted">
          Idea
        </label>
        <textarea
          id="idea"
          name="idea"
          required
          rows={4}
          maxLength={limits.idea}
          defaultValue={ideaDefault}
          placeholder="e.g. A lonely lighthouse keeper finds a message in a bottle that changes everything…"
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="length" className="text-sm text-muted">
          Length
        </label>
        <select
          id="length"
          name="length"
          defaultValue="short"
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
        >
          <option value="short">Short film (a few scenes)</option>
          <option value="feature">Feature-length movie (full three-act structure)</option>
        </select>
      </div>
      <SubmitButton label={hasScript ? "✦ Regenerate Script" : "✦ Generate Script"} pendingLabel="Writing…" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function EditScriptForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionForm(editScriptWithAI.bind(null, projectId));
  const limits = useTextLimits();

  return (
    <form action={formAction} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-foreground">Edit with AI</h2>
      <p className="text-sm text-muted">
        Tell the agent what to change and it will rewrite the script below in place — e.g. turn this into a
        Nigerian movie and it will localize character names, locations, and dialogue while keeping the story. Your
        previous version stays recoverable below.
      </p>
      <textarea
        id="ai_edit_instructions"
        name="instructions"
        required
        rows={3}
        maxLength={limits.instructions}
        placeholder='e.g. "Make this a Nigerian movie — change the characters&apos; names and the locations to reflect Nigeria"'
        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
      />
      <SubmitButton label="✦ Apply AI Edit" pendingLabel="Rewriting…" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function UpdateProjectForm({
  projectId,
  title,
  scriptText,
}: {
  projectId: string;
  title: string;
  scriptText: string;
}) {
  const [state, formAction] = useActionForm(updateProject.bind(null, projectId));
  const limits = useTextLimits();

  return (
    <form action={formAction} className="card-glow flex flex-col gap-4 rounded-2xl p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-muted">
          Title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          maxLength={limits.name}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="script_text" className="text-sm text-muted">
          Script
        </label>
        <ScriptEditor
          id="script_text"
          name="script_text"
          defaultValue={scriptText}
          rows={16}
          maxLength={limits.script_text}
          placeholder="Paste or write your script here…"
        />
      </div>
      <SubmitButton label="Save" pendingLabel="Saving…" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function RestoreOriginalForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionForm(restoreOriginalScript.bind(null, projectId));

  return (
    <form action={formAction} className="card-glow flex flex-col gap-2 rounded-2xl p-6">
      <p className="text-sm text-muted">
        You have a pre-enhancement backup of this script saved, in case the AI got something wrong.
      </p>
      <SubmitButton
        label="Restore original (pre-AI) text"
        pendingLabel="Restoring…"
        className="self-start rounded-full border border-border-strong px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
      />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
