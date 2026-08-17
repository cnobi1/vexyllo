"use client";

import { useState, type ReactNode } from "react";

type TabKey = "assets" | "scenes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "assets", label: "Assets" },
  { key: "scenes", label: "Scenes" },
];

export function SceneTabs({
  defaultTab,
  assets,
  scenes,
}: {
  defaultTab: TabKey;
  assets: ReactNode;
  scenes: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 rounded-full border border-border bg-surface/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "flex-1 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-foreground"
                : "flex-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "assets"}>{assets}</div>
      <div hidden={tab !== "scenes"}>{scenes}</div>
    </div>
  );
}
