import { byteplusVideoAdapter } from "./byteplus-adapter";
import { gatewayVideoAdapter } from "./gateway-adapter";
import { alibabaVideoAdapter } from "./alibaba-adapter";
import { mockVideoAdapter } from "./mock-adapter";
import type { GenerateVideoInput, VideoProvider } from "./types";

// Per-generation model choice (see generation_models table) replaced the old
// env-var-priority "first configured key wins" lookup — the caller already
// knows which provider a chosen catalog row backs onto, so this is now a
// plain dispatch, not a fallback chain. If the selected provider's key isn't
// configured, the adapter itself throws a clear config error (see each
// adapter's own check) rather than silently substituting a different
// provider/model's cost and behavior.
export function getVideoProvider(providerKey: GenerateVideoInput["providerKey"]): VideoProvider {
  switch (providerKey) {
    case "byteplus":
      return byteplusVideoAdapter;
    case "gateway":
      return gatewayVideoAdapter;
    case "alibaba":
      return alibabaVideoAdapter;
    case "mock":
      return mockVideoAdapter;
  }
}

export type {
  GenerateVideoInput,
  VideoProvider,
  VideoTaskHandle,
  VideoTaskResult,
  VideoTaskStatus,
} from "./types";
