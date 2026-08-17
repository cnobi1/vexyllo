import { createClient } from "@supabase/supabase-js";

// Trusted client for two situations, both bypassing RLS with the
// service-role/secret key: (1) inside Workflow "use step" functions (or
// other detached background execution) — steps are invoked by Workflow's
// internal callback, not a continuation of the original browser request, so
// there is no session cookie available the way src/lib/supabase/server.ts
// relies on; and (2) inside a Server Action handling a live request, but
// ONLY for a privileged system write that deliberately has no RLS
// insert/update policy at all (e.g. subscriptions/credits_ledger — crediting
// an account is a system operation, not a user editing their own data, so
// "the user can write their own row" is the wrong RLS model for it). In
// both cases this is safe only because the calling code already validated
// the request through the normal cookie-based client first (auth.getUser()
// for a live request; the originating Server Action's own checks before
// starting a workflow) — never reach for this client to skip that
// validation, and never use it for anything RLS-eligible that a plain user
// mutation should cover instead.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
