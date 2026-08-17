export interface GenerateImageInput {
  prompt: string;
  style: string | null;
  /** Character/location/prop reference images to keep generated output visually consistent. */
  referenceImageUrls?: string[];
  /** Number of images to generate in this request. Defaults to 1. */
  quantity?: number;
  /** Aspect ratio hint ("16:9"/"9:16"/"1:1"). Each adapter translates this into whatever its own API expects (BytePlus wants pixel "<width>x<height>"; Google wants the ratio token as-is). Omit to let the model infer from the prompt. */
  ratio?: string;
}

export interface GeneratedImage {
  url: string;
  cost: number | null;
}

export interface GenerateImageResult {
  /**
   * Always populated, even for quantity 1 — batch generation is a
   * first-class capability, so callers never special-case shape by
   * quantity. A provider may legitimately return fewer images than
   * requested (e.g. a batch call with some per-image failures); it is the
   * caller's responsibility to reconcile that against however many ledger
   * rows it pre-created.
   */
  images: GeneratedImage[];
}

export interface ImageProvider {
  name: string;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}
