-- One-time "top up credits" purchases (separate from subscription_refill,
-- which only ever fires from a Checkout Session in "subscription" mode) —
-- see src/lib/providers/billing/{stripe,mock}-adapter.ts's startTopUpCheckout
-- and the webhook's new payment-mode branch.
alter table public.credits_ledger drop constraint credits_ledger_reason_check;

alter table public.credits_ledger add constraint credits_ledger_reason_check check (
  reason in ('subscription_refill', 'generation_image', 'generation_video', 'generation_script', 'refund', 'admin_adjustment', 'credit_topup')
);
