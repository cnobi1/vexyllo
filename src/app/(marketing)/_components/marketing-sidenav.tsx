"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/app/_components/logo";
import { CREATIVE_SUITE, COMPANY_LINKS, ICONS, SOCIAL_LINKS } from "./marketing-links";

export function MarketingSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link href="/" onClick={onNavigate} className="mb-2 flex items-center gap-2 px-2 py-3">
        <Logo className="h-10 w-auto" />
      </Link>

      <Link
        href="/"
        onClick={onNavigate}
        className={
          pathname === "/"
            ? "flex items-center gap-3 rounded-lg bg-primary/15 px-2.5 py-2 text-sm font-medium text-foreground"
            : "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        }
      >
        <ICONS.home className={pathname === "/" ? "h-[18px] w-[18px] shrink-0 text-primary" : "h-[18px] w-[18px] shrink-0"} />
        Home
      </Link>

      <div className="mt-4 mb-1 px-2.5 text-xs font-medium tracking-wide text-muted-2 uppercase">
        Creative Suite
      </div>
      {CREATIVE_SUITE.map((item) => {
        const IconComponent = ICONS[item.icon];
        return (
          <Link
            key={item.label}
            href="/signup"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <IconComponent />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-4 mb-1 px-2.5 text-xs font-medium tracking-wide text-muted-2 uppercase">
        Company
      </div>
      {COMPANY_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={
              isActive
                ? "flex items-center rounded-lg bg-primary/15 px-2.5 py-2 text-sm font-medium text-foreground"
                : "flex items-center rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}

      <div className="mt-2 flex items-center gap-1 px-1">
        {SOCIAL_LINKS.map(({ href, label, Icon: SocialIcon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <SocialIcon />
          </a>
        ))}
      </div>
    </nav>
  );
}
