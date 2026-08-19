"use client";

import { useEffect, useRef, useState } from "react";

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m4 18 5.5-6L14 16l2-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="3" y="5" width="14" height="14" rx="1.5" />
      <path d="m21 8-4 3 4 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Showcase grid media with a graceful failure state. Two distinct failure
 * modes here, both real: a storage object can 404 (plain <img>/<video>
 * onError), or — seen in practice with this project's showcase videos — the
 * request can succeed (200, correct video/mp4 content-type) while the file
 * itself is encoded in a codec the viewer's browser can't decode (HEVC is
 * the common case: unsupported in most non-Safari browsers). That second
 * case never fires `error`, and — because media events don't bubble, and
 * this browser fires `loadstart` before React finishes attaching its
 * listener on the freshly-mounted element — never reliably fires
 * `onLoadStart`/`onLoadedMetadata` either. So the real check is a plain
 * `setTimeout` in an effect that polls the element's own `videoWidth`
 * directly, independent of whichever native events did or didn't land.
 */
export function ShowcaseMedia({
  url,
  kind,
  alt,
}: {
  url: string;
  kind: "image" | "video";
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (kind !== "video") return;
    const timeout = setTimeout(() => {
      const video = videoRef.current;
      if (video && (video.readyState < 1 || video.videoWidth === 0)) {
        setFailed(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [kind]);

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-2">
        {kind === "video" ? <VideoIcon /> : <ImageIcon />}
        <span className="text-[11px] font-medium uppercase tracking-wide">Preview unavailable</span>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted
        loop
        playsInline
        className="block w-full"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external Storage URL, not a static asset next/image can optimize
    <img src={url} alt={alt} className="block w-full" onError={() => setFailed(true)} />
  );
}
