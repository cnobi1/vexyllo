import { deepseekAdapter } from "./deepseek-adapter";
import { gatewayAdapter } from "./gateway-adapter";
import { mockLLMAdapter } from "./mock-adapter";
import type { LLMProvider } from "./types";

// Shared priority chain for every LLM use in the app (script breakdown,
// script writing, script enhancement): DeepSeek if configured, else the AI
// Gateway, else mock.
export function getLLMProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) return deepseekAdapter;
  if (process.env.AI_GATEWAY_API_KEY) return gatewayAdapter;
  return mockLLMAdapter;
}

export function getScriptProvider(): Pick<LLMProvider, "generateScript" | "enhanceScript"> {
  return getLLMProvider();
}

export type {
  BreakdownAsset,
  BreakdownScene,
  BreakdownSceneWardrobe,
  BreakdownScriptInput,
  BreakdownScriptResult,
  EnhanceScriptInput,
  GenerateScriptInput,
  GenerateScriptResult,
  LLMProvider,
} from "./types";
