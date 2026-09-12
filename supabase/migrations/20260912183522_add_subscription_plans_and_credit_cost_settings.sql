-- Admin-tunable subscription/credit settings, same public-read/admin-write
-- pattern as generation_models and text_limits: previously hardcoded in
-- src/lib/billing/plans.ts (monthlyCredits per plan) and
-- src/lib/billing/credit-costs.ts (SCRIPT_CREDIT_COST, BREAKDOWN_CREDIT_COST,
-- MIN_VIDEO_CREDIT_COST) -- both required a code deploy to change. Plan
-- price/Stripe Price ID deliberately stay in code: Stripe doesn't allow
-- editing an existing Price's amount, so a price change is inherently a
-- Stripe-console action (create a new Price, update the env var), not
-- something a DB row can make happen on its own.
create table public.subscription_plans (
  id text primary key,
  name text not null,
  monthly_credits integer not null check (monthly_credits > 0),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;

create policy "subscription_plans_select_all"
on public.subscription_plans for select
to public
using (true);

create policy "subscription_plans_update_admin"
on public.subscription_plans for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Seed matches src/lib/billing/plans.ts's current values exactly -- this
-- migration changes no existing behavior until an admin edits a row.
insert into public.subscription_plans (id, name, monthly_credits) values
  ('starter', 'Starter', 80),
  ('pro', 'Pro', 260),
  ('studio', 'Studio', 700);

create table public.credit_cost_settings (
  key text primary key,
  label text not null,
  credits integer not null check (credits > 0),
  updated_at timestamptz not null default now()
);

create trigger credit_cost_settings_set_updated_at
before update on public.credit_cost_settings
for each row execute function public.set_updated_at();

alter table public.credit_cost_settings enable row level security;

create policy "credit_cost_settings_select_all"
on public.credit_cost_settings for select
to public
using (true);

create policy "credit_cost_settings_update_admin"
on public.credit_cost_settings for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Seed matches src/lib/billing/credit-costs.ts's SCRIPT_CREDIT_COST,
-- BREAKDOWN_CREDIT_COST, and MIN_VIDEO_CREDIT_COST exactly. Per-model image/
-- video costs stay on generation_models (already admin-editable via
-- /admin/models) -- these three are the global costs that aren't tied to
-- any one model.
insert into public.credit_cost_settings (key, label, credits) values
  ('script', 'Script generation from an idea', 2),
  ('breakdown', 'Scene breakdown', 3),
  ('min_video_floor', 'Minimum credits charged per video, regardless of duration', 80);
