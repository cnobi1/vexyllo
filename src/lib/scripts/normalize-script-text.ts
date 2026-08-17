/**
 * LLM-generated script text occasionally contains generation artifacts that
 * have nothing to do with the story: runs of dozens of blank lines (observed
 * from deepseek-chat's prompted/"compatibility mode" JSON output, most often
 * right after a character cue), and manual space-padding meant to fake
 * centered screenplay indentation, which reads as stray gaps in a plain
 * left-aligned textarea. Both are cosmetic noise, not part of the writing,
 * so we strip them deterministically rather than relying on prompt wording
 * alone to prevent them.
 */
export function normalizeScriptText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
