/**
 * Wraps a character's own short description into a full multi-panel
 * character-design reference board prompt — the structural layout the
 * customer wants for every character sheet regardless of story or chosen
 * visual style (style itself is layered on separately by the image
 * provider adapters via `GenerateImageInput.style`, not baked in here).
 */
export function buildCharacterSheetPrompt(description: string, name: string): string {
  return `Create a professional cinematic character reference sheet for the following original character, designed for a recurring role in a film production.

CHARACTER: ${name}
CHARACTER DESCRIPTION: ${description}

CHARACTER SHEET LAYOUT:
Create one clean, professional character-design reference board containing:
1. Full-body front view
2. Full-body back view
3. Full-body left-side profile
4. Full-body right-side profile
5. Head-and-shoulders portrait
6. Close-up facial expression sheet showing neutral, happy, concerned, angry, surprised, and determined expressions
7. Three-quarter facial view
8. Detailed hairstyle (and facial hair, if applicable) reference
9. Clothing and accessory breakdown
10. Color palette showing skin tone, hair, eyes, clothing, and accessories

IMPORTANT CHARACTER CONSISTENCY:
The same person must appear in every panel. Maintain identical facial structure, skin tone, hairstyle, body proportions, clothing, and physical characteristics across every view. Do not redesign or reinterpret the character between panels.

IMPORTANT INDIVIDUALITY:
Render this as one specific, particular person, not a generic type or stock-photo model for their demographic/role. Where the character description above is broad or archetypal, make concrete, distinctive choices of your own for facial structure, features, and build rather than defaulting to the most average/generic face for that age, gender, and profession — this character must be visually distinguishable from any other character sheet generated for this same production, even one described with similar age, role, or wardrobe.

RENDERING QUALITY:
Professional film pre-production reference sheet, natural anatomy and proportions, realistic texture and detail appropriate to the visual style, clean neutral studio background, soft even studio lighting, subtle shadows, high-end visual development artwork, extremely detailed, sharp focus, high resolution.

COMPOSITION:
Organize all views in a clean professional character-sheet grid with consistent spacing. Show the entire body without cropping in the full-body views. Keep the character large enough to clearly see facial and clothing details. Use a neutral standing pose for the front, back, and side views. Keep the presentation clean and uncluttered.`;
}
