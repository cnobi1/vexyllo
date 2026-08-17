const STATUS_STYLE: Record<string, string> = {
  generating: "border-primary/40 bg-primary/10 text-violet-300 animate-pulse",
  pending: "border-warning/30 bg-warning/10 text-warning",
  succeeded: "border-success/30 bg-success/10 text-success",
  failed: "border-danger/30 bg-danger/10 text-danger",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
        STATUS_STYLE[status] ?? "border-border bg-background/60 text-muted"
      }`}
    >
      {status}
    </span>
  );
}
