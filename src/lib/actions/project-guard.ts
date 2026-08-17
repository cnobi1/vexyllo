import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/**
 * Shared "is this project mine" check for every project-scoped action
 * (media, characters, uploads). RLS is the backstop, not the only check —
 * this explicit auth.getUser() + ownership-select mirrors the pattern
 * already used by projects.ts/storyboard.ts/generations.ts.
 */
export async function loadOwnedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ id: string; style: string | null; userId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, style")
    .eq("id", projectId)
    .single();
  if (error || !project) {
    throw new Error(error?.message ?? "Project not found");
  }
  return { ...project, userId: user.id };
}
