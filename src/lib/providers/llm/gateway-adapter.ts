import { generateText, Output } from "ai";
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

const MODEL = "anthropic/claude-sonnet-5";

export const gatewayAdapter: LLMProvider = {
  async breakdownScript(input: BreakdownScriptInput): Promise<BreakdownScriptResult> {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: breakdownScriptSchema }),
      prompt: buildBreakdownPrompt(input),
    });

    return output;
  },

  async generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: generateScriptSchema }),
      prompt: buildScriptPrompt(input),
    });

    return output;
  },

  async enhanceScript(input: EnhanceScriptInput): Promise<GenerateScriptResult> {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: generateScriptSchema }),
      prompt: buildEnhanceScriptPrompt(input),
    });

    return output;
  },
};
