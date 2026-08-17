import { byteplusVideoAdapter } from "./byteplus-adapter";
import { gatewayVideoAdapter } from "./gateway-adapter";
import { mockVideoAdapter } from "./mock-adapter";
import type { VideoProvider } from "./types";

export function getVideoProvider(): VideoProvider {
  if (process.env.BYTEPLUS_API_KEY) return byteplusVideoAdapter;
  if (process.env.AI_GATEWAY_API_KEY) return gatewayVideoAdapter;
  return mockVideoAdapter;
}

export type {
  GenerateVideoInput,
  VideoProvider,
  VideoTaskHandle,
  VideoTaskResult,
  VideoTaskStatus,
} from "./types";
