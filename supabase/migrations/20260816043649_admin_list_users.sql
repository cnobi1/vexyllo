-- Admin "registered users" list. auth.users isn't exposed through PostgREST
-- and subscriptions only has a select-own RLS policy (see
-- billing_subscriptions_credits.sql), so there's no way for an admin
-- session to read other users' email/plan through the normal client. This
-- mirrors apply_credit_ledger_entry's existing security-definer pattern:
-- the function itself enforces the admins-membership check (raising if the
-- caller isn't one) rather than relying on a table-level RLS policy, since
-- the data being joined (auth.users) isn't a public-schema table RLS can
-- gate in the first place.
create function public.admin_list_users()
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
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select u.id, u.email, u.created_at, s.plan, s.status, s.credit_balance, s.current_period_end
  from auth.users u
  left join public.subscriptions s on s.user_id = u.id
  order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
