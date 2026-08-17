const BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

// Plain fetch, not routed through the Vercel AI SDK/Gateway (src/instrumentation.ts
// only extends timeouts for that path — BytePlus is never called through it).
// Every individual BytePlus call here is short: one POST for image
// generation, one POST to create a video task, and fast GET polls. Overall
// video generation time is handled by Workflow's retry/backoff polling (see
// src/lib/workflows/generate-video.ts), not by keeping one HTTP request
// open, so Node's default fetch timeout is fine for all of these.
export async function byteplusFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.BYTEPLUS_API_KEY;
  if (!apiKey) {
    throw new Error("BYTEPLUS_API_KEY is not configured");
  }
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...init.headers,
    },
  });
}

export async function byteplusJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await byteplusFetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      `BytePlus request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
