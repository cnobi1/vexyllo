-- Minimal admin role, scoped to one capability today (the homepage sample
-- showcase manager at /admin) — presence in `admins` is the entire role
-- model, no permission levels. Membership is migration/service-role-only,
-- not self-service, same reasoning as `subscriptions`.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins_select_own"
on public.admins for select
to authenticated
using (user_id = (select auth.uid()));

insert into public.admins (user_id)
select id from auth.users where email = 'cnobi2000@gmail.com'
on conflict do nothing;

-- Sample media shown on the logged-out marketing homepage. Public select
-- (the homepage has no session), admin-only write, gated by `admins`
-- membership rather than the service-role client since these writes happen
-- in a normal admin request/response cycle with a real session available.
create table public.showcase_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

alter table public.showcase_items enable row level security;

create policy "showcase_items_select_public"
on public.showcase_items for select
to anon, authenticated
using (true);

create policy "showcase_items_insert_admin"
on public.showcase_items for insert
to authenticated
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "showcase_items_update_admin"
on public.showcase_items for update
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "showcase_items_delete_admin"
on public.showcase_items for delete
to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Storage: a public bucket (unlike the private per-project `media` bucket)
-- since showcase media must be viewable by logged-out visitors via a plain
-- public URL, with no per-user ownership to check.
insert into storage.buckets (id, name, public)
values ('showcase', 'showcase', true)
on conflict (id) do nothing;

create policy "showcase_bucket_select_public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'showcase');

create policy "showcase_bucket_insert_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'showcase'
  and exists (select 1 from public.admins where user_id = (select auth.uid()))
);

create policy "showcase_bucket_delete_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'showcase'
  and exists (select 1 from public.admins where user_id = (select auth.uid()))
);
