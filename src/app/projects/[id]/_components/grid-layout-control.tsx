"use client";

import { STORYBOARD_GRID_PRESETS, type StoryboardGrid } from "@/lib/prompts/scene-storyboard";

export function GridLayoutControl({
  value,
  onChange,
}: {
  value: StoryboardGrid;
  onChange: (grid: StoryboardGrid) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Panel grid</span>
      <div className="flex flex-wrap items-center gap-1">
        {STORYBOARD_GRID_PRESETS.map((grid) => {
          const selected = grid.rows === value.rows && grid.cols === value.cols;
          return (
            <button
              key={`${grid.rows}x${grid.cols}`}
              type="button"
              onClick={() => onChange(grid)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "border-border-strong bg-primary/15 text-foreground"
                  : "border-border text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              <span
                className="grid gap-[1px] opacity-70"
                style={{ gridTemplateColumns: `repeat(${grid.cols}, 4px)`, gridTemplateRows: `repeat(${grid.rows}, 4px)` }}
              >
                {Array.from({ length: grid.rows * grid.cols }).map((_, cellIndex) => (
                  <span key={cellIndex} className="h-1 w-1 rounded-[1px] border border-current" />
                ))}
              </span>
              {grid.rows}x{grid.cols}
            </button>
          );
        })}
      </div>
    </div>
  );
}
