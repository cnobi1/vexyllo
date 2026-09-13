-- ElevenLabs voice for character dialogue: a new 'audio' capability in the
-- generation_models catalog, a new 'dialogue_voice' generations kind (one
-- row per @NAME-tagged dialogue line, scene-scoped like scene_storyboard),
-- and a per-character reusable voice assignment on assets. See CLAUDE.md /
-- the approved plan for why: output is a separate audio clip per line (no
-- video muxing in v1), voiced from the Videos tab's existing @NAME-tagged
-- "From scene" dialogue prompt (the one place a human actually confirms
-- who's speaking — scenes.dialogue itself is an unattributed flat blob).

-- generation_models: widen capability/provider_key/credit_cost_mode, add a
-- per-character pricing column (ElevenLabs bills per input character, a
-- genuinely new cost shape alongside flat/duration_multiplier).
alter table public.generation_models
  drop constraint if exists generation_models_capability_check;
alter table public.generation_models
  add constraint generation_models_capability_check
  check (capability in ('image', 'video', 'audio'));

alter table public.generation_models
  drop constraint if exists generation_models_provider_key_check;
alter table public.generation_models
  add constraint generation_models_provider_key_check
  check (provider_key in ('byteplus', 'gateway', 'alibaba', 'mock', 'elevenlabs'));

alter table public.generation_models
  drop constraint if exists generation_models_credit_cost_mode_check;
alter table public.generation_models
  add constraint generation_models_credit_cost_mode_check
  check (credit_cost_mode in ('flat', 'duration_multiplier', 'character_multiplier'));

alter table public.generation_models
  add column if not exists credits_per_character numeric(10, 4);

-- Seed rows. credits_per_character below is an UNVERIFIED PLACEHOLDER (loosely
-- derived assuming ~$0.1125/credit, same conversion credit-costs.ts uses
-- elsewhere, against a rough ElevenLabs Creator-tier $/character rate) — this
-- codebase's established practice (see credit-costs.ts's pricing comment
-- block) is to recalibrate against real provider billing data once available,
-- not to trust a guess. Edit via /admin/models once real ElevenLabs invoice
-- data exists; do not treat this number as production-ready.
insert into public.generation_models
  (capability, provider_key, provider_model_id, display_name, description, credit_cost_mode, credits_per_character, is_active, sort_order)
values
  ('audio', 'mock', 'mock', 'Mock (dev)', 'Local placeholder voice audio, no external API call.', 'character_multiplier', 0.002, true, 0),
  ('audio', 'elevenlabs', 'eleven_multilingual_v2', 'ElevenLabs', 'ElevenLabs text-to-speech — per-character pricing is an unverified placeholder, recalibrate against real billing before relying on it.', 'character_multiplier', 0.002, true, 10);

-- generations: new type ('audio') and kind ('dialogue_voice'), scene-scoped
-- like scene_storyboard (one dialogue_voice row per spoken line, tagged back
-- to its scene and to the speaking character via the existing asset_id column).
alter table public.generations
  drop constraint if exists generations_type_check;
alter table public.generations
  add constraint generations_type_check
  check (type in ('image', 'video', 'audio'));

alter table public.generations
  drop constraint if exists generations_kind_check;
alter table public.generations
  add constraint generations_kind_check
  check (kind in (
    'shot', 'freeform_image', 'image_to_video', 'character_sheet',
    'upload_to_video', 'scene_storyboard', 'dialogue_voice'
  ));

alter table public.generations
  drop constraint if exists generations_shot_kind_consistency;
alter table public.generations
  add constraint generations_shot_kind_consistency
  check (
    (kind = 'shot' and shot_id is not null and scene_id is null)
    or (kind in ('scene_storyboard', 'dialogue_voice') and scene_id is not null and shot_id is null)
    or (kind not in ('shot', 'scene_storyboard', 'dialogue_voice') and shot_id is null and scene_id is null)
  );

-- credits_ledger: new spend reason for dialogue-voice generations, same
-- widening pattern as add_generation_script_ledger_reason.sql.
alter table public.credits_ledger
  drop constraint if exists credits_ledger_reason_check;
alter table public.credits_ledger
  add constraint credits_ledger_reason_check
  check (reason in (
    'subscription_refill', 'generation_image', 'generation_video',
    'generation_script', 'refund', 'admin_adjustment', 'credit_topup',
    'generation_voice'
  ));

-- assets: per-character reusable ElevenLabs voice assignment (analogous to a
-- primary reference image). Nullable and meaningful only for type='character'
-- rows — enforced by the UI only, no DB check, since no other asset type's
-- UI ever reaches the voice-picker code path.
alter table public.assets
  add column if not exists elevenlabs_voice_id text,
  add column if not exists elevenlabs_voice_name text;
