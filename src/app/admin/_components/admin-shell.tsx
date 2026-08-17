"use client";

import { useState, type ReactNode } from "react";
import { AdminSideNav } from "./admin-side-nav";

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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0">
      <path
        d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminShell({
  email,
  logoutAction,
  children,
}: {
  email: string;
  logoutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const navPanel = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <AdminSideNav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-border p-3">
        <div className="truncate px-2.5 pb-2 text-xs text-muted-2" title={email}>
          {email}
        </div>
        <a
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <DashboardIcon />
          Back to dashboard
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <LogoutIcon />
            Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="flex items-center gap-3 border-b border-border bg-surface/40 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-surface-hover"
        >
          <HamburgerIcon />
        </button>
        <span className="text-sm font-medium gradient-text">Admin</span>
      </div>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-surface/40 md:block">
        {navPanel()}
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
            <div className="flex-1">{navPanel(() => setOpen(false))}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
