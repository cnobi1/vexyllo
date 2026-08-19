import type { ReactNode, SVGProps } from "react";

/**
 * Shared marketing nav/footer data + icons — deliberately not "use client".
 * marketing-sidenav.tsx (client, needs usePathname) and layout.tsx/page.tsx
 * (Server Components) both import from here. A "use client" module's plain
 * data/object exports aren't usable from a Server Component the way its
 * component exports are, so this data has to live outside that boundary.
 */

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

export const ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactNode> = {
  home: (props) => (
    <Icon {...props}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </Icon>
  ),
  script: (props) => (
    <Icon {...props}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6" />
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
};

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" {...props}>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.4c0-.87.24-1.46 1.5-1.46H16.5V4.3A20 20 0 0 0 14.3 4.2c-2.2 0-3.7 1.34-3.7 3.8v2.5H8v3h2.6V21h2.9z" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.5 9.2v5.6l5-2.8-5-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" {...props}>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-3.1-2.6h-2.8v12.3a2.6 2.6 0 1 1-1.9-2.5V9.9a5.5 5.5 0 1 0 4.7 5.4V9.7a7 7 0 0 0 4 1.3V8.1a4.3 4.3 0 0 1-.9-2.3z" />
    </svg>
  );
}

export const SOCIAL_LINKS = [
  { href: "https://instagram.com/vexyllo", label: "Instagram", Icon: InstagramIcon },
  { href: "https://facebook.com/vexyllo", label: "Facebook", Icon: FacebookIcon },
  { href: "https://youtube.com/@vexyllo", label: "YouTube", Icon: YoutubeIcon },
  { href: "https://tiktok.com/@vexyllo", label: "TikTok", Icon: TiktokIcon },
] as const;

export const CREATIVE_SUITE = [
  { label: "Script", icon: "script" },
  { label: "Scenes", icon: "scenes" },
  { label: "Images", icon: "images" },
  { label: "Videos", icon: "videos" },
  { label: "Characters", icon: "characters" },
] as const;

export const COMPANY_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
