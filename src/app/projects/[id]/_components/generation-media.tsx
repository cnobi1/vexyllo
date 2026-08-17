"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function GenerationMedia({
  url,
  storagePath,
  alt,
  type,
}: {
  url: string;
  /** Bucket-relative path; when present, a fresh signed URL is derived on mount instead of trusting `url` (which may be an expired 1h-TTL signed URL persisted from generation time). */
  storagePath: string | null;
  alt: string;
  /** generations.type ("image" | "video") — trustworthy now that output_url is always our own Storage URL. */
  type: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [src, setSrc] = useState(url);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    createClient()
      .storage.from("media")
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setSrc(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

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

  // Prefer the DB's own type column; the data: URI sniff is kept only as a
  // fallback for any pre-migration rows still carrying an inline data URI.
  const isVideo = type === "video" || src.startsWith("data:video/");
  if (isVideo) {
    return <video src={src} controls className="mt-2 w-full rounded-lg border border-border" />;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated media are signed Storage URLs / data URIs, not next/image-optimizable remote assets */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="mt-2 w-full cursor-zoom-in rounded-lg border border-border"
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-background/95 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img
            src={src}
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
