"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades + slides a section in the first time it scrolls into view. No
 * animation library — just IntersectionObserver and a CSS transition, since
 * this is the only motion on the marketing site. Respects
 * prefers-reduced-motion via the transition-none fallback class.
 */
export function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
      className={`motion-safe:transition motion-safe:duration-700 motion-safe:ease-out ${
        visible ? "opacity-100 motion-safe:translate-y-0" : "opacity-0 motion-safe:translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}
