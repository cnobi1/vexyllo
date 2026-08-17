import { Fragment } from "react";
import { isHighlightedScriptLine } from "@/lib/script-highlight";

type SceneAssetLink = {
  asset_id: string;
  wardrobe_note: string | null;
};

type Scene = {
  id: string;
  order_index: number;
  summary: string | null;
  dialogue: string | null;
  script_text: string | null;
  duration_seconds: number | null;
  scene_assets: SceneAssetLink[];
};

type AssetInfo = { name: string; type: string; imageUrl: string | null };

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

/**
 * The scene breakdown sheet: one card per scene with its verbatim script
 * text, estimated screen time, and the characters/locations/props that
 * appear in it — a character chip also shows its wardrobe note for that
 * scene when the breakdown extracted one. Purely informational — no
 * generation lives here; that's deferred to a future rebuild.
 */
export function SceneList({ scenes, assetsById }: { scenes: Scene[]; assetsById: Record<string, AssetInfo> }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {scenes.map((scene, index) => (
          <SceneCard key={scene.id} scene={scene} index={index} assetsById={assetsById} />
        ))}
      </div>
    </section>
  );
}

function SceneCard({ scene, index, assetsById }: { scene: Scene; index: number; assetsById: Record<string, AssetInfo> }) {
  const duration = formatDuration(scene.duration_seconds);
  const lines = (scene.script_text ?? "").split("\n");

  return (
    <div className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Scene {index + 1}</h3>
        {duration && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">{duration}</span>
        )}
      </div>

      {scene.summary && <p className="text-sm text-foreground">{scene.summary}</p>}
      {scene.dialogue && <p className="text-xs italic text-muted">{scene.dialogue}</p>}

      {scene.scene_assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scene.scene_assets.map((link) => {
            const asset = assetsById[link.asset_id];
            if (!asset) return null;
            return (
              <div
                key={link.asset_id}
                className="flex flex-col gap-0.5 rounded-lg border border-border px-2 py-1 text-xs"
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  {asset.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail from a signed Storage URL
                    <img src={asset.imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : null}
                  {asset.name}
                </div>
                {link.wardrobe_note && <span className="max-w-[220px] text-muted">{link.wardrobe_note}</span>}
              </div>
            );
          })}
        </div>
      )}

      {scene.script_text && (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted hover:text-foreground">
            Script text
          </summary>
          <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words border-t border-border p-3 font-mono text-xs leading-6 text-foreground">
            {lines.map((line, i) => (
              <Fragment key={i}>
                <span className={isHighlightedScriptLine(line) ? "font-bold" : undefined}>{line}</span>
                {i < lines.length - 1 ? "\n" : null}
              </Fragment>
            ))}
          </pre>
        </details>
      )}
    </div>
  );
}
