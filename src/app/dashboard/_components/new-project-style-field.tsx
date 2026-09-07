"use client";

import { useState } from "react";
import { PRESET_STYLES, CUSTOM_STYLE_VALUE } from "@/lib/project-styles";

const fieldClasses =
  "rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-border-strong";

/**
 * Lets the style be picked at creation time instead of only afterward via
 * the in-project StyleSelector — every generation downstream reads
 * projects.style, so setting it up front saves a trip back to change it
 * before the first generation.
 */
export function NewProjectStyleField() {
  const [selected, setSelected] = useState("");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="style" className="text-sm text-muted">
        Style <span className="text-muted-2">(optional)</span>
      </label>
      <select
        id="style"
        name="style"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className={fieldClasses}
      >
        <option value="">No style</option>
        {PRESET_STYLES.map((style) => (
          <option key={style} value={style}>
            {style}
          </option>
        ))}
        <option value={CUSTOM_STYLE_VALUE}>Custom style…</option>
      </select>
      {selected === CUSTOM_STYLE_VALUE && (
        <input
          name="customStyle"
          autoFocus
          placeholder="e.g. noir, anime, watercolor…"
          className={`${fieldClasses} placeholder:text-muted-2`}
        />
      )}
    </div>
  );
}
