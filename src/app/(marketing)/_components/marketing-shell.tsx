"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { MarketingSideNav } from "./marketing-sidenav";
import { SparkleIcon } from "@/app/_components/sparkle-icon";

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/40 px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-surface-hover"
          >
            <HamburgerIcon />
          </button>
          <Link href="/">
            <Logo className="h-8 w-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
          >
            Log in
          </Link>
          <Link href="/signup" className="btn-primary rounded-full px-3 py-1.5 text-sm font-medium text-white">
            Start free
          </Link>
        </div>
      </div>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-border bg-surface/40 md:block">
        <MarketingSideNav />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/80"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col overflow-y-auto border-r border-border bg-surface">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1">
              <MarketingSideNav onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 hidden items-center justify-end gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md md:flex">
          <Link
            href="/login"
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn-primary flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-medium text-white"
          >
            <SparkleIcon />
            Register for free
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
