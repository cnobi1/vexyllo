"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getScriptProvider } from "@/lib/providers/llm";
import { extractScriptText } from "@/lib/scripts/extract-script-text";
import { normalizeScriptText } from "@/lib/scripts/normalize-script-text";
import { deleteProjectStorage } from "@/lib/media/delete-project-storage";
import { SCRIPT_CREDIT_COST } from "@/lib/billing/credit-costs";
import { requireCredits, recordSpend } from "@/lib/billing/spend-credits";
import { loadOwnedProject } from "./project-guard";

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, title })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create project");
  }

  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const scriptText = String(formData.get("script_text") ?? "");
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("projects")
    .update({ title, script_text: scriptText || null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Style now has its own dedicated action (set from the persistent selector
 * in the project sidebar) rather than being bundled into updateProject's
 * title/script_text form — keeping it separate means saving the script
 * text can never accidentally clobber the style, and vice versa.
 */
export async function updateProjectStyle(projectId: string, style: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = style.trim();
  const { error } = await supabase
    .from("projects")
    .update({ style: trimmed || null })
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function generateScriptFromIdea(id: string, formData: FormData) {
  const idea = String(formData.get("idea") ?? "").trim();
  if (!idea) return;
  const length = formData.get("length") === "feature" ? "feature" : "short";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, style")
    .eq("id", id)
    .single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  await requireCredits(user.id, SCRIPT_CREDIT_COST);

  const provider = getScriptProvider();
  const result = await provider.generateScript({ idea, style: project.style, length });

  const { error } = await supabase
    .from("projects")
    .update({ title: result.title, script_text: normalizeScriptText(result.scriptText) })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  await recordSpend(user.id, SCRIPT_CREDIT_COST, "generation_script", null);

  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function enhanceScriptFromUpload(id: string, formData: FormData) {
  const file = formData.get("file");
  const pastedScript = String(formData.get("pasted_script") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const originalText = file instanceof File && file.size > 0 ? await extractScriptText(file) : pastedScript;
  if (!originalText) {
    throw new Error("Upload a script file or paste script text to enhance.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, style")
    .eq("id", id)
    .single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  await requireCredits(user.id, SCRIPT_CREDIT_COST);

  const provider = getScriptProvider();
  const result = await provider.enhanceScript({
    scriptText: originalText,
    style: project.style,
    instructions: instructions || null,
  });

  // Title is deliberately not overwritten — enhancing polishes existing text,
  // it doesn't rebrand the project the way writing from scratch does.
  // original_script_text is kept exactly as extracted/pasted, not normalized —
  // it's a backup of what the user actually provided, not AI output.
  const { error } = await supabase
    .from("projects")
    .update({ script_text: normalizeScriptText(result.scriptText), original_script_text: originalText })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  await recordSpend(user.id, SCRIPT_CREDIT_COST, "generation_script", null);

  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function editScriptWithAI(id: string, formData: FormData) {
  const instructions = String(formData.get("instructions") ?? "").trim();
  if (!instructions) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, style, script_text")
    .eq("id", id)
    .single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }
  if (!project.script_text?.trim()) {
    throw new Error("Write a script first before editing it with AI.");
  }

  await requireCredits(user.id, SCRIPT_CREDIT_COST);

  const provider = getScriptProvider();
  const result = await provider.enhanceScript({
    scriptText: project.script_text,
    style: project.style,
    instructions,
  });

  // Same convention as enhanceScriptFromUpload: title is left alone (an AI
  // edit reworks the existing script, it doesn't rebrand the project), and
  // the pre-edit text is backed up to original_script_text so the existing
  // "Restore original" control can undo it.
  const { error } = await supabase
    .from("projects")
    .update({
      script_text: normalizeScriptText(result.scriptText),
      original_script_text: project.script_text,
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  await recordSpend(user.id, SCRIPT_CREDIT_COST, "generation_script", null);

  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function restoreOriginalScript(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, original_script_text")
    .eq("id", id)
    .single();
  if (fetchError || !project) {
    throw new Error(fetchError?.message ?? "Project not found");
  }
  if (!project.original_script_text) {
    throw new Error("No backup to restore.");
  }

  const { error } = await supabase
    .from("projects")
    .update({ script_text: project.original_script_text, original_script_text: null })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  await loadOwnedProject(supabase, id);

  // Deleting the row alone only cascades the database rows (scenes/shots/
  // assets/generations/uploads all reference projects with `on delete
  // cascade`) — the actual Storage files need their own cleanup, and it has
  // to happen first: Storage's RLS re-derives ownership via a join back to
  // `projects`, so once that row is gone nothing can list/delete them.
  await deleteProjectStorage(supabase, id);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
