export interface StoryboardGrid {
  rows: number;
  cols: number;
}

/** Selectable grid layouts for a scene's storyboard sheet, smallest first. */
export const STORYBOARD_GRID_PRESETS: StoryboardGrid[] = [
  { rows: 1, cols: 1 },
  { rows: 1, cols: 2 },
  { rows: 2, cols: 2 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 2 },
  { rows: 3, cols: 3 },
];

/**
 * Smallest preset grid that fits one panel per shot, capped at the largest
 * preset (3x3 = 9 panels) — beyond that a single sheet stops being legible,
 * so extra shots just share panels rather than growing the grid further.
 */
export function autoGridForShotCount(shotCount: number): StoryboardGrid {
  const n = Math.max(1, shotCount);
  return STORYBOARD_GRID_PRESETS.find((grid) => grid.rows * grid.cols >= n) ?? STORYBOARD_GRID_PRESETS[STORYBOARD_GRID_PRESETS.length - 1];
}

/** Maps a panel grid's shape to the closest supported image aspect ratio (see byteplus/image-sizes.ts). */
export function gridToRatio(grid: StoryboardGrid): string {
  if (grid.cols > grid.rows) return "16:9";
  if (grid.rows > grid.cols) return "9:16";
  return "1:1";
}

export interface StoryboardShot {
  cameraAngle: string | null;
  description: string | null;
}

/**
 * Assigns shots to panels in order, one shot per panel while there's room;
 * once shots outnumber panels, later shots are grouped onto the tail
 * panels (evenly, `ceil(shots/panels)` per panel) instead of being dropped
 * — every shot's camera angle still makes it into the prompt somewhere.
 */
function distributeShotsToPanels(shots: StoryboardShot[], panelCount: number): StoryboardShot[][] {
  const groups: StoryboardShot[][] = Array.from({ length: panelCount }, () => []);
  if (shots.length <= panelCount) {
    shots.forEach((shot, i) => groups[i].push(shot));
    return groups;
  }
  const perPanel = Math.ceil(shots.length / panelCount);
  for (let i = 0; i < panelCount; i++) {
    groups[i] = shots.slice(i * perPanel, (i + 1) * perPanel);
  }
  return groups;
}

/**
 * Wraps a scene's own prompt into a full storyboard-sheet layout prompt —
 * the structural instructions (grid shape, panel borders, consistency)
 * that apply regardless of the scene's content, mirroring how
 * character-sheet.ts wraps a character description into a reference-board
 * prompt. Visual style is layered on separately via GenerateImageInput.style.
 * `shots` (the scene's breakdown, in order) drives a per-panel camera-angle
 * breakdown even though the Scenes tab UI no longer displays shot text —
 * the customer still expects each shot's camera angle to shape its panel.
 */
export function buildSceneStoryboardPrompt(description: string, grid: StoryboardGrid, shots: StoryboardShot[] = []): string {
  const panelCount = grid.rows * grid.cols;
  const panelGroups = distributeShotsToPanels(shots, panelCount);
  const panelLines = panelGroups
    .map((group, i) => {
      if (group.length === 0) {
        return `Panel ${i + 1}: continue the scene's action, matching the visual style and pacing of the surrounding panels.`;
      }
      const detail = group
        .map((shot) => {
          const angle = shot.cameraAngle ? `[${shot.cameraAngle}] ` : "";
          return `${angle}${shot.description ?? "continue the scene's action"}`.trim();
        })
        .join(" Then: ");
      return `Panel ${i + 1}: ${detail}`;
    })
    .join("\n");

  return `Create a single professional film storyboard sheet for the following scene, laid out as one image containing a ${grid.rows}x${grid.cols} grid of ${panelCount} numbered panels (reading order: left to right, top to bottom).

SCENE: ${description}

STORYBOARD SHEET LAYOUT:
Draw exactly ${panelCount} panels arranged in ${grid.rows} row(s) by ${grid.cols} column(s), separated by thin black panel borders with a small panel number in the corner of each panel. Each panel depicts one beat/moment of the scene's action, progressing in order from panel 1 to panel ${panelCount}.

PANEL-BY-PANEL BREAKDOWN (render each panel's camera framing exactly as specified — "[wide shot]", "[close-up]", "[over-the-shoulder]", etc. describe the shot's camera angle):
${panelLines}

IMPORTANT CONSISTENCY:
Keep every character, location, and prop visually identical across all panels — the same faces, wardrobe, set dressing, and props must appear in every panel featuring them, as if drawn by the same storyboard artist in one sitting. Do not redesign or reinterpret anything between panels.

RENDERING QUALITY:
Professional film pre-production storyboard art, clean linework, clear staging and camera framing within each panel, legible at a glance, high resolution.`;
}
