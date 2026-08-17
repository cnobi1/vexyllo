/**
 * Wraps a prop's own short description into a clean product/reference-shot
 * prompt — props are meant to be dropped into other generations as a visual
 * reference for "this exact object," so the shot must isolate the item on a
 * plain background with nothing else in frame, unlike character/location
 * sheets which are deliberately scenic. See character-sheet.ts for the
 * equivalent character wrapper.
 */
export function buildPropSheetPrompt(description: string, name: string): string {
  return `Create a clean product-reference photo of a single prop for use in film pre-production.

PROP: ${name}
PROP DESCRIPTION: ${description}

COMPOSITION:
Show only this one object, fully in frame, centered, with no cropping. Do not include any person, hand, character, other prop, furniture, environment, or set dressing anywhere in the shot — the object must be the only thing visible.

BACKGROUND:
Pure plain white background, no shadows on the background, no gradient, no texture, no props or scenery of any kind behind or around the object.

RENDERING QUALITY:
Professional studio product photography, soft even studio lighting, subtle contact shadow directly under the object only, sharp focus, high resolution, accurate color and material detail, extremely detailed.`;
}
