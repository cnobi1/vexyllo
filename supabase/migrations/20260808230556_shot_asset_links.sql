-- Links shots to the characters/locations/props that appear in them, so
-- shot generation can pull the right reference images for consistency.
-- Ownership via the same double-join pattern as `shots` itself
-- (shot_id -> shots.scene_id -> scenes.project_id -> projects.user_id).
create table if not exists public.shot_assets (
  shot_id uuid not null references public.shots (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shot_id, asset_id)
);

create index if not exists shot_assets_asset_id_idx on public.shot_assets (asset_id);

alter table public.shot_assets enable row level security;

create policy "shot_assets_select_own"
on public.shot_assets for select
to authenticated
using (exists (
  select 1 from public.shots sh
  join public.scenes sc on sc.id = sh.scene_id
  join public.projects p on p.id = sc.project_id
  where sh.id = shot_assets.shot_id and p.user_id = (select auth.uid())
));

create policy "shot_assets_insert_own"
on public.shot_assets for insert
to authenticated
with check (exists (
  select 1 from public.shots sh
  join public.scenes sc on sc.id = sh.scene_id
  join public.projects p on p.id = sc.project_id
  where sh.id = shot_assets.shot_id and p.user_id = (select auth.uid())
));

create policy "shot_assets_delete_own"
on public.shot_assets for delete
to authenticated
using (exists (
  select 1 from public.shots sh
  join public.scenes sc on sc.id = sh.scene_id
  join public.projects p on p.id = sc.project_id
  where sh.id = shot_assets.shot_id and p.user_id = (select auth.uid())
));
