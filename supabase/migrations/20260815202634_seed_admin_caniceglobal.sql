-- Correction: the admin seed in 20260815201029_add_admin_and_showcase.sql
-- looked up 'cnobi2000@gmail.com', which has no auth.users row on this
-- project and so silently matched zero rows. The user's actual account here
-- is caniceglobal@gmail.com.
insert into public.admins (user_id)
select id from auth.users where email = 'caniceglobal@gmail.com'
on conflict do nothing;
