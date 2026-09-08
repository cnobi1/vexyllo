-- Real BytePlus invoice (bill_detail_3003786644_20260908_20260901_479063.csv,
-- 2026-09-06/07) showed Seedance 2.5 video tasks costing $5.79-$9.26 each at
-- the 480p/720p tier -- 5-10x the credits_per_second=3 placeholder this row
-- was seeded with. Recalibrated to cover the worst observed cost with a
-- ~55% margin. Re-validate against a full month of invoices once available
-- (n=7 tasks / 2 days here) -- see credit-costs.ts.
update public.generation_models
set credits_per_second = 70
where provider_key = 'byteplus' and capability = 'video';
