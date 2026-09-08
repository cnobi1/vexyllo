-- DB-driven model catalog: lets users pick which model to use per
-- generation (image/video), and lets admins add/price new models (e.g. Wan
-- 3.0 on Alibaba Model Studio/DashScope) without a code deploy. Public-read
-- (within `authenticated`, every logged-in user needs to see the picker),
-- admin-only write — same pattern as showcase_items.
create table public.generation_models (
  id uuid primary key default gen_random_uuid(),
  capability text not null check (capability in ('image', 'video')),
  provider_key text not null check (provider_key in ('byteplus', 'gateway', 'alibaba', 'mock')),
  provider_model_id text not null,
  display_name text not null,
  description text,
  credit_cost_mode text not null check (credit_cost_mode in ('flat', 'duration_multiplier')),
  flat_credit_cost numeric(10, 4),
  credits_per_second numeric(10, 4),
  resolution_cost_multiplier jsonb,
  allowed_durations jsonb,
  allowed_resolutions jsonb,
  allowed_ratios jsonb,
  supports_image_to_video boolean not null default false,
  supports_reference_images boolean not null default false,
  max_reference_images integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger generation_models_set_updated_at
before update on public.generation_models
for each row execute function public.set_updated_at();

alter table public.generation_models enable row level security;

create policy "generation_models_select_authenticated"
on public.generation_models for select
to authenticated
using (true);

create policy "generation_models_insert_admin"
on public.generation_models for insert
to authenticated
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "generation_models_update_admin"
on public.generation_models for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "generation_models_delete_admin"
on public.generation_models for delete
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Seed rows mirror today's actual behavior exactly (same provider_model_id
-- strings currently configured via BYTEPLUS_IMAGE_MODEL/BYTEPLUS_VIDEO_MODEL
-- in .env.local, and the same pricing constants from credit-costs.ts) so
-- cutting over to the catalog changes no existing price or model. Mock rows
-- get sort_order 0 (lowest) so a zero-provider-key local clone still
-- defaults to a working model, matching today's "no keys -> mock" fallback
-- without any silent provider-reassignment logic in code.
insert into public.generation_models
  (capability, provider_key, provider_model_id, display_name, description, credit_cost_mode, credits_per_second, resolution_cost_multiplier, allowed_durations, allowed_resolutions, allowed_ratios, supports_image_to_video, supports_reference_images, max_reference_images, sort_order)
values
  ('video', 'mock', 'mock', 'Mock (dev)', 'Local placeholder video, no external API call.', 'duration_multiplier', 3, '{"480p":0.333,"720p":0.5,"1080p":1,"4k":1.5}'::jsonb, '{"min":2,"max":12}'::jsonb, '["480p","720p","1080p"]'::jsonb, '["16:9","4:3","1:1","3:4","9:16","21:9","adaptive"]'::jsonb, true, true, 9, 0),
  ('video', 'byteplus', 'dreamina-seedance-2-5-260628', 'BytePlus Seedance 2.5', 'BytePlus ModelArk video generation.', 'duration_multiplier', 3, '{"480p":0.333,"720p":0.5,"1080p":1,"4k":1.5}'::jsonb, '{"min":4,"max":30}'::jsonb, '["480p","720p","1080p"]'::jsonb, '["16:9","4:3","1:1","3:4","9:16","21:9","adaptive"]'::jsonb, true, true, 9, 10),
  ('video', 'gateway', 'google/veo-3.1-generate-001', 'Veo 3.1 (Gateway)', 'Google Veo via the Vercel AI Gateway.', 'duration_multiplier', 3, '{"480p":0.333,"720p":0.5,"1080p":1,"4k":1.5}'::jsonb, '{"min":2,"max":12}'::jsonb, null, '["16:9","4:3","1:1","3:4","9:16","adaptive"]'::jsonb, false, false, null, 20),
  ('video', 'alibaba', 'wan3.0-video', 'Wan 3.0 Video', 'Alibaba Cloud Model Studio (DashScope). Pricing is a placeholder — confirm against real Alibaba billing and adjust here.', 'duration_multiplier', 3, '{"480p":0.333,"720p":0.5,"1080p":1}'::jsonb, '{"min":2,"max":30}'::jsonb, '["480p","720p","1080p"]'::jsonb, '["16:9","9:16","1:1","adaptive"]'::jsonb, true, true, 1, 30),
  ('video', 'alibaba', 'wan3.0-video-prime', 'Wan 3.0 Video (Prime)', 'Alibaba Cloud Model Studio (DashScope), premium tier. Pricing is a placeholder — confirm against real Alibaba billing and adjust here.', 'duration_multiplier', 4.5, '{"480p":0.333,"720p":0.5,"1080p":1}'::jsonb, '{"min":2,"max":30}'::jsonb, '["480p","720p","1080p"]'::jsonb, '["16:9","9:16","1:1","adaptive"]'::jsonb, true, true, 1, 31),
  ('image', 'mock', 'mock', 'Mock (dev)', 'Local placeholder image, no external API call.', 'flat', null, null, null, null, null, false, true, 14, 0),
  ('image', 'byteplus', 'dola-seedream-5-0-pro-260628', 'BytePlus Seedream 5.0 Pro', 'BytePlus ModelArk image generation.', 'flat', null, null, null, null, null, false, true, 14, 10),
  ('image', 'gateway', 'google/imagen-4.0-fast-generate-001', 'Imagen 4.0 Fast (Gateway)', 'Google Imagen via the Vercel AI Gateway.', 'flat', null, null, null, null, null, false, false, null, 20);

update public.generation_models set flat_credit_cost = 2 where capability = 'image';
