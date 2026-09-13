import { elevenlabsAudio, elevenlabsJson } from "../elevenlabs/client";
import type { AudioProvider, GenerateSpeechInput, GenerateSpeechResult } from "./types";

export interface ElevenLabsVoiceOption {
  id: string;
  name: string;
  /** A short public sample clip of this voice (ElevenLabs-hosted, no API key needed to fetch) — lets the Characters tab's voice picker play a preview before assigning it. Null on the rare voice with none. */
  previewUrl: string | null;
}

/**
 * Backs the Characters tab's per-character voice picker. Returns [] (not a
 * thrown error) when ELEVENLABS_API_KEY isn't configured — an unconfigured
 * key shouldn't break the whole Characters page for a project that isn't
 * using voice yet, it should just show an empty/disabled picker.
 */
export async function listElevenLabsVoices(): Promise<ElevenLabsVoiceOption[]> {
  if (!process.env.ELEVENLABS_API_KEY) return [];
  try {
    const data = await elevenlabsJson<{ voices: { voice_id: string; name: string; preview_url: string | null }[] }>(
      "/voices",
    );
    return data.voices.map((voice) => ({ id: voice.voice_id, name: voice.name, previewUrl: voice.preview_url }));
  } catch {
    return [];
  }
}

export const elevenlabsAudioAdapter: AudioProvider = {
  name: "elevenlabs",
  async generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult> {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }
    // ElevenLabs' TTS endpoint returns finished audio/mpeg bytes directly in
    // the response body (no task id, no polling) — base64-encode into a
    // data: URI rather than uploading anywhere first, since
    // copy-to-storage.ts's copyToMediaBucket already downloads a mock
    // adapter's data: URI today (see its own module comment) and treats it
    // identically to a real provider URL.
    const bytes = await elevenlabsAudio(`/text-to-speech/${encodeURIComponent(input.voiceId)}`, {
      method: "POST",
      body: JSON.stringify({ text: input.text, model_id: input.modelId }),
    });
    return {
      url: `data:audio/mpeg;base64,${bytes.toString("base64")}`,
      characterCount: input.text.length,
    };
  },
};
