-- Supabase Realtime's postgres_changes filters (e.g. project_id=eq.<id>) are
-- evaluated against the row payload it receives. On DELETE, the default
-- REPLICA IDENTITY only puts the primary key in that payload — project_id
-- would be missing, so the filter can never match and delete events would
-- never reach subscribed clients. FULL includes every column on UPDATE/DELETE
-- so the existing project_id filter works for deletes too.
alter table public.generations replica identity full;
