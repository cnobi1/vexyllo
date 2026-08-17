const SCENE_HEADING_RE = /^(?:INT|EXT|INT\.?\/EXT|I\/E)[.\s]/i;

/**
 * Splits at scene-heading boundaries only (never mid-scene), so any
 * preamble before the first heading rides along with the first scene.
 */
function splitScriptIntoScenes(scriptText: string): string[] {
  const lines = scriptText.split("\n");
  const scenes: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (SCENE_HEADING_RE.test(line.trim()) && current.length > 0) {
      scenes.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) scenes.push(current.join("\n").trim());

  return scenes.filter(Boolean);
}

const MAX_SCENES_PER_BATCH = 5;
const MAX_CHARS_PER_BATCH = 6000;

/**
 * A structured breakdown of every scene in one request can overflow
 * deepseek-chat's 8000-token output cap on a feature-length script (see
 * MAX_OUTPUT_TOKENS in deepseek-adapter.ts), which surfaces as an opaque
 * "no output generated" error instead of finishing. Splitting the script
 * into scene-bounded batches keeps each breakdown call's output small
 * enough to finish reliably; generateSceneBreakdown re-merges the batch
 * results back into one continuous scene list.
 */
export function chunkScriptForBreakdown(scriptText: string): string[] {
  const scenes = splitScriptIntoScenes(scriptText);
  if (scenes.length === 0) return [scriptText];

  const batches: string[] = [];
  let batchScenes: string[] = [];
  let batchChars = 0;

  for (const scene of scenes) {
    const wouldOverflow =
      batchScenes.length > 0 &&
      (batchScenes.length + 1 > MAX_SCENES_PER_BATCH || batchChars + scene.length > MAX_CHARS_PER_BATCH);
    if (wouldOverflow) {
      batches.push(batchScenes.join("\n\n"));
      batchScenes = [];
      batchChars = 0;
    }
    batchScenes.push(scene);
    batchChars += scene.length;
  }
  if (batchScenes.length > 0) batches.push(batchScenes.join("\n\n"));

  return batches;
}
