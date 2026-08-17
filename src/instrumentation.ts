import { createGateway } from "ai";
import { Agent } from "undici";

// Video generation can run past Node's default 5-minute Undici fetch
// timeout (per the AI Gateway docs). Registering a gateway with an extended
// timeout as the global default provider lets every adapter keep using
// plain "provider/model" strings with no call-site changes.
export function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    globalThis.AI_SDK_DEFAULT_PROVIDER = createGateway({
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          dispatcher: new Agent({
            headersTimeout: 15 * 60 * 1000,
            bodyTimeout: 15 * 60 * 1000,
          }),
        } as RequestInit),
    });
  }
}
