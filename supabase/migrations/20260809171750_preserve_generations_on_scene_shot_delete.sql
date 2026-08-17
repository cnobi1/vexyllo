-- Bug: generateStoryboard() (storyboard.ts) deletes and reinserts every
-- scene/shot on every "Regenerate Storyboard" run — by design, to derive a
-- fresh breakdown from the (possibly edited) script. But generations.scene_id
-- and generations.shot_id were declared `on delete cascade`, so every
-- scene_storyboard image and every per-shot image/video generated against
-- the old scenes/shots was silently destroyed (row AND storage file) the
-- moment the breakdown was regenerated — with no warning that regenerating
-- text would delete already-generated (and BytePlus-billed) media. This is
-- the actual cause of "I generated a storyboard, then later couldn't find it
-- anywhere, not even All Media" — a genuine delete, not a UI/visibility bug.
--
-- Fix: switch both FKs to `on delete set null` so a generation whose
-- scene/shot disappears becomes an orphaned, still-fully-visible (All Media
-- queries only ever filtered by project_id) project-scoped record instead of
-- being destroyed. The generations_shot_kind_consistency check (phase5) is
-- relaxed to match: shot_id/scene_id are now allowed to be null for their
-- own kind (post-orphaning), while still forbidding a row from carrying the
-- other kind's foreign key or carrying either when its kind is neither.

alter table public.generations
  drop constraint if exists generations_scene_id_fkey;
alter table public.generations
  add constraint generations_scene_id_fkey
  foreign key (scene_id) references public.scenes (id) on delete set null;

alter table public.generations
  drop constraint if exists generations_shot_id_fkey;
alter table public.generations
  add constraint generations_shot_id_fkey
  foreign key (shot_id) references public.shots (id) on delete set null;

alter table public.generations
  drop constraint if exists generations_shot_kind_consistency;
alter table public.generations
  add constraint generations_shot_kind_consistency
  check (
    (kind = 'shot' and scene_id is null)
    or (kind = 'scene_storyboard' and shot_id is null)
    or (kind not in ('shot', 'scene_storyboard') and shot_id is null and scene_id is null)
  );
