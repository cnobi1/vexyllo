import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateProject,
  generateScriptFromIdea,
  enhanceScriptFromUpload,
  editScriptWithAI,
  restoreOriginalScript,
} from "@/lib/actions/projects";
import { SubmitButton } from "./_components/submit-button";
import { ScriptEditor } from "./_components/script-editor";
import { EnhanceScriptForm } from "./_components/enhance-script-form";
import { ScriptTabs } from "./script-tabs";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ idea?: string }>;
}) {
  const { id } = await params;
  const { idea: ideaFromHero } = await searchParams;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, script_text, original_script_text")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const updateProjectWithId = updateProject.bind(null, project.id);
  const generateScriptFromIdeaWithId = generateScriptFromIdea.bind(null, project.id);
  const enhanceScriptFromUploadWithId = enhanceScriptFromUpload.bind(null, project.id);
  const editScriptWithAIWithId = editScriptWithAI.bind(null, project.id);
  const restoreOriginalScriptWithId = restoreOriginalScript.bind(null, project.id);
  const hasScript = Boolean(project.script_text?.trim());
  const hasBackup = Boolean(project.original_script_text?.trim());

  const writePanel = (
    <form
      action={generateScriptFromIdeaWithId}
      className="card-glow flex flex-col gap-3 rounded-2xl p-6"
    >
      <h2 className="text-base font-semibold text-foreground">Write with AI</h2>
      <p className="text-sm text-muted">
        Describe your idea and the agent will write a title and a full script — scene
        headings, action, and character dialogue — ready to storyboard.
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
          defaultValue={ideaFromHero}
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
      <SubmitButton
        label={hasScript ? "✦ Regenerate Script" : "✦ Generate Script"}
        pendingLabel="Writing…"
      />
    </form>
  );

  const enhancePanel = <EnhanceScriptForm action={enhanceScriptFromUploadWithId} />;

  const editPanel = (
    <div className="flex flex-col gap-3">
      {hasScript && (
        <form
          action={editScriptWithAIWithId}
          className="card-glow flex flex-col gap-3 rounded-2xl p-6"
        >
          <h2 className="text-base font-semibold text-foreground">Edit with AI</h2>
          <p className="text-sm text-muted">
            Tell the agent what to change and it will rewrite the script below in place —
            e.g. turn this into a Nigerian movie and it will localize character names,
            locations, and dialogue while keeping the story. Your previous version stays
            recoverable below.
          </p>
          <textarea
            id="ai_edit_instructions"
            name="instructions"
            required
            rows={3}
            placeholder='e.g. "Make this a Nigerian movie — change the characters&apos; names and the locations to reflect Nigeria"'
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
          />
          <SubmitButton label="✦ Apply AI Edit" pendingLabel="Rewriting…" />
        </form>
      )}

      <form action={updateProjectWithId} className="card-glow flex flex-col gap-4 rounded-2xl p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm text-muted">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={project.title}
            required
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
            defaultValue={project.script_text ?? ""}
            rows={16}
            placeholder="Paste or write your script here…"
          />
        </div>
        <SubmitButton label="Save" pendingLabel="Saving…" />
      </form>

      {hasBackup && (
        <form
          action={restoreOriginalScriptWithId}
          className="card-glow flex flex-col gap-2 rounded-2xl p-6"
        >
          <p className="text-sm text-muted">
            You have a pre-enhancement backup of this script saved, in case the AI got
            something wrong.
          </p>
          <SubmitButton
            label="Restore original (pre-AI) text"
            pendingLabel="Restoring…"
            className="self-start rounded-full border border-border-strong px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          />
        </form>
      )}
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <ScriptTabs
        defaultTab={hasScript ? "edit" : "write"}
        write={writePanel}
        enhance={enhancePanel}
        edit={editPanel}
      />
    </main>
  );
}
