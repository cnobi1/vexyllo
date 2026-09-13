import { buildSilentWavDataUri } from "../placeholder-audio";
import type { AudioProvider, GenerateSpeechInput, GenerateSpeechResult } from "./types";

// ~15 chars/sec is a rough speaking-rate approximation — the mock doesn't
// need to be accurate, just proportionate, so a short line doesn't produce
// the same clip length as a long one.
const CHARS_PER_SECOND = 15;

export const mockAudioAdapter: AudioProvider = {
  name: "mock",
  async generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult> {
    const durationSeconds = Math.max(1, input.text.length / CHARS_PER_SECOND);
    return {
      url: buildSilentWavDataUri(durationSeconds),
      characterCount: input.text.length,
    };
  },
};
