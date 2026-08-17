-- Script generation and scene breakdown (DeepSeek calls) were previously
-- unmetered entirely — no credits_ledger row was ever written for them.
-- Adding a reason value so src/lib/actions/projects.ts and scenes.ts can
-- charge credits for those calls the same way image/video generation does.
alter table public.credits_ledger drop constraint credits_ledger_reason_check;

alter table public.credits_ledger add constraint credits_ledger_reason_check check (
  reason in ('subscription_refill', 'generation_image', 'generation_video', 'generation_script', 'refund', 'admin_adjustment')
);
