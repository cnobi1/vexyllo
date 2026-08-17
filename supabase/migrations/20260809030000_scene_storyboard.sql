-- Scene-level storyboard sheets: one combined multi-panel image per scene
-- (a grid of panels, one per shot) instead of one image per shot. Adds a
-- new 'scene_storyboard' generation kind alongside the existing shot/
-- freeform_image/image_to_video/character_sheet/upload_to_video kinds, and
-- a scene_id column so a scene_storyboard row can be traced back to its
-- scene the same way a shot row traces back via shot_id. RLS is untouched:
-- generations policies already join on project_id (see phase5), which every
-- kind carries regardless of shot_id/scene_id.

alter table public.generations
  add column if not exists scene_id uuid references public.scenes (id) on delete cascade;

create index if not exists generations_scene_id_idx
  on public.generations (scene_id) where scene_id is not null;

-- Widen the kind allow-list. The inline `check` added in phase5 for the
-- `kind` column was auto-named generations_kind_check by Postgres.
alter table public.generations
  drop constraint if exists generations_kind_check;

alter table public.generations
  add constraint generations_kind_check
  check (kind in (
    'shot', 'freeform_image', 'image_to_video', 'character_sheet',
    'upload_to_video', 'scene_storyboard'
  ));

-- Extend the shot/kind consistency invariant to also cover scene_id: a
-- scene_storyboard row must have a scene and no shot; every other kind
-- (including 'shot') is unchanged from phase5 plus must have no scene.
alter table public.generations
  drop constraint if exists generations_shot_kind_consistency;

alter table public.generations
  add constraint generations_shot_kind_consistency
  check (
    (kind = 'shot' and shot_id is not null and scene_id is null)
    or (kind = 'scene_storyboard' and scene_id is not null and shot_id is null)
    or (kind not in ('shot', 'scene_storyboard') and shot_id is null and scene_id is null)
  );
