"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ExpandableTextarea } from "./expandable-textarea";

export type MentionAssetOption = {
  id: string;
  name: string;
  type: string;
  referenceImageUrl: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  character: "Character",
  location: "Location",
  prop: "Prop",
  upload: "Upload",
  image: "Generated image",
};

const MAX_RESULTS = 8;

/**
 * Scans a prompt for "@Name" occurrences matching known asset names and
 * returns the matched asset ids. Mention state lives in the prompt text
 * itself rather than a separately-tracked array — deleting "@Name" from
 * the prompt naturally drops that reference on the next generate, with
 * nothing else to keep in sync.
 */
export function extractMentionedAssetIds(prompt: string, options: MentionAssetOption[]): string[] {
  // Case-insensitive so both mention styles match: inline mode inserts
  // "@Name" in its original casing, screenplay mode inserts "@NAME" in caps.
  const haystack = prompt.toLowerCase();
  // Longest name first so "@Alexander Reed" isn't shadowed by a shorter
  // "@Alex" also present in the project.
  const sorted = [...options].filter((option) => option.name.trim()).sort((a, b) => b.name.length - a.name.length);
  const matched = new Set<string>();
  for (const option of sorted) {
    const needle = `@${option.name}`.toLowerCase();
    let searchFrom = 0;
    let found = false;
    while (!found) {
      const index = haystack.indexOf(needle, searchFrom);
      if (index === -1) break;
      // Require a word boundary right after the match so "@Alex" inside
      // "@Alexander Reed" doesn't also register as a hit for "Alex".
      const nextChar = prompt[index + needle.length];
      if (!nextChar || /\W/.test(nextChar)) {
        found = true;
        matched.add(option.id);
      } else {
        searchFrom = index + needle.length;
      }
    }
  }
  return Array.from(matched);
}

type MentionState = { open: boolean; query: string; mentionStart: number; activeIndex: number };

const CLOSED: MentionState = { open: false, query: "", mentionStart: -1, activeIndex: 0 };

/**
 * A scene prompt field where typing "@" opens an inline dropdown of the
 * project's characters/locations/props — picking one inserts "@Name" into
 * the prompt and (via extractMentionedAssetIds, read by the caller) adds
 * that asset's reference image to the generation request. This is a
 * trigger UI for picking a reference image, not something the image
 * provider itself parses out of the prompt text — see character-picker.tsx.
 */
export function PromptMentionField({
  value,
  onChange,
  options,
  placeholder,
  mentionStyle = "inline",
}: {
  value: string;
  onChange: (value: string) => void;
  options: MentionAssetOption[];
  placeholder?: string;
  /** "inline" inserts "@Name " (Scenes tab prompt). "screenplay" inserts "@NAME" (caps) on its own line, ready for a dialogue line underneath — script-style speaker tags for the Videos tab's dialogue prompt. */
  mentionStyle?: "inline" | "screenplay";
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<MentionState>(CLOSED);

  const matches = useMemo(() => {
    if (!mention.open) return [];
    const query = mention.query.toLowerCase();
    return options.filter((option) => option.name.toLowerCase().includes(query)).slice(0, MAX_RESULTS);
  }, [mention.open, mention.query, options]);

  function updateMentionState(text: string, cursor: number) {
    const uptoCursor = text.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf("@");
    if (atIndex === -1) {
      setMention(CLOSED);
      return;
    }
    const precedingChar = atIndex === 0 ? null : text[atIndex - 1];
    if (precedingChar && !/\s/.test(precedingChar)) {
      setMention(CLOSED);
      return;
    }
    const query = uptoCursor.slice(atIndex + 1);
    if (/\s/.test(query)) {
      setMention(CLOSED);
      return;
    }
    setMention({ open: true, query, mentionStart: atIndex, activeIndex: 0 });
  }

  function handleChange(next: string) {
    onChange(next);
    // The native input event already moved the DOM caret before this
    // fires, so textareaRef.current.selectionStart is accurate right now —
    // no need to wait a frame.
    const textarea = textareaRef.current;
    if (textarea) updateMentionState(next, textarea.selectionStart);
  }

  function handleSelect() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    updateMentionState(textarea.value, textarea.selectionStart);
  }

  function commitMention(option: MentionAssetOption) {
    const textarea = textareaRef.current;
    if (!textarea || mention.mentionStart === -1) return;
    const cursor = textarea.selectionStart;
    const before = value.slice(0, mention.mentionStart);
    const after = value.slice(cursor);
    const inserted = mentionStyle === "screenplay" ? `@${option.name.toUpperCase()}\n` : `@${option.name} `;
    onChange(`${before}${inserted}${after}`);
    setMention(CLOSED);
    const caret = before.length + inserted.length;
    // Wait a frame so the controlled value has re-rendered into the DOM
    // before moving the caret past where the (still-stale) DOM text ends.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention.open || matches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMention((prev) => ({ ...prev, activeIndex: (prev.activeIndex + 1) % matches.length }));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setMention((prev) => ({ ...prev, activeIndex: (prev.activeIndex - 1 + matches.length) % matches.length }));
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      commitMention(matches[mention.activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMention(CLOSED);
    }
  }

  return (
    <div className="relative">
      <ExpandableTextarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMention(CLOSED), 120)}
        placeholder={placeholder}
      />
      {mention.open && matches.length > 0 && (
        <div className="card-glow absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border p-1">
          {matches.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => {
                // preventDefault keeps focus (and the caret position we
                // need) on the textarea instead of shifting it to this
                // button, which would otherwise blur the field first.
                event.preventDefault();
                commitMention(option);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                index === mention.activeIndex
                  ? "bg-primary/15 text-foreground"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {option.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail from a signed Storage URL
                <img src={option.referenceImageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] text-muted">
                  {option.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate">{option.name}</span>
              <span className="shrink-0 text-xs text-muted-2">{TYPE_LABEL[option.type] ?? option.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
