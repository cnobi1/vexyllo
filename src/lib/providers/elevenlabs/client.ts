// ElevenLabs text-to-speech — thin authenticated-fetch wrapper, mirroring
// byteplus/client.ts and alibaba/client.ts's shape. ElevenLabs auths via an
// `xi-api-key` header (not Authorization: Bearer) and its TTS endpoint
// returns raw audio bytes, not JSON, so this exposes both a JSON helper
// (for /v1/voices) and a raw-bytes helper (for /v1/text-to-speech/*).
const BASE_URL = "https://api.elevenlabs.io/v1";

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  return key;
}

async function elevenlabsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "xi-api-key": apiKey(),
      ...init.headers,
    },
  });
}

export async function elevenlabsJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await elevenlabsFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body as { detail?: { message?: string } | string } | null)?.detail ??
      `ElevenLabs request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : (message.message ?? `ElevenLabs request failed (${response.status})`));
  }
  return body as T;
}

/** Returns raw audio bytes (audio/mpeg) — used by the TTS endpoint, which doesn't return JSON on success. */
export async function elevenlabsAudio(path: string, init: RequestInit = {}): Promise<Buffer> {
  const response = await elevenlabsFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { detail?: { message?: string } | string } | null)?.detail ??
      `ElevenLabs request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : (message.message ?? `ElevenLabs request failed (${response.status})`));
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
