-- Enforces the "every scene between 10 and 30 seconds" invariant (overflow
-- spills into subsequent scenes, undersized scenes merge into a neighbor —
-- see enforceSceneDurationRange in
-- src/lib/scripts/enforce-scene-duration-range.ts) at the DB layer too, as
-- defense-in-depth alongside the code-level split/merge. Historical rows
-- outside the new range are backfilled to the nearer bound first so the
-- new CHECK constraints below don't fail against existing data. Added as
-- new, separately named constraints rather than replacing the existing
-- unnamed "> 0" checks from 20260811033707_scene_breakdown_sheet.sql
-- (scenes_duration_seconds_check, projects_target_scene_duration_seconds_check)
-- — both checks apply together, so the original lower-than-zero guard
-- stays intact.

update public.scenes
  set duration_seconds = 30
  where duration_seconds > 30;

update public.scenes
  set duration_seconds = 10
  where duration_seconds < 10;

update public.projects
  set target_scene_duration_seconds = 30
  where target_scene_duration_seconds > 30;

update public.projects
  set target_scene_duration_seconds = 10
  where target_scene_duration_seconds < 10;

alter table public.scenes
  add constraint scenes_duration_seconds_range_check
    check (duration_seconds is null or (duration_seconds >= 10 and duration_seconds <= 30));

alter table public.projects
  add constraint projects_target_scene_duration_seconds_range_check
    check (target_scene_duration_seconds is null or (target_scene_duration_seconds >= 10 and target_scene_duration_seconds <= 30));
