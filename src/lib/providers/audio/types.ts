export interface GenerateSpeechInput {
  text: string;
  /** provider_model_id of the resolved generation_models row (e.g. ElevenLabs' "eleven_multilingual_v2"). */
  modelId: string;
  /** The character's assigned ElevenLabs voice id (assets.elevenlabs_voice_id) — required, never a fallback/default voice (see AudioProvider.generateSpeech). */
  voiceId: string;
}

export interface GenerateSpeechResult {
  /** A provider URL, or (mock/ElevenLabs both) a data: URI — copy-to-storage.ts already handles both. */
  url: string;
  /** Input character count — the billing unit for ElevenLabs' character_multiplier credit_cost_mode (see credit-costs.ts). */
  characterCount: number;
}

export interface AudioProvider {
  name: string;
  /**
   * Single blocking call — unlike video, ElevenLabs' TTS endpoint returns
   * finished audio synchronously in one request, so there's no task/poll
   * split and no Workflow DevKit involvement needed here.
   */
  generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult>;
}
