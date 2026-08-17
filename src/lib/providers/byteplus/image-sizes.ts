// BytePlus Seedream's `size` param wants explicit "<width>x<height>" pixels,
// not an aspect-ratio token (unlike the video "ratio" param — see
// video/byteplus-adapter.ts). These presets are a best-effort mapping from
// the RatioControl's aspect-ratio options to pixel sizes and have not been
// independently verified against live docs for the currently configured
// BYTEPLUS_IMAGE_MODEL — same caveat as the adapters' COST_PER_IMAGE
// constants. Re-check if generation starts failing with a size/dimension error.
const RATIO_TO_IMAGE_SIZE: Record<string, string> = {
  "1:1": "2048x2048",
  "16:9": "2560x1440",
  "9:16": "1440x2560",
};

/** Maps a RatioControl value ("", "16:9", "9:16", "1:1") to a BytePlus `size` string. Empty/unknown ratio returns undefined so the model infers its own size. */
export function ratioToImageSize(ratio: string): string | undefined {
  return RATIO_TO_IMAGE_SIZE[ratio];
}
