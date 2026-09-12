import type { createClient } from "@/lib/supabase/server";

// Admin-tunable character caps for every free-text field a user can type
// and save across the app — the source of truth is the text_limits table
// (see 20260912155934_add_text_limits_table.sql), editable at
// /admin/text-limits with no code deploy. Every backing DB column for the
// fields these guard is a plain unconstrained Postgres `text`, so without
// enforcement nothing stops an arbitrarily large payload short of Vercel's
// own request-body limit. Each cap is enforced twice: a `maxLength`
// attribute on the input (UX only, resolved via useTextLimits() client-side)
// and a call to assertMaxLength in the corresponding server action using a
// value loaded here (the actual control — client-side alone is bypassable
// by calling the action directly with a longer string).
export type TextLimitKey =
  | "name"
  | "short_text"
  | "technical_id"
  | "email"
  | "note"
  | "description"
  | "prompt"
  | "instructions"
  | "idea"
  | "script_text";

export type TextLimits = Record<TextLimitKey, number>;

/**
 * Fallback used only if the DB read fails or a row is somehow missing
 * (e.g. mid-migration) — matches the seed migration's values exactly, so
 * behavior is identical to before this became admin-tunable until an admin
 * actually changes something at /admin/text-limits.
 */
export const DEFAULT_TEXT_LIMITS: TextLimits = {
  name: 100,
  short_text: 100,
  technical_id: 200,
  email: 254,
  note: 300,
  description: 500,
  prompt: 2000,
  instructions: 2000,
  idea: 5000,
  script_text: 200_000,
};

/** Server-side loader — call with the request's Supabase client from inside a server action. */
export async function loadTextLimits(supabase: Awaited<ReturnType<typeof createClient>>): Promise<TextLimits> {
  const { data } = await supabase.from("text_limits").select("key, max_length");
  const limits = { ...DEFAULT_TEXT_LIMITS };
  for (const row of data ?? []) {
    if (row.key in limits) limits[row.key as TextLimitKey] = row.max_length;
  }
  return limits;
}

export function assertMaxLength(value: string, max: number, label: string): void {
  if (value.length > max) {
    throw new Error(`${label} must be ${max.toLocaleString()} characters or fewer.`);
  }
}
