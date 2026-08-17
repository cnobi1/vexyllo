-- Phase 2: script -> storyboard (scenes, shots, assets).
-- Ownership has no direct user_id column on these tables; RLS is enforced
-- via a join back to projects.user_id (and for shots, via scenes -> projects).

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  order_index int not null,
  summary text,
  dialogue text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenes_project_id_idx on public.scenes (project_id);

create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes (id) on delete cascade,
  order_index int not null,
  camera_angle text,
  prompt text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shots_scene_id_idx on public.shots (scene_id);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('character', 'location', 'prop')),
  name text not null,
  description text,
  reference_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_project_id_idx on public.assets (project_id);

alter table public.scenes enable row level security;
alter table public.shots enable row level security;
alter table public.assets enable row level security;

-- scenes: ownership via project_id -> projects.user_id
create policy "scenes_select_own"
on public.scenes for select
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = scenes.project_id and p.user_id = (select auth.uid())
));

create policy "scenes_insert_own"
on public.scenes for insert
to authenticated
with check (exists (
  select 1 from public.projects p
  where p.id = scenes.project_id and p.user_id = (select auth.uid())
));

create policy "scenes_update_own"
on public.scenes for update
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = scenes.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p
  where p.id = scenes.project_id and p.user_id = (select auth.uid())
));

create policy "scenes_delete_own"
on public.scenes for delete
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = scenes.project_id and p.user_id = (select auth.uid())
));

-- shots: ownership via scene_id -> scenes.project_id -> projects.user_id
create policy "shots_select_own"
on public.shots for select
to authenticated
using (exists (
  select 1 from public.scenes s
  join public.projects p on p.id = s.project_id
  where s.id = shots.scene_id and p.user_id = (select auth.uid())
));

create policy "shots_insert_own"
on public.shots for insert
to authenticated
with check (exists (
  select 1 from public.scenes s
  join public.projects p on p.id = s.project_id
  where s.id = shots.scene_id and p.user_id = (select auth.uid())
));

create policy "shots_update_own"
on public.shots for update
to authenticated
using (exists (
  select 1 from public.scenes s
  join public.projects p on p.id = s.project_id
  where s.id = shots.scene_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.scenes s
  join public.projects p on p.id = s.project_id
  where s.id = shots.scene_id and p.user_id = (select auth.uid())
));

create policy "shots_delete_own"
on public.shots for delete
to authenticated
using (exists (
  select 1 from public.scenes s
  join public.projects p on p.id = s.project_id
  where s.id = shots.scene_id and p.user_id = (select auth.uid())
));

-- assets: ownership via project_id -> projects.user_id
create policy "assets_select_own"
on public.assets for select
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = assets.project_id and p.user_id = (select auth.uid())
));

create policy "assets_insert_own"
on public.assets for insert
to authenticated
with check (exists (
  select 1 from public.projects p
  where p.id = assets.project_id and p.user_id = (select auth.uid())
));

create policy "assets_update_own"
on public.assets for update
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = assets.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p
  where p.id = assets.project_id and p.user_id = (select auth.uid())
));

create policy "assets_delete_own"
on public.assets for delete
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = assets.project_id and p.user_id = (select auth.uid())
));

create trigger scenes_set_updated_at
before update on public.scenes
for each row
execute function public.set_updated_at();

create trigger shots_set_updated_at
before update on public.shots
for each row
execute function public.set_updated_at();

create trigger assets_set_updated_at
before update on public.assets
for each row
execute function public.set_updated_at();
