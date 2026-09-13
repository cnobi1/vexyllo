import { elevenlabsAudioAdapter } from "./elevenlabs-adapter";
import { mockAudioAdapter } from "./mock-adapter";
import type { AudioProvider } from "./types";

// Shares its provider-key union with GenerateVideoInput/ImageProviderKey/
// generation_models (rather than a narrower audio-only type) so callers can
// pass a GenerationModel's providerKey straight through without casting —
// see image/index.ts's ImageProviderKey comment for the fuller reasoning.
export type AudioProviderKey = "byteplus" | "gateway" | "alibaba" | "mock" | "elevenlabs";

// Same plain providerKey dispatch as image/video (see their index.ts) — the
// caller already knows which provider a chosen generation_models row backs
// onto, so this isn't a fallback chain, and an unconfigured provider's own
// adapter throws rather than the lookup silently substituting another one.
export function getAudioProvider(providerKey: AudioProviderKey): AudioProvider {
  switch (providerKey) {
    case "elevenlabs":
      return elevenlabsAudioAdapter;
    case "mock":
      return mockAudioAdapter;
    case "byteplus":
    case "gateway":
    case "alibaba":
      throw new Error(`${providerKey} does not have an audio generation adapter — this model is misconfigured.`);
  }
}

export { listElevenLabsVoices } from "./elevenlabs-adapter";
export type { AudioProvider, GenerateSpeechInput, GenerateSpeechResult } from "./types";
export type { ElevenLabsVoiceOption } from "./elevenlabs-adapter";
