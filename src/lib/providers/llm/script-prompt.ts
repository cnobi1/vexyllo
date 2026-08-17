import type { BreakdownScriptInput, EnhanceScriptInput, GenerateScriptInput } from "./types";

// Shared by all three script-facing prompts (generate-from-idea, enhance,
// and the storyboard breakdown) — this is what pushes description past
// generic ("she walks in") toward something a storyboard artist can
// actually shoot ("she enters frame-left in a slow push-in, backlit by the
// doorway"). A script stays a script and a shot stays a shot — this sharpens
// what's already being written in each prompt, not a checklist to fill
// every line with jargon.
const CINEMATIC_CRAFT_BRIEF = [
  "As you write, think in these dimensions of filmmaking craft — not as separate passes, but as the lens you write every beat through:",
  "- Story language: what actually happens, and why it matters now.",
  "- Character language: whose scene this is, and what they want in it.",
  "- Action language: exactly how bodies move — the specific physical verb, not a vague gesture.",
  "- Camera language: how the audience sees it, when the framing or angle itself carries meaning (e.g. an establishing shot, a close-up on a reaction, an over-the-shoulder in a confrontation).",
  "- Lighting language: how the scene is lit, when it sets mood or reveals something (e.g. hard sunlight, a single practical lamp, backlight through a doorway).",
  "- Composition language: what's inside the frame and how it's arranged, when it matters (foreground framing, negative space, a subject isolated against their background).",
  "- Environment language: where it happens, and how the space itself is part of the scene.",
  "- Emotion language: what the audience should feel in this beat.",
  "- Audio language: what we hear — dialogue, silence, a specific sound that lands.",
  "- Continuity language: what must stay consistent about a character, prop, or location once it's established.",
  "Draw on precise filmmaking vocabulary when it's the most efficient way to say what you mean — shot types (establishing, wide, medium, close-up, extreme close-up, over-the-shoulder, POV, two-shot, low-angle, high-angle, bird's-eye), camera movement (push-in, pull-back, tracking, dolly, pan, tilt, orbit, crane, handheld, static locked-off), lens/depth (shallow depth of field, deep focus, rack focus, background separation), lighting (golden-hour, backlight, rim light, low-key, high-key, practical, volumetric), and composition (rule of thirds, symmetry, leading lines, silhouette). Use these as tools for specificity, not decoration — a plain action line is still correct when nothing cinematic is actually happening.",
].join("\n");

const LENGTH_BRIEF: Record<GenerateScriptInput["length"], string> = {
  short:
    "Write a short film script: a tight, self-contained story told in roughly 3-6 scenes, storyboardable shot by shot in one sitting.",
  feature:
    "Write a full feature-length movie script: a complete three-act structure (setup, confrontation, resolution) with as many scenes as the story needs, room for subplots, and a fully realized arc for each major character.",
};

export function buildScriptPrompt({ idea, style, length }: GenerateScriptInput): string {
  return [
    "You are a commercial screenwriter-for-hire. Your client is a paying customer with a story idea, and the script needs to work as a real, producible movie — not a writing exercise.",
    "Develop the idea below into a genuinely engaging story with a clear hook, a beginning, middle, and end, and a satisfying turn or ending — don't just restate the idea, dramatize it.",
    style ? `Visual style for this project: ${style}.` : null,
    LENGTH_BRIEF[length],
    "Write the full script in standard screenplay format: scene headings (INT./EXT. LOCATION - DAY/NIGHT), brief action/description lines, and dialogue with the speaking character's name in capital letters on its own line directly above their line.",
    CINEMATIC_CRAFT_BRIEF,
    "Use a single blank line to separate elements (scene heading, action, character cue, dialogue). Never use manual spaces to indent or center text, and never output more than one consecutive blank line.",
    "Give characters distinct, believable voices.",
    "Also write a short, compelling title for the film.",
    "Customer's idea:",
    idea,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildBreakdownPrompt({
  scriptText,
  style,
  targetSceneDurationSeconds,
}: BreakdownScriptInput): string {
  return [
    "You are an Assistant Director preparing a scene breakdown sheet for a script, the document a production reads before any shot planning happens — not a storyboard artist, and not writing new shots or camera coverage.",
    style ? `Visual style for this project: ${style}.` : null,
    "Break the following script into ordered scenes, one per scene heading (INT./EXT. LOCATION - DAY/NIGHT). For each scene, extract:",
    "- scriptText: the verbatim script text for that scene, starting at its heading and running through to just before the next scene heading. Do not summarize, trim, or rewrite it — copy it exactly as written.",
    "- summary: a one or two sentence summary of what happens.",
    "- dialogue: the key dialogue lines, or null if the scene is non-verbal.",
    "- durationSeconds: a realistic estimate of the scene's screen time in seconds, based on its length and pacing (dialogue-heavy scenes run slower than action).",
    targetSceneDurationSeconds
      ? `The production has set a target of at most ${targetSceneDurationSeconds} seconds per scene. Design toward this — favor splitting a long beat into more scenes over inflating a single scene's duration — but treat it as a target, not a hard limit you must hit exactly; some scenes will legitimately need more or less.`
      : null,
    "Also extract the recurring characters, locations, and props referenced across the script as assets.",
    "Each asset's description is handed to an image model on its own, with no other asset's description alongside it for contrast — so it must fully specify what makes this asset look like itself and nobody/nothing else, not lean on the reader inferring a contrast from the rest of the cast. For characters in particular: two characters who share an age bracket, gender, and role (e.g. two 50s Nigerian businesswomen, two doctors) will render as visually near-identical unless each description calls out specific, individuating physical details — face shape, distinguishing marks (scar, mole, gap tooth), build, a specific hairstyle or feature — not just demographic/role/personality descriptors like \"50s, stern, businesswoman\" that could equally describe several other characters in the same script.",
    "For each scene, list which of those assets (by their exact name, verbatim) appear in it — this is what keeps a character/location/prop's generated appearance consistent across every scene it's in, so it needs to be accurate, not just a stylistic label.",
    "For every character asset that appears in a scene, also add a wardrobe entry describing what they're wearing in that specific scene: pull it verbatim if the script includes explicit wardrobe/costume notes (e.g. bracketed [WARDROBE: ...] blocks); otherwise infer a reasonable, specific costume description consistent with the character and the scene's context. Locations and props never get wardrobe entries.",
    "Script:",
    scriptText,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildEnhanceScriptPrompt({ scriptText, style, instructions }: EnhanceScriptInput): string {
  return [
    "You are a professional script doctor / story editor. A writer has given you their script exactly as it stands — your job is to enhance and polish it, not replace it with your own story.",
    "Preserve the writer's plot, character names, scene order, and intent. Do not invent new scenes, cut existing ones, or change the story's outcome unless the instructions below explicitly ask for it.",
    "Improve dialogue (sharper, more natural), pacing (tighten flabby action/description lines), and formatting (correct scene headings like INT./EXT. LOCATION - DAY/NIGHT, fix dialogue attribution, fix typos).",
    style ? `Visual style for this project: ${style}.` : null,
    instructions ? `The writer specifically asked you to focus on: ${instructions}` : null,
    CINEMATIC_CRAFT_BRIEF,
    "Return the complete enhanced script in standard screenplay format, and a short, compelling title.",
    "Use a single blank line to separate elements (scene heading, action, character cue, dialogue). Never use manual spaces to indent or center text, and never output more than one consecutive blank line.",
    "Original script:",
    scriptText,
  ]
    .filter(Boolean)
    .join("\n\n");
}
