-- Backfill storage_path for rows written before it existed. output_url on
-- these rows is a (possibly now-expired) signed URL of the shape
-- ".../object/sign/media/{path}?token=..." — the path itself never expires,
-- only the token does, so it can be recovered straight out of the URL.
update public.generations
set storage_path = substring(output_url from '/object/sign/media/([^?]+)')
where storage_path is null
  and output_url like '%/object/sign/media/%';
