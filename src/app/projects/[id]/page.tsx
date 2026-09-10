import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WriteScriptForm, EditScriptForm, UpdateProjectForm, RestoreOriginalForm } from "./_components/script-forms";
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

  const hasScript = Boolean(project.script_text?.trim());
  const hasBackup = Boolean(project.original_script_text?.trim());

  const writePanel = <WriteScriptForm projectId={project.id} hasScript={hasScript} ideaDefault={ideaFromHero} />;

  const enhancePanel = <EnhanceScriptForm projectId={project.id} />;

  const editPanel = (
    <div className="flex flex-col gap-3">
      {hasScript && <EditScriptForm projectId={project.id} />}
      <UpdateProjectForm projectId={project.id} title={project.title} scriptText={project.script_text ?? ""} />
      {hasBackup && <RestoreOriginalForm projectId={project.id} />}
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
