const SCENE_HEADING_RE = /^\s*(INT|EXT|I\/E|INT\.?\/EXT)\b/i;
const CUT_TO_RE = /^\s*CUT TO:\s*$/i;

function isCharacterCue(trimmed: string) {
  if (!trimmed || trimmed.length > 40) return false;
  if (!/[A-Z]/.test(trimmed)) return false;
  return trimmed === trimmed.toUpperCase();
}

export function isHighlightedScriptLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (SCENE_HEADING_RE.test(trimmed)) return true;
  if (CUT_TO_RE.test(trimmed)) return true;
  return isCharacterCue(trimmed);
}
