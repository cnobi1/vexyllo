"use client";

import { Fragment, useRef, useState, type ChangeEvent, type UIEvent } from "react";
import { isHighlightedScriptLine } from "@/lib/script-highlight";

const sharedClasses =
  "w-full whitespace-pre-wrap break-words rounded-lg border px-3 py-2 font-mono text-sm leading-6";

export function ScriptEditor({
  id,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue: string;
  rows: number;
  placeholder: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const backdropRef = useRef<HTMLPreElement>(null);

  const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = event.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  const lines = value.split("\n");

  return (
    <div className="relative rounded-lg border border-border bg-background/60 focus-within:border-border-strong">
      <pre
        ref={backdropRef}
        aria-hidden
        className={`${sharedClasses} pointer-events-none absolute inset-0 overflow-hidden border-transparent bg-transparent text-foreground`}
      >
        {lines.map((line, i) => (
          <Fragment key={i}>
            <span className={isHighlightedScriptLine(line) ? "font-bold text-foreground" : undefined}>
              {line}
            </span>
            {i < lines.length - 1 ? "\n" : null}
          </Fragment>
        ))}
      </pre>
      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        className={`${sharedClasses} relative resize-none border-transparent bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-2`}
      />
    </div>
  );
}
