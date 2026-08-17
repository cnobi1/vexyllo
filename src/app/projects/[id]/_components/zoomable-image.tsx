"use client";

import { useEffect, useState } from "react";

/**
 * A pre-resolved, static image URL with the same click-to-zoom lightbox as
 * GenerationMedia's generated-image thumbnails (fullscreen view, click again
 * to toggle native size, Escape/backdrop to close) — for images that aren't
 * a generation feed row (e.g. an asset's current primary reference image).
 * Doesn't need GenerationMedia's storagePath-refetch (only relevant for
 * content that outlives a single page load, e.g. a realtime-updated feed)
 * since callers pass a URL already resolved fresh for this render.
 */
export function ZoomableImage({
  url,
  alt,
  className = "aspect-square w-full rounded-lg border border-border object-cover",
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const close = () => {
    setOpen(false);
    setZoomed(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail from a signed Storage URL */}
      <img src={url} alt={alt} onClick={() => setOpen(true)} className={`cursor-zoom-in ${className}`} />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-background/95 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img
            src={url}
            alt={alt}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((z) => !z);
            }}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out rounded-lg"
                : "max-h-full max-w-full cursor-zoom-in rounded-lg object-contain"
            }
          />
        </div>
      )}
    </>
  );
}
