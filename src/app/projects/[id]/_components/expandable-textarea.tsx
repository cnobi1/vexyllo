"use client";

import { forwardRef, useState, type TextareaHTMLAttributes } from "react";

function MaximizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
      <path
        d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M9 21v-3a2 2 0 0 0-2-2H4M15 21v-3a2 2 0 0 1 2-2h3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ExpandableTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows"> & {
  value: string;
  onChange: (value: string) => void;
  collapsedRows?: number;
  expandedRows?: number;
};

/**
 * A prompt textarea with a manual expand/collapse toggle (top-right icon)
 * instead of auto-grow-while-typing — lets the customer pull up the full
 * prompt to read/edit it on demand without every field growing as they
 * type. Shared by the Scenes tab's per-shot prompt and the Assets tab's
 * per-asset description (both double as the generation prompt).
 */
export const ExpandableTextarea = forwardRef<HTMLTextAreaElement, ExpandableTextareaProps>(
  function ExpandableTextarea({ value, onChange, collapsedRows = 2, expandedRows = 10, className, ...rest }, ref) {
    const [expanded, setExpanded] = useState(false);

    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={expanded ? expandedRows : collapsedRows}
          className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong ${expanded ? "resize-y" : "resize-none"} ${className ?? ""}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse prompt" : "Expand prompt"}
          title={expanded ? "Collapse" : "Expand"}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {expanded ? <MinimizeIcon /> : <MaximizeIcon />}
        </button>
      </div>
    );
  },
);
