import { generateText, Output } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { breakdownScriptSchema, generateScriptSchema } from "./schema";
import { buildBreakdownPrompt, buildEnhanceScriptPrompt, buildScriptPrompt } from "./script-prompt";
import type {
  BreakdownScriptInput,
  BreakdownScriptResult,
  EnhanceScriptInput,
  GenerateScriptInput,
  GenerateScriptResult,
  LLMProvider,
} from "./types";

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
const MODEL = "deepseek-chat";
// deepseek-chat defaults max_tokens to 4000 when unset and caps at 8000
// (confirmed against api-docs.deepseek.com) — a structured breakdown of a
// full script (each scene carrying its verbatim text, summary, wardrobe
// notes, etc.) routinely exceeds 4000 output tokens, which truncates the
// JSON mid-object. generateText then can't parse a complete output for a
// non-"stop" finishReason and throws AI_NoOutputGeneratedError with no
// indication it was actually a length cutoff. Request the documented max
// for every structured call here to leave as little truncation risk as
// the API allows.
const MAX_OUTPUT_TOKENS = 8000;

export const deepseekAdapter: LLMProvider = {
  async breakdownScript(input: BreakdownScriptInput): Promise<BreakdownScriptResult> {
    const { output } = await generateText({
      model: deepseek(MODEL),
      output: Output.object({ schema: breakdownScriptSchema }),
      prompt: buildBreakdownPrompt(input),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return output;
  },

  async generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
    const { output } = await generateText({
      model: deepseek(MODEL),
      output: Output.object({ schema: generateScriptSchema }),
      prompt: buildScriptPrompt(input),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return output;
  },

  async enhanceScript(input: EnhanceScriptInput): Promise<GenerateScriptResult> {
    const { output } = await generateText({
      model: deepseek(MODEL),
      output: Output.object({ schema: generateScriptSchema }),
      prompt: buildEnhanceScriptPrompt(input),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return output;
  },
};
