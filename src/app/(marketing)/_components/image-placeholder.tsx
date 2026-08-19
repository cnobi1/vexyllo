"use client";

import { useState } from "react";
import Image from "next/image";

function ImageIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m4 18 5.5-6L14 16l2-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="3" y="5" width="14" height="14" rx="1.5" />
      <path d="m21 8-4 3 4 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-foreground"
    >
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}

/**
 * Inline "photo card" — fills a spot in the normal content flow with either
 * the real generated image/video (once `src` is supplied, saved to
 * `public/marketing/`) or, until then, a dashed placeholder frame showing
 * the exact prompt to generate it. Same component either way so wiring in
 * the real asset later is a one-line change at the call site, not a
 * different component.
 */
export function ImagePlaceholder({
  prompt,
  kind = "image",
  aspect = "aspect-video",
  className = "",
  src,
  alt = "",
}: {
  prompt: string;
  kind?: "image" | "video";
  aspect?: string;
  className?: string;
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      <div className={`relative ${aspect} overflow-hidden rounded-2xl bg-surface/40 ${className}`}>
        {kind === "video" ? (
          <video src={src} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        ) : (
          <Image src={src} alt={alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex ${aspect} flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 p-5 text-center ${className}`}
    >
      {kind === "video" ? (
        <VideoIcon className="h-7 w-7 text-muted-2" />
      ) : (
        <ImageIcon className="h-7 w-7 text-muted-2" />
      )}
      <span className="text-[10px] font-semibold tracking-wide text-muted-2 uppercase">
        {kind === "video" ? "Video placeholder" : "Image placeholder"}
      </span>
      <p className="max-w-sm text-xs text-muted">{prompt}</p>
      <CopyPromptButton prompt={prompt} />
    </div>
  );
}

/**
 * Background for a hero section. Until `src` is supplied it's a full-width
 * in-flow bar showing the prompt (deliberately not an absolute overlay
 * behind the heading — a floating card there collides with real,
 * variable-length copy at the widths that actually ship). Once `src` is
 * supplied it becomes a true full-bleed background image/video behind the
 * text, layered under the section's existing `.hero-glow` wash (z-[-1]) plus
 * a dark gradient scrim so heading/paragraph text stays legible regardless
 * of how bright the photo is.
 */
export function HeroImagePlaceholder({
  prompt,
  kind = "image",
  src,
  alt = "",
}: {
  prompt: string;
  kind?: "image" | "video";
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      <>
        <div className="absolute inset-0 z-[-3] overflow-hidden">
          {kind === "video" ? (
            <video src={src} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
          )}
        </div>
        <div className="absolute inset-0 z-[-2] bg-gradient-to-b from-background/55 via-background/80 to-background" />
      </>
    );
  }

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-y border-dashed border-border/60 bg-surface/40 px-6 py-2.5 text-center">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-2 uppercase">
        {kind === "video" ? <VideoIcon className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
        Background {kind}:
      </span>
      <p className="max-w-xl text-[11px] text-muted">{prompt}</p>
      <CopyPromptButton prompt={prompt} />
    </div>
  );
}
