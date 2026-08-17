export interface BreakdownScriptInput {
  scriptText: string;
  style: string | null;
  /** Soft cap on a scene's total estimated screen time, in seconds. Null/omitted = no cap. */
  targetSceneDurationSeconds?: number | null;
}

export interface BreakdownSceneWardrobe {
  /** Must match a character BreakdownAsset.name, verbatim (same convention as assetNames). */
  characterName: string;
  description: string;
}

export interface BreakdownScene {
  order: number;
  summary: string;
  dialogue: string | null;
  /** Verbatim script text for this scene: its heading through to just before the next one. */
  scriptText: string;
  /** Estimated screen time this scene occupies, in seconds — a pacing estimate, not a measurement. */
  durationSeconds: number;
  /** Exact names (from BreakdownAsset.name) of assets appearing in this scene, for reference-image consistency. */
  assetNames: string[];
  /** Per-character costume notes for this scene (characters only, not locations/props). */
  wardrobe: BreakdownSceneWardrobe[];
}

export interface BreakdownAsset {
  type: "character" | "location" | "prop";
  name: string;
  description: string;
}

export interface BreakdownScriptResult {
  assets: BreakdownAsset[];
  scenes: BreakdownScene[];
}

export interface GenerateScriptInput {
  idea: string;
  style: string | null;
  /** "short" for a short film (a few scenes), "feature" for a full feature-length movie. */
  length: "short" | "feature";
}

export interface GenerateScriptResult {
  title: string;
  scriptText: string;
}

export interface EnhanceScriptInput {
  scriptText: string;
  style: string | null;
  /** Optional free-text guidance from the writer, e.g. "punch up the dialogue in Act 2". */
  instructions: string | null;
}

export interface LLMProvider {
  breakdownScript(input: BreakdownScriptInput): Promise<BreakdownScriptResult>;
  generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult>;
  enhanceScript(input: EnhanceScriptInput): Promise<GenerateScriptResult>;
}
