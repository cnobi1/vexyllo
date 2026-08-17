import Link from "next/link";
import { MarketingNav } from "./_components/marketing-nav";
import { Logo } from "@/app/_components/logo";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav />

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-auto" />
            <span className="text-sm font-medium text-muted">
              © {new Date().getFullYear()} VeXyllo AI
            </span>
          </div>
          <nav className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
