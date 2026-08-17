-- generations.output_url has been persisting the 1h-TTL signed URL returned
-- by copyToMediaBucket() as if it were permanent. Add storage_path (the
-- stable bucket-relative path) so display code can re-derive a fresh signed
-- URL on read instead of serving an expired one.
alter table public.generations
  add column storage_path text;
