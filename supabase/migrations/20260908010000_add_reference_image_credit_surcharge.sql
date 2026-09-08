-- Cross-referencing the previous BytePlus invoice
-- (bill_detail_3003786644_20260908_20260901_479063.csv) against the
-- generations table showed the 7 billed Seedance tasks were NOT 8s clips as
-- the prior recalibration (20260908000000) assumed -- they were
-- image_to_video requests, mostly 25-30s long, with 1-9 reference images
-- each. Each reference image is sent as its own multimodal input to
-- BytePlus, which likely adds billed tokens, and computeCreditCost() had no
-- term for that at all. credits_per_second is corrected here for the real
-- ~25-30s duration range (was calibrated off a wrong 8s assumption);
-- credits_per_reference_image is new, charging for reference images beyond
-- the first (which the base per-second rate already covers). Both numbers
-- are a rough estimate from a noisy 7-sample invoice where duration and
-- reference count vary together -- re-validate once more invoice data is
-- available. See credit-costs.ts for the full derivation.
alter table public.generation_models
  add column credits_per_reference_image numeric(10, 4);

update public.generation_models
set credits_per_second = 14,
    credits_per_reference_image = 4
where provider_key = 'byteplus' and capability = 'video';
