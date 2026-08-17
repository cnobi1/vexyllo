"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GenerationRow = {
  kind: string;
  asset_id: string | null;
  status: string;
  output_url: string | null;
};

/**
 * Keeps an asset/character card's shown reference image in sync with
 * character-sheet generations completing in the background. Those writes
 * happen inside media.ts:generateCharacterSheet's after() callback — which
 * runs post-response, well after the triggering Server Action (a single
 * "Generate"/"Regenerate" or a whole "Autofill" batch) has already returned
 * and any router refresh from it has already rendered stale data. `assets`
 * isn't in the realtime publication (see CLAUDE.md), so without this the
 * card only ever picks up the new image on a full page reload. Subscribes
 * the same session-then-channel way generation-feed.tsx does for the
 * generation grid itself.
 */
export function useAssetPrimaryImage(projectId: string, assetId: string, initialUrl: string | null) {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  // Adjusting state in response to a prop change during render (React's
  // recommended pattern, same as asset-generate-form.tsx's prefill handling)
  // rather than in an effect, which would set state synchronously on every
  // run and cause a cascading render.
  const [trackedInitialUrl, setTrackedInitialUrl] = useState(initialUrl);
  if (initialUrl !== trackedInitialUrl) {
    setTrackedInitialUrl(initialUrl);
    setImageUrl(initialUrl);
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      const channel = supabase
        .channel(`asset-primary-image:${projectId}:${assetId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "generations", filter: `project_id=eq.${projectId}` },
          (payload) => {
            const row = payload.new as GenerationRow | undefined;
            if (!row || row.kind !== "character_sheet" || row.asset_id !== assetId) return;
            if (row.status === "succeeded" && row.output_url) {
              setImageUrl(row.output_url);
            }
          },
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [projectId, assetId]);

  return imageUrl;
}
