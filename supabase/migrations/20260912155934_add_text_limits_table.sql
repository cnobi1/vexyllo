-- Admin-tunable character caps for every free-text field in the app
-- (see src/lib/text-limits.ts) -- these were hardcoded constants
-- (MAX_PROMPT_LENGTH etc.) requiring a code deploy to change; moving them
-- here lets an admin raise/lower any cap from /admin/text-limits with no
-- deploy. Fixed key set (no insert/delete policy) since code references
-- these keys by name -- an admin can retune the numbers, not invent new
-- categories nothing reads. Public-read (not just authenticated) because
-- two callers need it with no session: the marketing homepage's hero
-- console and the /contact form (see saveShowcaseItems/showcase_items for
-- the same "must work logged-out" reasoning).
create table public.text_limits (
  key text primary key,
  label text not null,
  max_length integer not null check (max_length > 0),
  updated_at timestamptz not null default now()
);

create trigger text_limits_set_updated_at
before update on public.text_limits
for each row execute function public.set_updated_at();

alter table public.text_limits enable row level security;

create policy "text_limits_select_all"
on public.text_limits for select
to public
using (true);

create policy "text_limits_update_admin"
on public.text_limits for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Seed values match the constants they replace exactly, so this migration
-- changes no existing behavior.
insert into public.text_limits (key, label, max_length) values
  ('name', 'Names & titles (character name, project title)', 100),
  ('short_text', 'Short text (custom style, phone number)', 100),
  ('technical_id', 'Technical IDs (admin model catalog)', 200),
  ('email', 'Email address', 254),
  ('note', 'Short notes (wardrobe note, reference image label)', 300),
  ('description', 'Descriptions (admin model/showcase item)', 500),
  ('prompt', 'Generation prompts, scene dialogue, character description', 2000),
  ('instructions', 'AI edit/enhance instructions, contact message', 2000),
  ('idea', 'Script idea', 5000),
  ('script_text', 'Full script text (pasted or hand-edited)', 200000);
