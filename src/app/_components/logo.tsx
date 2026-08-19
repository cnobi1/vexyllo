import Image from "next/image";

export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="VeXyllo AI"
      width={446}
      height={154}
      priority
      className={className}
    />
  );
}
