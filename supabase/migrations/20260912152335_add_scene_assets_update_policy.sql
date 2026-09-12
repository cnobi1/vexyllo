-- scene_assets (20260811033707_scene_breakdown_sheet.sql) only ever needed
-- select/insert/delete until now -- toggling which assets appear in a scene
-- (SceneAssetEditor) is add/remove, never an in-place edit. Editing a
-- wardrobe_note on an existing (scene_id, asset_id) row is a genuine update,
-- and RLS has no update policy on this table yet, so it would otherwise be
-- silently rejected. Mirrors the existing select/insert/delete policies'
-- join-through-scenes-to-projects.user_id shape exactly.
create policy "scene_assets_update_own"
on public.scene_assets for update
to authenticated
using (exists (
  select 1 from public.scenes sc
  join public.projects p on p.id = sc.project_id
  where sc.id = scene_assets.scene_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.scenes sc
  join public.projects p on p.id = sc.project_id
  where sc.id = scene_assets.scene_id and p.user_id = (select auth.uid())
));
