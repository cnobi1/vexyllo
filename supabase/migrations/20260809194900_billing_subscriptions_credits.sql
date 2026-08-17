-- Billing: one subscription row per user (plan, Stripe identifiers, and a
-- cached credit_balance), plus an append-only credits_ledger audit trail.
-- credit_balance is never written directly — a trigger on credits_ledger
-- keeps it in sync, so "can this user afford a generation?" is always a
-- single indexed lookup on subscriptions rather than summing history on
-- every check, while the ledger itself stays the source of truth for how
-- that balance was arrived at (refills, spends, refunds, admin adjustments).

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  plan text not null,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled')),
  credit_balance integer not null default 0,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
on public.subscriptions for select
to authenticated
using (user_id = (select auth.uid()));

-- No insert/update/delete policies for authenticated users: every write to
-- this table comes from trusted server code (the billing server actions and
-- the Stripe webhook handler), both using the service-role client — the
-- same "detached background execution, no user session" pattern already
-- used by the video generation workflow (see src/lib/supabase/service.ts).

create table public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Positive = grant (subscription refill, refund, admin adjustment).
  -- Negative = spend (a generation's cost). Never updated after insert —
  -- correcting a mistake means inserting a compensating row, not editing
  -- history.
  amount integer not null,
  reason text not null check (
    reason in ('subscription_refill', 'generation_image', 'generation_video', 'refund', 'admin_adjustment')
  ),
  generation_id uuid references public.generations (id) on delete set null,
  -- Stripe webhooks are retried on failure — recording the event id here
  -- and checking for it first (see the webhook route) is what makes
  -- replays idempotent instead of double-granting credits.
  stripe_event_id text,
  created_at timestamptz not null default now()
);

create index credits_ledger_user_id_created_at_idx on public.credits_ledger (user_id, created_at desc);
create index credits_ledger_generation_id_idx on public.credits_ledger (generation_id) where generation_id is not null;
create unique index credits_ledger_stripe_event_id_idx on public.credits_ledger (stripe_event_id) where stripe_event_id is not null;

alter table public.credits_ledger enable row level security;

create policy "credits_ledger_select_own"
on public.credits_ledger for select
to authenticated
using (user_id = (select auth.uid()));

-- Keeps subscriptions.credit_balance equal to sum(credits_ledger.amount) for
-- that user, applied atomically in the same transaction as the ledger
-- insert — no separate "recompute balance" step, no race between
-- concurrent spends on the same account.
create function public.apply_credit_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set credit_balance = credit_balance + new.amount,
      updated_at = now()
  where user_id = new.user_id;
  return new;
end;
$$;

create trigger credits_ledger_apply
  after insert on public.credits_ledger
  for each row execute function public.apply_credit_ledger_entry();
