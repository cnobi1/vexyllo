-- Promotes `admins` from flat membership (no levels at all) to two roles:
-- super_admin (full access, including managing other admins) and admin
-- (can manage the model catalog and showcase, cannot touch other admins).
-- Existing rows backfill to super_admin so nobody currently listed loses any
-- capability they have today (today's model has no restriction whatsoever).
alter table public.admins add column role text check (role in ('super_admin', 'admin'));
update public.admins set role = 'super_admin' where role is null;
alter table public.admins alter column role set not null;
alter table public.admins alter column role set default 'admin';

-- Role management stays behind security-definer RPCs rather than a
-- self-service RLS write policy on `admins` — consistent with the table's
-- existing "migration/service-role-only, not self-service" posture and
-- mirroring admin_list_users()'s precedent (auth.users isn't a public-schema
-- table RLS can gate directly).
create function public.admin_add_admin_by_email(target_email text, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'not authorized';
  end if;
  if target_role not in ('super_admin', 'admin') then
    raise exception 'invalid role';
  end if;

  select id into target_user_id from auth.users where email = target_email;
  if target_user_id is null then
    raise exception 'No account found for that email — they must sign up first.';
  end if;

  insert into public.admins (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;
grant execute on function public.admin_add_admin_by_email(text, text) to authenticated;

create function public.admin_remove_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'not authorized';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot remove your own admin access.';
  end if;

  delete from public.admins where user_id = target_user_id;
end;
$$;
grant execute on function public.admin_remove_admin(uuid) to authenticated;

create function public.admin_update_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'not authorized';
  end if;
  if new_role not in ('super_admin', 'admin') then
    raise exception 'invalid role';
  end if;

  update public.admins set role = new_role where user_id = target_user_id;
end;
$$;
grant execute on function public.admin_update_admin_role(uuid, text) to authenticated;

create function public.admin_list_admins()
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  return query
  select a.user_id, u.email::text, a.role, a.created_at
  from public.admins a
  join auth.users u on u.id = a.user_id
  order by a.created_at asc;
end;
$$;
grant execute on function public.admin_list_admins() to authenticated;
