// Alibaba Cloud Model Studio (DashScope) — thin authenticated-fetch wrapper,
// mirroring byteplus/client.ts's shape. Used today only by the video Wan 3.0
// adapter (see providers/video/alibaba-adapter.ts); no image models are
// wired to this provider.
//
// The base host is workspace- and region-scoped (unlike BytePlus's fixed
// BASE_URL) — confirmed via the create-task curl example the model catalog
// was seeded from: `https://{workspaceId}.{region}.maas.aliyuncs.com/api/v1`.
const DEFAULT_REGION = "ap-southeast-1";

function baseUrl(): string {
  const workspaceId = process.env.ALIBABA_WORKSPACE_ID;
  if (!workspaceId) {
    throw new Error("ALIBABA_WORKSPACE_ID is not configured");
  }
  const region = process.env.ALIBABA_REGION || DEFAULT_REGION;
  return `https://${workspaceId}.${region}.maas.aliyuncs.com/api/v1`;
}

export async function alibabaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.ALIBABA_API_KEY;
  if (!apiKey) {
    throw new Error("ALIBABA_API_KEY is not configured");
  }
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...init.headers,
    },
  });
}

export async function alibabaJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await alibabaFetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { message?: string } | null)?.message ?? `Alibaba request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
