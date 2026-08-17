import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteProject } from "@/lib/actions/projects";
import { ProjectShell } from "./_components/project-shell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("projects").select("id, title, style").eq("id", id).single();

  if (!project) {
    notFound();
  }

  // Proxy middleware already guarantees a session on every /projects/*
  // route, so user is always present here — the fallback is just for the
  // type, not an expected runtime path.
  const { data: subscription } = user
    ? await supabase.from("subscriptions").select("credit_balance").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const deleteProjectWithId = deleteProject.bind(null, project.id);

  return (
    <ProjectShell
      projectId={project.id}
      title={project.title}
      style={project.style}
      userId={user?.id ?? ""}
      creditBalance={subscription?.credit_balance ?? null}
      deleteAction={deleteProjectWithId}
    >
      {children}
    </ProjectShell>
  );
}
