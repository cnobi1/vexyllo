"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";
import { StyleSelector } from "./style-selector";
import { CreditBalance } from "./credit-balance";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactNode> = {
  script: (props) => (
    <Icon {...props}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6" />
    </Icon>
  ),
  media: (props) => (
    <Icon {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Icon>
  ),
  storyboard: (props) => (
    <Icon {...props}>
      <path d="M3 8.5 4.5 4h15l1.5 4.5" />
      <path d="M3 8.5h18V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="m6.5 4 2 4.5M12 4l2 4.5M17.5 4l2 4.5" />
    </Icon>
  ),
  images: (props) => (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m4 18 5.5-6L14 16l2-2 4 4" />
    </Icon>
  ),
  videos: (props) => (
    <Icon {...props}>
      <rect x="3" y="5" width="14" height="14" rx="1.5" />
      <path d="m21 8-4 3 4 3z" />
      <path d="m10 9 4.5 3-4.5 3z" />
    </Icon>
  ),
  characters: (props) => (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </Icon>
  ),
  scenes: (props) => (
    <Icon {...props}>
      <rect x="3" y="4" width="4" height="4" rx="1" />
      <path d="M10 6h11" />
      <rect x="3" y="10" width="4" height="4" rx="1" />
      <path d="M10 12h11" />
      <rect x="3" y="16" width="4" height="4" rx="1" />
      <path d="M10 18h11" />
    </Icon>
  ),
};

const NAV_ITEMS = [
  { label: "All Media", icon: "media", href: "/media" },
  { label: "Script", icon: "script", href: "" },
  { label: "Generate Scenes", icon: "storyboard", href: "/scenes" },
  { label: "Images", icon: "images", href: "/images" },
  { label: "Videos", icon: "videos", href: "/videos" },
  { label: "Characters", icon: "characters", href: "/characters" },
] as const;

export function SideNav({
  projectId,
  title,
  style,
  userId,
  creditBalance,
  onNavigate,
}: {
  projectId: string;
  title: string;
  style: string | null;
  userId: string;
  creditBalance: number | null;
  /** Called when a nav link is tapped — lets the mobile off-canvas drawer close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Projects
      </Link>

      <div className="mb-3 truncate px-2 text-xs font-medium text-muted-2" title={title}>
        {title}
      </div>

      <StyleSelector projectId={projectId} currentStyle={style} />

      <CreditBalance userId={userId} initialBalance={creditBalance} />

      {NAV_ITEMS.map((item) => {
        const href = base + item.href;
        const isActive = item.href === "" ? pathname === href : pathname.startsWith(href);
        const IconComponent = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            className={
              isActive
                ? "flex items-center gap-3 rounded-lg bg-primary/15 px-2.5 py-2 text-sm font-medium text-foreground"
                : "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            }
          >
            <IconComponent className={isActive ? "h-[18px] w-[18px] shrink-0 text-primary" : "h-[18px] w-[18px] shrink-0"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
