"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TEXT_LIMITS, type TextLimitKey, type TextLimits } from "@/lib/text-limits";

// Module-level cache shared across every component on the page — text_limits
// rarely changes (an admin tunes it occasionally at /admin/text-limits), so
// one fetch per page load is enough; every useTextLimits() call site reuses
// the same in-flight/resolved promise instead of each firing its own query.
let cache: TextLimits | null = null;
let inFlight: Promise<TextLimits> | null = null;

function fetchLimits(): Promise<TextLimits> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("text_limits").select("key, max_length");
      const limits = { ...DEFAULT_TEXT_LIMITS };
      for (const row of data ?? []) {
        if (row.key in limits) limits[row.key as TextLimitKey] = row.max_length;
      }
      cache = limits;
      return limits;
    })();
  }
  return inFlight;
}

/**
 * Client-side counterpart to loadTextLimits (text-limits.ts) — resolves the
 * same admin-tunable caps for a `maxLength` attribute. Starts from
 * DEFAULT_TEXT_LIMITS (correct today, since that's what the seed migration
 * set) and swaps in the live table values once the fetch resolves; the
 * actual enforcement is server-side regardless; this only ever affects UX.
 */
export function useTextLimits(): TextLimits {
  const [limits, setLimits] = useState<TextLimits>(cache ?? DEFAULT_TEXT_LIMITS);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetchLimits().then((result) => {
      if (!cancelled) setLimits(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return limits;
}
