"use client";

import { useState } from "react";
import { ShowcaseTable, type ShowcaseItem } from "./showcase-table";

export function ShowcaseTabs({ items }: { items: ShowcaseItem[] }) {
  const [tab, setTab] = useState<"image" | "video">("image");

  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");
  const active = tab === "image" ? images : videos;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        <TabButton label="Images" count={images.length} isActive={tab === "image"} onClick={() => setTab("image")} />
        <TabButton label="Videos" count={videos.length} isActive={tab === "video"} onClick={() => setTab("video")} />
      </div>

      <ShowcaseTable
        items={active}
        emptyLabel={tab === "image" ? "No showcase images yet — add one above." : "No showcase videos yet — add one above."}
      />
    </div>
  );
}

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isActive
          ? "flex items-center gap-2 border-b-2 border-primary px-4 py-2.5 text-sm font-medium text-foreground"
          : "flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      }
    >
      {label}
      <span
        className={
          isActive
            ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
            : "rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted-2"
        }
      >
        {count}
      </span>
    </button>
  );
}
