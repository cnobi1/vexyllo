import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { MarketingShell } from "./_components/marketing-shell";
import { COMPANY_LINKS, SOCIAL_LINKS } from "./_components/marketing-links";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3">
            <Logo className="h-6 w-auto self-start" />
            <p className="max-w-xs text-sm text-muted">
              Script to screen, powered by AI generation. Built for filmmakers and anyone with an idea for a
              scene.
            </p>
            <div className="mt-1 flex items-center gap-1">
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
          </div>

          <div className="flex flex-wrap gap-10">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-2 uppercase">Company</span>
              {COMPANY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-2 uppercase">Account</span>
              <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">
                Log in
              </Link>
              <Link href="/signup" className="text-sm text-muted transition-colors hover:text-foreground">
                Sign up
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-5xl items-center border-t border-border pt-6">
          <span className="text-sm text-muted">© {new Date().getFullYear()} VeXyllo AI</span>
        </div>
      </footer>
    </MarketingShell>
  );
}
