/**
 * Short relative-time label for a timestamp ("Today", "3d ago", "2w ago"),
 * falling back to a plain date past ~5 weeks. No date library in this
 * project — this covers the one thing the app needs it for (project card
 * "created" labels) without pulling one in.
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
