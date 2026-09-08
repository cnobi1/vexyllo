-- The generation_models_catalog seed (20260907120000) capped both Wan 3.0
-- rows at 10s, but Wan 3.0 actually supports up to 30s — correcting the
-- already-inserted rows here since editing that seed migration's INSERT
-- in place has no effect once it has run.
update public.generation_models
set allowed_durations = '{"min":2,"max":30}'::jsonb
where provider_key = 'alibaba'
  and provider_model_id in ('wan3.0-video', 'wan3.0-video-prime');
