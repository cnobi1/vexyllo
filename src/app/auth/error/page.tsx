import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Sorry, something went wrong</h1>
      <p className="text-sm text-muted">The confirmation link is invalid or has expired.</p>
      <Link
        href="/login"
        className="text-sm font-medium text-foreground underline underline-offset-2"
      >
        Back to login
      </Link>
    </div>
  );
}
