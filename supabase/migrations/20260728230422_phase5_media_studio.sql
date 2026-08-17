-- Phase 5: project-scoped media studio (freeform image/video generation,
-- character sheets, uploads) on top of BytePlus ModelArk.
--
-- generations was shot-only (shot_id not null) through phase 4. This phase
-- makes shot_id optional and adds project_id directly on generations so a
-- single row shape and a single RLS join covers shot-attached generations
-- (kind='shot', unchanged behavior) and the new project-scoped kinds
-- (freeform_image / image_to_video / character_sheet / upload_to_video, no
-- shot at all). project_id is deliberately denormalized: it's derivable via
-- shot_id -> scenes -> projects for shot rows, but non-shot rows have no
-- shot to derive it from, so it has to be a first-class column regardless —
-- making it required on every row keeps "All Media" (project_id=eq.<id>)
-- and RLS both single-join instead of branching by kind.

-- uploads: user-supplied source images, independent of any provider call.
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists uploads_project_id_idx on public.uploads (project_id);

alter table public.uploads enable row level security;

create policy "uploads_select_own"
on public.uploads for select
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = uploads.project_id and p.user_id = (select auth.uid())
));

create policy "uploads_insert_own"
on public.uploads for insert
to authenticated
with check (exists (
  select 1 from public.projects p
  where p.id = uploads.project_id and p.user_id = (select auth.uid())
));

create policy "uploads_delete_own"
on public.uploads for delete
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = uploads.project_id and p.user_id = (select auth.uid())
));

-- asset_images: multiple saved reference images per character asset (a
-- "character sheet" is a batch of these). assets.reference_image_url stays
-- as a denormalized pointer to the current primary asset_images row's URL,
-- kept in sync by application code, so existing storyboard code reading it
-- keeps working unchanged.
create table if not exists public.asset_images (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  generation_id uuid references public.generations (id) on delete set null,
  storage_path text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists asset_images_asset_id_idx on public.asset_images (asset_id);
create unique index if not exists asset_images_one_primary_per_asset
  on public.asset_images (asset_id) where is_primary;

alter table public.asset_images enable row level security;

create policy "asset_images_select_own"
on public.asset_images for select
to authenticated
using (exists (
  select 1 from public.assets a
  join public.projects p on p.id = a.project_id
  where a.id = asset_images.asset_id and p.user_id = (select auth.uid())
));

create policy "asset_images_insert_own"
on public.asset_images for insert
to authenticated
with check (exists (
  select 1 from public.assets a
  join public.projects p on p.id = a.project_id
  where a.id = asset_images.asset_id and p.user_id = (select auth.uid())
));

create policy "asset_images_update_own"
on public.asset_images for update
to authenticated
using (exists (
  select 1 from public.assets a
  join public.projects p on p.id = a.project_id
  where a.id = asset_images.asset_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.assets a
  join public.projects p on p.id = a.project_id
  where a.id = asset_images.asset_id and p.user_id = (select auth.uid())
));

create policy "asset_images_delete_own"
on public.asset_images for delete
to authenticated
using (exists (
  select 1 from public.assets a
  join public.projects p on p.id = a.project_id
  where a.id = asset_images.asset_id and p.user_id = (select auth.uid())
));

-- generations: make shot-optional, add project scoping, batching, asset
-- tagging, and upload provenance.
alter table public.generations
  alter column shot_id drop not null;

alter table public.generations
  add column if not exists project_id uuid references public.projects (id) on delete cascade,
  add column if not exists asset_id uuid references public.assets (id) on delete set null,
  add column if not exists batch_id uuid,
  add column if not exists kind text not null default 'shot'
    check (kind in ('shot', 'freeform_image', 'image_to_video', 'character_sheet', 'upload_to_video')),
  add column if not exists source_upload_id uuid references public.uploads (id) on delete set null,
  add column if not exists params jsonb not null default '{}'::jsonb;

-- Backfill project_id for existing shot-kind rows before making it required.
update public.generations g
set project_id = p.id
from public.shots s
join public.scenes sc on sc.id = s.scene_id
join public.projects p on p.id = sc.project_id
where g.shot_id = s.id and g.project_id is null;

alter table public.generations
  alter column project_id set not null;

-- Keep the two invariants (which kind, whether shot_id is set) from drifting
-- apart: shot-kind rows must have a shot, every other kind must not.
alter table public.generations
  add constraint generations_shot_kind_consistency
  check (
    (kind = 'shot' and shot_id is not null)
    or (kind <> 'shot' and shot_id is null)
  );

create index if not exists generations_project_id_created_at_idx
  on public.generations (project_id, created_at desc);
create index if not exists generations_batch_id_idx
  on public.generations (batch_id) where batch_id is not null;
create index if not exists generations_asset_id_idx
  on public.generations (asset_id) where asset_id is not null;

-- Replace the shot-chain RLS policies with a direct project_id join, now
-- that every row (shot-attached or not) carries project_id.
drop policy "generations_select_own" on public.generations;
drop policy "generations_insert_own" on public.generations;
drop policy "generations_update_own" on public.generations;
drop policy "generations_delete_own" on public.generations;

create policy "generations_select_own"
on public.generations for select
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = generations.project_id and p.user_id = (select auth.uid())
));

create policy "generations_insert_own"
on public.generations for insert
to authenticated
with check (exists (
  select 1 from public.projects p
  where p.id = generations.project_id and p.user_id = (select auth.uid())
));

create policy "generations_update_own"
on public.generations for update
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = generations.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p
  where p.id = generations.project_id and p.user_id = (select auth.uid())
));

create policy "generations_delete_own"
on public.generations for delete
to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = generations.project_id and p.user_id = (select auth.uid())
));

-- Storage: a single private bucket for every project-scoped media file
-- (uploads and copies of provider output — provider URLs expire, ours
-- don't). Paths are prefixed "<project_id>/...", so storage.foldername(name)
-- resolved against owned projects is enough to enforce ownership.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "media_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'media'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = (select auth.uid())
  )
);

create policy "media_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'media'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = (select auth.uid())
  )
);

create policy "media_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'media'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = (select auth.uid())
  )
);
