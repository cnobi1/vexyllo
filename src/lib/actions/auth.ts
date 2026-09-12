"use server";

import { redirect } from "next/navigation";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadTextLimits } from "@/lib/text-limits";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const resend = new Resend(process.env.RESEND_API_KEY);

export type AuthState = { error?: string; message?: string } | undefined;

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Admin has its own separate login (src/app/admin/login/) rather than
 * reusing the regular /login + dashboard link path. Same Supabase account/
 * password as regular login (one credential store, not two) — the only
 * difference is the post-auth admins-table check and the redirect target.
 * A successful sign-in that turns out not to be an admin is immediately
 * signed back out, so a non-admin never ends up silently authenticated via
 * this form.
 */
export async function adminLogin(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }

  redirect("/admin");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  // Truncated rather than rejected: idea is a bonus passthrough (prefills the
  // project's "Write with AI" box after signup), not a required field — an
  // oversized value shouldn't block account creation the way it would for a
  // dedicated idea-submission action elsewhere.
  const limits = await loadTextLimits(supabase);
  const idea = String(formData.get("idea") ?? "").trim().slice(0, limits.idea);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { message: "Check your email to confirm your account before logging in." };
  }

  // Carried over from the marketing homepage's hero prompt console — only
  // reachable here when signup grants a session immediately (email
  // confirmation off). If confirmation is required the idea is dropped;
  // the user lands on an empty dashboard after confirming instead, same as
  // any other signup.
  if (idea && data.user) {
    const { data: project } = await supabase
      .from("projects")
      .insert({ user_id: data.user.id, title: idea.slice(0, 60) })
      .select("id")
      .single();
    if (project) {
      redirect(`/projects/${project.id}?idea=${encodeURIComponent(idea)}`);
    }
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");

  // Same message whether or not the email is registered, whether the
  // account lookup fails, or whether the send fails — don't let this form
  // be used to enumerate accounts, and don't surface delivery errors to an
  // unauthenticated caller.
  const genericState: AuthState = {
    message: "If an account exists for that email, we've sent a password reset link.",
  };

  // Bypasses Supabase Auth's own resetPasswordForEmail (which renders and
  // sends the email itself via GoTrue's mailer/email template) in favor of
  // generating the recovery token via the Admin API and sending the email
  // ourselves through Resend — GoTrue's own send was failing in production
  // with an opaque 500 from its mail step, unrelated to this app's code.
  // admin.generateLink requires the service-role client; this is safe here
  // per src/lib/supabase/service.ts's documented exception, since it's a
  // privileged Auth-admin operation with no RLS policy of its own to bypass.
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password` },
  });

  if (error || !data.properties) {
    if (error) console.error("requestPasswordReset: generateLink failed:", error);
    return genericState;
  }

  const resetUrl = `${SITE_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`;

  const { error: sendError } = await resend.emails.send({
    from: "VeXyllo AI <noreply@vexyllo.com>",
    to: [email],
    subject: "Reset your VeXyllo AI password",
    html: `<p>We received a request to reset your VeXyllo AI password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });

  if (sendError) {
    console.error("requestPasswordReset: email send failed:", sendError);
  }

  return genericState;
}

export async function resetPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
