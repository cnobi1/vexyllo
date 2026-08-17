-- Replaces the shot-level storyboard breakdown with a scene-level breakdown
-- sheet: each scene carries its verbatim script text, an estimated screen
-- time, and (via scene_assets) which characters/locations/props appear in
-- it plus a per-character wardrobe note. Modeled directly on an Assistant
-- Director's scene breakdown sheet. `shots`/`shot_assets` are untouched —
-- shot-level generation is deferred, not deleted, and old data/deferred code
-- still depend on them.

alter table public.projects
  add column if not exists target_scene_duration_seconds int
    check (target_scene_duration_seconds is null or target_scene_duration_seconds > 0);

alter table public.scenes
  add column if not exists script_text text,
  add column if not exists duration_seconds int
    check (duration_seconds is null or duration_seconds > 0);

-- Mirrors shot_assets (20260808230556_shot_asset_links.sql) one level up the
-- hierarchy, plus a wardrobe_note — this is what an AD breakdown sheet calls
-- "cast in this scene" + costume notes, extracted per (scene, character).
create table if not exists public.scene_assets (
  scene_id uuid not null references public.scenes (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  wardrobe_note text,
  created_at timestamptz not null default now(),
  primary key (scene_id, asset_id)
);

create index if not exists scene_assets_asset_id_idx on public.scene_assets (asset_id);

alter table public.scene_assets enable row level security;

create policy "scene_assets_select_own"
on public.scene_assets for select
to authenticated
using (exists (
  select 1 from public.scenes sc
  join public.projects p on p.id = sc.project_id
  where sc.id = scene_assets.scene_id and p.user_id = (select auth.uid())
));

create policy "scene_assets_insert_own"
on public.scene_assets for insert
to authenticated
with check (exists (
  select 1 from public.scenes sc
  join public.projects p on p.id = sc.project_id
  where sc.id = scene_assets.scene_id and p.user_id = (select auth.uid())
));

create policy "scene_assets_delete_own"
on public.scene_assets for delete
to authenticated
using (exists (
  select 1 from public.scenes sc
  join public.projects p on p.id = sc.project_id
  where sc.id = scene_assets.scene_id and p.user_id = (select auth.uid())
));
