-- Lets a saved character reference image be tagged with an outfit/variant
-- name (e.g. "Hospital gown", "Business suit") so a generation can pick a
-- specific look instead of always resolving to the primary image. Display
-- text only, not an identity key — no uniqueness constraint.

alter table public.asset_images
  add column if not exists label text;
