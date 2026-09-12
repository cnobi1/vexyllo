"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CREDIT_COST_SETTINGS, type CreditCostSettings } from "@/lib/billing/credit-costs";

// Module-level cache shared across every component on the page — mirrors
// use-text-limits.ts's reasoning exactly: these settings change rarely (an
// admin tunes them occasionally at /admin/subscriptions), so one fetch per
// page load is enough.
let cache: CreditCostSettings | null = null;
let inFlight: Promise<CreditCostSettings> | null = null;

const KEY_TO_FIELD: Record<string, keyof CreditCostSettings> = {
  script: "scriptCreditCost",
  breakdown: "breakdownCreditCost",
  min_video_floor: "minVideoCreditCost",
};

function fetchSettings(): Promise<CreditCostSettings> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("credit_cost_settings").select("key, credits");
      const settings = { ...DEFAULT_CREDIT_COST_SETTINGS };
      for (const row of data ?? []) {
        const field = KEY_TO_FIELD[row.key];
        if (field) settings[field] = row.credits;
      }
      cache = settings;
      return settings;
    })();
  }
  return inFlight;
}

/**
 * Client-side counterpart to loadCreditCostSettings (credit-costs.ts) — used
 * where a form shows a live "this will cost N credits" estimate (image/video
 * generate forms) so the number shown matches what the server will actually
 * charge. The floor value only ever affects the estimate; the server always
 * re-derives and enforces its own copy regardless of what the client sends.
 */
export function useCreditCostSettings(): CreditCostSettings {
  const [settings, setSettings] = useState<CreditCostSettings>(cache ?? DEFAULT_CREDIT_COST_SETTINGS);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetchSettings().then((result) => {
      if (!cancelled) setSettings(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
