-- Prompt is now optional when an admin adds a showcase item — not every
-- sample upload has (or needs) a captured prompt.
alter table public.showcase_items alter column prompt drop not null;
