import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/actions/projects";
import { formatRelativeDate } from "@/lib/format-relative-date";
import { DeleteProjectButton } from "../_components/delete-project-button";
import { Logo } from "../_components/logo";
import { SparkleIcon } from "../_components/sparkle-icon";
import { CreditBadge } from "./_components/credit-badge";
import { UserMenu } from "./_components/user-menu";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectPlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m4 18 5.5-6L14 16l2-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, style, created_at")
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((project) => project.id);

  const [{ data: adminRow }, { data: subscription }, { data: recentGenerations }] = await Promise.all([
    user ? supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("subscriptions").select("credit_balance").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    projectIds.length > 0
      ? supabase
          .from("generations")
          .select("project_id, storage_path, created_at")
          .in("project_id", projectIds)
          .eq("status", "succeeded")
          .eq("type", "image")
          .not("storage_path", "is", null)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ]);
  const isAdmin = !!adminRow;

  // First succeeded generation per project — recentGenerations is already
  // ordered newest-first, so the first row seen per project_id is the most
  // recent one.
  const latestStoragePathByProject = new Map<string, string>();
  for (const generation of recentGenerations ?? []) {
    if (!latestStoragePathByProject.has(generation.project_id) && generation.storage_path) {
      latestStoragePathByProject.set(generation.project_id, generation.storage_path);
    }
  }
  const thumbnailByProject = new Map<string, string>();
  await Promise.all(
    [...latestStoragePathByProject.entries()].map(async ([projectId, storagePath]) => {
      const { data } = await supabase.storage.from("media").createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
      if (data) thumbnailByProject.set(projectId, data.signedUrl);
    }),
  );

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? (user?.user_metadata?.name as string | undefined) ?? null;
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ?? (user?.user_metadata?.picture as string | undefined) ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="hero-glow" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
          <Link href="/dashboard">
            <Logo className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <CreditBadge userId={user?.id ?? ""} initialBalance={subscription?.credit_balance ?? null} />
            <UserMenu email={user?.email ?? ""} displayName={displayName} avatarUrl={avatarUrl} isAdmin={isAdmin} />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-14">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="text-sm text-muted">Pick up where you left off, or start something new.</p>
          </div>

          <form
            action={createProject}
            className="card-glow relative flex flex-col gap-3 overflow-hidden rounded-2xl p-6"
          >
            <div className="card-spotlight" aria-hidden="true" />
            <div className="relative flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <PlusIcon />
                </span>
                New project
              </h2>
              <input
                name="title"
                placeholder="Project title, e.g. Neon Skyline"
                required
                className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
              />
              <button
                type="submit"
                className="btn-primary flex w-fit items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white"
              >
                <SparkleIcon />
                Create project
              </button>
            </div>
          </form>

          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">Your projects</h2>
            {projects && projects.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projects.map((project) => {
                  const thumbnail = thumbnailByProject.get(project.id);
                  return (
                    <li key={project.id} className="group relative">
                      <Link
                        href={`/projects/${project.id}`}
                        className="card-glow flex h-full flex-col overflow-hidden rounded-2xl hover:border-border-strong hover:bg-surface-hover"
                      >
                        <div className="flex aspect-video items-center justify-center overflow-hidden bg-background/60 text-muted-2">
                          {thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a next/image-optimizable remote asset
                            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ProjectPlaceholderIcon />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                          <span className="pr-8 font-medium text-foreground group-hover:gradient-text">
                            {project.title}
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            {project.style ? (
                              <span className="w-fit rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
                                {project.style}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-2">No style set</span>
                            )}
                            <span className="shrink-0 text-xs text-muted-2">{formatRelativeDate(project.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                      <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
                No projects yet — create your first one above.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
