"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar URL (e.g. Google), not a static asset next/image can optimize
      <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full btn-primary text-xs font-semibold text-white">
      {initial}
    </span>
  );
}

/**
 * Collapses the dashboard header's identity-related actions (email, Admin,
 * Billing, Log out) into one avatar-triggered dropdown instead of stacking
 * them as same-weight pill buttons next to a raw email string. Same
 * disclosure pattern as StyleSelector: local open state, an invisible
 * full-screen button behind the panel to catch outside clicks.
 */
export function UserMenu({
  email,
  displayName,
  avatarUrl,
  isAdmin,
}: {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = (displayName ?? email).trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
      >
        <Avatar avatarUrl={avatarUrl} initial={initial} />
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border-strong bg-surface p-1 shadow-lg">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <Avatar avatarUrl={avatarUrl} initial={initial} />
              <div className="min-w-0 flex-1">
                {displayName && (
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                )}
                <p className="truncate text-xs text-muted">{email}</p>
              </div>
            </div>
            <div className="my-1 border-t border-border" />
            <Link
              href="/billing"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Billing
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Admin
              </Link>
            )}
            <div className="my-1 border-t border-border" />
            <form action={logout}>
              <button
                type="submit"
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                Log out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
