"use client";

import { useState, useTransition } from "react";
import { updateCreditCostSetting } from "@/lib/actions/subscription-settings";
import { isActionError } from "@/lib/actions/action-result";

export type CreditCostSettingRow = { key: string; label: string; credits: number };

export function CreditCostSettingsTable({ settings }: { settings: CreditCostSettingRow[] }) {
  if (settings.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-2">No credit cost settings found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Setting</th>
            <th className="px-4 py-3 font-medium">Credits</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((setting) => (
            <CreditCostSettingRowItem key={setting.key} setting={setting} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreditCostSettingRowItem({ setting }: { setting: CreditCostSettingRow }) {
  const [value, setValue] = useState(String(setting.credits));
  const [saved, setSaved] = useState(setting.credits);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numeric = Number(value);
  const isDirty = value !== String(saved);
  const isValid = Number.isInteger(numeric) && numeric > 0;

  function handleSave() {
    if (!isValid) {
      setError("Enter a positive whole number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateCreditCostSetting(setting.key, numeric);
      if (isActionError(result)) {
        setError(result.error);
        return;
      }
      setSaved(numeric);
    });
  }

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover/60">
      <td className="px-4 py-3 text-foreground">
        {setting.label}
        <div className="mt-0.5 text-xs text-muted-2">{setting.key}</div>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="w-32 rounded-lg border border-border bg-background/60 px-2 py-1 text-sm text-foreground outline-none focus:border-border-strong disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isDirty || !isValid}
            className="rounded-full border border-border-strong bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
