import { z } from "zod";

export const generateScriptSchema = z.object({
  title: z.string().describe("A short, compelling title for the film"),
  scriptText: z
    .string()
    .describe(
      "The complete script in standard screenplay format: scene headings " +
        "(e.g. INT. KITCHEN - NIGHT), brief action/description lines, and dialogue with " +
        "the speaking character's name in capital letters on its own line directly above their line.",
    ),
});

export const breakdownScriptSchema = z.object({
  assets: z
    .array(
      z.object({
        type: z
          .enum(["character", "location", "prop"])
          .describe("What kind of recurring story element this is"),
        name: z.string().describe("Short display name"),
        description: z
          .string()
          .describe(
            "Visual description usable as an image-generation reference later. Must individuate this " +
              "specific asset with concrete, distinguishing physical details (for characters: face shape, " +
              "distinguishing marks, build, specific hairstyle — not just age/role/profession), not a generic " +
              "archetype description that could equally describe another asset of the same type in this script.",
          ),
      }),
    )
    .describe("Recurring characters, locations, and props found in the script"),
  scenes: z
    .array(
      z.object({
        order: z.number().int().describe("1-based position of this scene in the script"),
        summary: z.string().describe("One or two sentence summary of what happens in the scene"),
        dialogue: z
          .string()
          .nullable()
          .describe("Key dialogue lines from the scene, or null if the scene is non-verbal"),
        scriptText: z
          .string()
          .describe(
            "The verbatim script text for this scene: its scene heading through to just before the next scene heading",
          ),
        durationSeconds: z
          .number()
          .min(1)
          .describe("Estimated screen time this scene occupies, in seconds — a realistic pacing estimate, not a hard measurement"),
        assetNames: z
          .array(z.string())
          .describe(
            "Exact names, verbatim from the assets list above, of any characters/locations/props appearing in this scene",
          ),
        wardrobe: z
          .array(
            z.object({
              characterName: z.string().describe("Exact name, verbatim, of a character asset appearing in this scene"),
              description: z.string().describe("What that character is wearing in this scene"),
            }),
          )
          .describe("Per-character costume/wardrobe notes for this scene — characters only, not locations or props"),
      }),
    )
    .describe("Ordered scenes making up the script"),
});
