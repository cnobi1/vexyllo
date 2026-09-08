-- Records which provider-facing model id produced each generation,
-- alongside the existing `provider` column (which now only identifies the
-- adapter, e.g. "byteplus", since the model string moved here). No backfill
-- — historical rows carry no model concept today, same as they carry none
-- of this column at all.
alter table public.generations add column model text;
