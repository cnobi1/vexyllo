"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";
import type { AdminRole } from "@/lib/actions/admin-guard";

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
    label: "Models",
    href: "/admin/models",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M9 9h.01M15 9h.01M9 15h6" />
      </Icon>
    ),
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </Icon>
    ),
  },
  {
    label: "Text limits",
    href: "/admin/text-limits",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <path d="M4 6h16M4 12h10M4 18h13" />
      </Icon>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    superAdminOnly: true,
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
        <path d="M16.5 6.5a3 3 0 0 1 0 5.9" />
        <path d="M21.5 20c0-3-2-5.4-4.8-6.2" />
      </Icon>
    ),
  },
  {
    label: "Admins",
    href: "/admin/admins",
    superAdminOnly: true,
    icon: (props: SVGProps<SVGSVGElement>) => (
      <Icon {...props}>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      </Icon>
    ),
  },
] as const;

export function AdminSideNav({ role, onNavigate }: { role: AdminRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || role === "super_admin");

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2 px-2 py-2">
        <span className="text-sm font-semibold gradient-text">Admin</span>
      </div>

      <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-2">Manage</div>

      {items.map((item) => {
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
