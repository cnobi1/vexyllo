-- admin_list_users()'s `returns table (user_id uuid, ...)` makes user_id an
-- implicit plpgsql variable in scope for the whole function body, so the
-- admins-membership check's `where user_id = auth.uid()` was ambiguous
-- between that OUT parameter and public.admins.user_id. Qualify the column.
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  plan text,
  status text,
  credit_balance integer,
  current_period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select u.id, u.email, u.created_at, s.plan, s.status, s.credit_balance, s.current_period_end
  from auth.users u
  left join public.subscriptions s on s.user_id = u.id
  order by u.created_at desc;
end;
$$;
