-- Phase 4: video generation via a durable Workflow run.
-- Nullable, additive only — no RLS or realtime changes needed, `generations`
-- already has both from the phase3 migration. Lets a stuck/failed generation
-- row be traced directly to its workflow run for observability
-- (`npx workflow inspect run <id>`).

alter table public.generations add column if not exists workflow_run_id text;
