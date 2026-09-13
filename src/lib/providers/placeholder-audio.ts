/**
 * Builds a minimal valid silent WAV file as a data: URI — the audio
 * equivalent of placeholder-svg.ts's mock image/video frame. Real speech
 * duration varies with text length; the mock doesn't need to simulate that,
 * it just needs to be a playable <audio> src with no external call.
 */
export function buildSilentWavDataUri(durationSeconds = 1): string {
  const sampleRate = 8000;
  const numSamples = Math.max(1, Math.round(sampleRate * durationSeconds));
  const dataSize = numSamples * 2; // 16-bit mono PCM
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  // Remaining bytes (the PCM samples themselves) are already zeroed by
  // Buffer.alloc, which is exactly silence.

  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}
