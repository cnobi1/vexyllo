-- Live generation attempt on 2026-09-08 returned Alibaba DashScope's
-- "Access to model denied. Please make sure you are eligible for using the
-- model" error -- an account/workspace-side permission issue (the Wan
-- model isn't activated/deployed in workspace ws-barpa096sri3ab5h yet), not
-- a code bug. Deactivating both Wan 3.0 rows so they're not selectable
-- until that's resolved in the Alibaba Cloud console -- flip is_active back
-- to true via /admin/models (no migration needed) once access is confirmed
-- working end to end.
update public.generation_models
set is_active = false
where provider_key = 'alibaba' and capability = 'video';
