-- Phase 3: image generation for storyboard shots.
-- generations is the ledger for every provider call: a pending row is inserted
-- before the provider is invoked, then updated with the outcome (rule from
-- project architecture: no generation call may bypass the ledger).
-- Ownership has no direct user_id column; RLS enforced via
-- shot_id -> scenes -> projects.user_id (same join-based pattern as shots).

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid not null references public.shots (id) on delete cascade,
  provider text not null,
  type text not null check (type in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  cost numeric(10,4),
  output_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generations_shot_id_idx on public.generations (shot_id);
create index if not exists generations_shot_id_created_at_idx on public.generations (shot_id, created_at desc);

alter table public.generations enable row level security;

create policy "generations_select_own"
on public.generations for select
to authenticated
using (exists (
  select 1 from public.shots s
  join public.scenes sc on sc.id = s.scene_id
  join public.projects p on p.id = sc.project_id
  where s.id = generations.shot_id and p.user_id = (select auth.uid())
));

create policy "generations_insert_own"
on public.generations for insert
to authenticated
with check (exists (
  select 1 from public.shots s
  join public.scenes sc on sc.id = s.scene_id
  join public.projects p on p.id = sc.project_id
  where s.id = generations.shot_id and p.user_id = (select auth.uid())
));

create policy "generations_update_own"
on public.generations for update
to authenticated
using (exists (
  select 1 from public.shots s
  join public.scenes sc on sc.id = s.scene_id
  join public.projects p on p.id = sc.project_id
  where s.id = generations.shot_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.shots s
  join public.scenes sc on sc.id = s.scene_id
  join public.projects p on p.id = sc.project_id
  where s.id = generations.shot_id and p.user_id = (select auth.uid())
));

create policy "generations_delete_own"
on public.generations for delete
to authenticated
using (exists (
  select 1 from public.shots s
  join public.scenes sc on sc.id = s.scene_id
  join public.projects p on p.id = sc.project_id
  where s.id = generations.shot_id and p.user_id = (select auth.uid())
));

create trigger generations_set_updated_at
before update on public.generations
for each row
execute function public.set_updated_at();

-- Required for Supabase Realtime: postgres_changes only streams events for
-- tables added to this publication. RLS is still enforced per-subscriber.
alter publication supabase_realtime add table public.generations;
