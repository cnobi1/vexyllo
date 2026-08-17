import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/actions/projects";
import { logout } from "@/lib/actions/auth";
import { DeleteProjectButton } from "../_components/delete-project-button";
import { Logo } from "../_components/logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, style, created_at")
    .order("created_at", { ascending: false });

  const { data: adminRow } = user
    ? await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = !!adminRow;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <Logo className="h-7 w-auto" />
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              Admin
            </Link>
          )}
          <Link
            href="/billing"
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
          >
            Billing
          </Link>
          <span className="text-sm text-muted">{user?.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-14">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            If you can write it,{" "}
            <span className="gradient-text">VeXyllo AI</span> can shoot it
          </h2>
          <p className="text-sm text-muted">
            Script → scenes → rendered clips, powered by AI generation.
          </p>
        </div>

        <form
          action={createProject}
          className="card-glow flex flex-col gap-3 rounded-2xl p-6"
        >
          <h2 className="text-base font-semibold text-foreground">New project</h2>
          <input
            name="title"
            placeholder="Project title, e.g. Neon Skyline"
            required
            className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
          />
          <button
            type="submit"
            className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white"
          >
            ✦ Create project
          </button>
        </form>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">Your projects</h2>
          {projects && projects.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <li key={project.id} className="group relative">
                  <Link
                    href={`/projects/${project.id}`}
                    className="card-glow flex h-full flex-col justify-between gap-3 rounded-2xl p-5 hover:border-border-strong hover:bg-surface-hover"
                  >
                    <span className="pr-8 font-medium text-foreground group-hover:gradient-text">
                      {project.title}
                    </span>
                    {project.style ? (
                      <span className="w-fit rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
                        {project.style}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-2">No style set</span>
                    )}
                  </Link>
                  <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No projects yet — create your first one above.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
