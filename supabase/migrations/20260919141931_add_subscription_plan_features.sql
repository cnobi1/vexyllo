-- Per-plan pricing-card feature bullets ("Priority rendering", "4K export",
-- etc), admin-editable at /admin/subscriptions with no code deploy. Unlike
-- subscription_plans/credit_cost_settings (fixed id/key sets, update-only —
-- see the add_subscription_plans_and_credit_cost_settings migration), an
-- admin needs to add and remove arbitrary bullets per plan, so this table
-- gets full insert/update/delete policies, same shape as showcase_items.
--
-- The dynamic bullets PlanCard already computes (credit count, ~images/
-- month, ~video seconds/month) stay code-driven, not rows here — they're
-- derived from live credit-cost math, and letting an admin type a number
-- for those would just let displayed math drift from what a plan actually
-- grants. This table is for the qualitative bullets that math can't produce.
create table public.subscription_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.subscription_plans(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index subscription_plan_features_plan_id_sort_order_idx
  on public.subscription_plan_features (plan_id, sort_order);

alter table public.subscription_plan_features enable row level security;

create policy "subscription_plan_features_select_public"
on public.subscription_plan_features for select
to anon, authenticated
using (true);

create policy "subscription_plan_features_insert_admin"
on public.subscription_plan_features for insert
to authenticated
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "subscription_plan_features_update_admin"
on public.subscription_plan_features for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "subscription_plan_features_delete_admin"
on public.subscription_plan_features for delete
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Seed matches PlanCard's current hardcoded "Credits roll over, never
-- expire" bullet exactly, for all three plans -- this migration changes no
-- visible behavior until an admin adds/edits/removes a row.
insert into public.subscription_plan_features (plan_id, label, sort_order)
values
  ('starter', 'Credits roll over, never expire', 0),
  ('pro', 'Credits roll over, never expire', 0),
  ('studio', 'Credits roll over, never expire', 0);
