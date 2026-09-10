import type { BreakdownScene } from "@/lib/providers/llm/types";

/**
 * Hard per-scene screen-time bounds. The LLM's durationSeconds estimate is
 * only ever a pacing guess (see BreakdownScene.durationSeconds), so nothing
 * guarantees it lands in range — enforced here in code (not as Zod
 * .min()/.max() on the schema) because structured-output calls in this
 * codebase (deepseek-adapter.ts, gateway-adapter.ts) have no retry/repair
 * path on schema validation failure; a hard schema bound would turn an
 * out-of-range estimate into a hard generation failure instead of a safe
 * split/merge.
 */
export const MIN_SCENE_DURATION_SECONDS = 10;
export const MAX_SCENE_DURATION_SECONDS = 30;

function chunkLines(lines: string[], partCount: number): string[][] {
  if (lines.length < partCount) {
    // Not enough distinct lines to divide meaningfully — every part shares
    // the full text; only durationSeconds differs per part.
    return Array.from({ length: partCount }, () => lines);
  }
  const chunks: string[][] = [];
  for (let i = 0; i < partCount; i++) {
    const start = Math.floor((i * lines.length) / partCount);
    const end = Math.floor(((i + 1) * lines.length) / partCount);
    chunks.push(lines.slice(start, end));
  }
  return chunks;
}

/**
 * Splits one oversized scene into partCount = ceil(duration / MAX) parts,
 * each an even share of the original duration rather than fixed
 * MAX-sized chunks with a remainder — an even split always keeps every
 * part >= MAX * (partCount-1)/partCount, whose worst case (duration just
 * over MAX, partCount=2) is MAX/2 = 15s, comfortably clear of the 10s
 * floor. That's what lets splitting and merging never fight each other.
 */
function splitScene(scene: BreakdownScene): BreakdownScene[] {
  const partCount = Math.ceil(scene.durationSeconds / MAX_SCENE_DURATION_SECONDS);

  const scriptChunks = chunkLines(scene.scriptText.split("\n"), partCount);

  // Dialogue is a curated "key lines" excerpt, not verbatim script text, so
  // duplicating the same spoken line onto every continuation part would
  // misrepresent the sheet. Only split it when there are enough lines to
  // divide meaningfully; otherwise keep it on part one and leave later
  // parts without dialogue.
  const dialogueLines = scene.dialogue ? scene.dialogue.split("\n").filter((line) => line.trim()) : [];
  const dialogueChunks =
    dialogueLines.length >= partCount
      ? chunkLines(dialogueLines, partCount)
      : [dialogueLines, ...Array.from({ length: partCount - 1 }, () => [] as string[])];

  // Balanced integer split of durationSeconds across partCount parts
  // (boundaries rounded, so parts differ by at most one second) — same
  // bucketing shape as chunkLines above.
  const durationBoundaries = Array.from({ length: partCount + 1 }, (_, i) =>
    Math.round((i * scene.durationSeconds) / partCount),
  );

  return Array.from({ length: partCount }, (_, i) => ({
    ...scene,
    summary: i === 0 ? scene.summary : `${scene.summary} (cont'd)`,
    dialogue: dialogueChunks[i].length > 0 ? dialogueChunks[i].join("\n") : null,
    scriptText: scriptChunks[i].join("\n"),
    durationSeconds: durationBoundaries[i + 1] - durationBoundaries[i],
  }));
}

function mergeTwoScenes(a: BreakdownScene, b: BreakdownScene): BreakdownScene {
  const wardrobeByCharacter = new Map(
    [...a.wardrobe, ...b.wardrobe].map((entry) => [entry.characterName, entry]),
  );

  return {
    order: a.order,
    summary: [a.summary, b.summary].join(" "),
    dialogue: [a.dialogue, b.dialogue].filter(Boolean).join("\n") || null,
    scriptText: [a.scriptText, b.scriptText].join("\n\n"),
    durationSeconds: a.durationSeconds + b.durationSeconds,
    assetNames: Array.from(new Set([...a.assetNames, ...b.assetNames])),
    wardrobe: Array.from(wardrobeByCharacter.values()),
  };
}

/**
 * Folds any scene under MIN_SCENE_DURATION_SECONDS into its neighbor
 * (forward into the next scene; the trailing scene, if still undersized
 * with nothing after it, folds backward into the previous one instead) so
 * no isolated sub-10-second scene survives. A merge can push the combined
 * duration back over MAX_SCENE_DURATION_SECONDS (e.g. an 8s scene next to
 * a 25s one) — callers must re-run the oversized split afterward.
 */
function mergeUndersizedScenes(scenes: BreakdownScene[]): BreakdownScene[] {
  const merged: BreakdownScene[] = [];
  for (const scene of scenes) {
    const prev = merged[merged.length - 1];
    if (prev && prev.durationSeconds < MIN_SCENE_DURATION_SECONDS) {
      merged[merged.length - 1] = mergeTwoScenes(prev, scene);
    } else {
      merged.push(scene);
    }
  }
  if (merged.length > 1 && merged[merged.length - 1].durationSeconds < MIN_SCENE_DURATION_SECONDS) {
    const last = merged.pop()!;
    merged[merged.length - 1] = mergeTwoScenes(merged[merged.length - 1], last);
  }
  return merged;
}

/**
 * Enforces the "every scene between 10 and 30 seconds" invariant: an
 * oversized scene's overflow spills into new sequential scenes, and an
 * undersized scene is folded into its neighbor rather than left as its own
 * sub-10-second scene. `order` on the returned scenes is not meaningful —
 * callers renumber the full, expanded/collapsed list afterward.
 */
export function enforceSceneDurationRange(scenes: BreakdownScene[]): BreakdownScene[] {
  const split = scenes.flatMap((scene) =>
    scene.durationSeconds > MAX_SCENE_DURATION_SECONDS ? splitScene(scene) : [scene],
  );
  const merged = mergeUndersizedScenes(split);
  // A merge can re-create an oversized scene; splitting again can never
  // re-create an undersized one (see splitScene's worst-case-15s proof
  // above), so one more split pass is sufficient — no further loop needed.
  return merged.flatMap((scene) =>
    scene.durationSeconds > MAX_SCENE_DURATION_SECONDS ? splitScene(scene) : [scene],
  );
}
