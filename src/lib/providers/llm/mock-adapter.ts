import type {
  BreakdownScriptInput,
  BreakdownScriptResult,
  EnhanceScriptInput,
  GenerateScriptInput,
  GenerateScriptResult,
  LLMProvider,
} from "./types";

function splitIntoScenes(scriptText: string): string[] {
  const paragraphs = scriptText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [scriptText.trim()];
}

export const mockLLMAdapter: LLMProvider = {
  async breakdownScript({
    scriptText,
    targetSceneDurationSeconds,
  }: BreakdownScriptInput): Promise<BreakdownScriptResult> {
    // Simulated latency so the UI's pending state is visibly exercised.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const paragraphs = splitIntoScenes(scriptText);

    return {
      assets: [
        {
          type: "character",
          name: "Placeholder Protagonist",
          description:
            "Mock asset — no LLM provider configured. Set AI_GATEWAY_API_KEY to extract real characters, locations, and props.",
        },
      ],
      scenes: paragraphs.map((paragraph, index) => ({
        order: index + 1,
        summary: paragraph.length > 160 ? `${paragraph.slice(0, 157)}...` : paragraph,
        dialogue: null,
        scriptText: paragraph,
        durationSeconds: targetSceneDurationSeconds ?? 20,
        assetNames: ["Placeholder Protagonist"],
        wardrobe: [],
      })),
    };
  },

  async generateScript({ idea, length }: GenerateScriptInput): Promise<GenerateScriptResult> {
    // Simulated latency so the UI's pending state is visibly exercised.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const trimmedIdea = idea.trim();
    const title = trimmedIdea.length > 48 ? `${trimmedIdea.slice(0, 45)}...` : trimmedIdea || "Untitled";

    const scriptText = [
      "INT. LOCATION - DAY",
      "",
      `Mock ${length === "feature" ? "feature-length" : "short film"} script — no LLM provider configured. Set DEEPSEEK_API_KEY or AI_GATEWAY_API_KEY to generate a real story from this idea:`,
      `"${trimmedIdea}"`,
      "",
      "PROTAGONIST",
      "This is placeholder dialogue standing in for the real, AI-written scene.",
      "",
      "INT. LOCATION - LATER",
      "",
      "SUPPORTING CHARACTER",
      "And this is a second placeholder line, so the format still reads as a dialogue exchange.",
    ].join("\n");

    return { title, scriptText };
  },

  async enhanceScript({ scriptText }: EnhanceScriptInput): Promise<GenerateScriptResult> {
    // Simulated latency so the UI's pending state is visibly exercised.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const firstLine = scriptText.trim().split("\n")[0]?.slice(0, 48) || "Untitled";

    return {
      title: firstLine,
      scriptText: `[MOCK ENHANCE — no LLM provider configured. Set DEEPSEEK_API_KEY or AI_GATEWAY_API_KEY for real AI polishing.]\n\n${scriptText}`,
    };
  },
};
