-- Powers a persistent credit-balance indicator in the project sidebar
-- (src/app/projects/[id]/_components/credit-balance.tsx) — every generation
-- debits subscriptions.credit_balance in the background (see
-- spend-credits.ts) with no other UI feedback, so the sidebar subscribes to
-- this table the same way generation-feed.tsx already subscribes to
-- `generations`, instead of requiring a page reload to see the balance move.
alter table public.subscriptions replica identity full;
alter publication supabase_realtime add table public.subscriptions;
