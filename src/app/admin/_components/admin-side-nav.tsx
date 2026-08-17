"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";

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

const NAV_ITEMS = [
  {
    label: "Showcase",
    href: "/admin",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </Icon>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
        <path d="M16.5 6.5a3 3 0 0 1 0 5.9" />
        <path d="M21.5 20c0-3-2-5.4-4.8-6.2" />
      </Icon>
    ),
  },
] as const;

export function AdminSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2 px-2 py-2">
        <span className="text-sm font-semibold gradient-text">Admin</span>
      </div>

      <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-2">Manage</div>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
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
