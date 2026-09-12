import { deepseekAdapter } from "./deepseek-adapter";
import { gatewayAdapter } from "./gateway-adapter";
import { mockLLMAdapter } from "./mock-adapter";
import type { LLMProvider } from "./types";

// Shared priority chain for every LLM use in the app (script breakdown,
// script writing, script enhancement): DeepSeek if configured, else the AI
// Gateway, else mock.
//
// The Gateway rung must not be gated on AI_GATEWAY_API_KEY alone: the
// @ai-sdk/gateway client registered in src/instrumentation.ts is created
// with no explicit apiKey, so it authenticates via OIDC by default
// (Vercel's zero-config OIDC federation) whenever an explicit key isn't
// set — that's the SDK's own auth priority (AI_GATEWAY_API_KEY, then OIDC),
// not a fallback this app has to implement. @vercel/oidc's token lookup
// (node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js) reads the
// per-request `x-vercel-oidc-token` header first — set automatically by the
// Vercel runtime on every deployed request, not by us — and only falls
// back to a literal process.env.VERCEL_OIDC_TOKEN, which is how local dev
// gets it after `vercel env pull` (a ~24h snapshotted token written to
// .env.local). So detecting "OIDC will work" here means checking
// process.env.VERCEL (Vercel's standard "we are a deployed function" flag,
// present on every Production/Preview request — the header carries the
// actual token at call time) OR process.env.VERCEL_OIDC_TOKEN (the local-
// dev path). Without this, a production deploy with no DEEPSEEK_API_KEY and
// no explicit AI_GATEWAY_API_KEY would silently drop to mock even though
// Gateway would have worked via OIDC.
export function getLLMProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) return deepseekAdapter;
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN) return gatewayAdapter;
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
