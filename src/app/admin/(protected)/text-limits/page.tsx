import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { TextLimitsTable, type TextLimitRow } from "@/app/admin/_components/text-limits-table";

export default async function AdminTextLimitsPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data, error } = await supabase
    .from("text_limits")
    .select("key, label, max_length")
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);

  const limits: TextLimitRow[] = (data ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    maxLength: row.max_length,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Text limits</h1>
        <p className="mt-0.5 text-sm text-muted">
          Maximum character length for every free-text field across the app — raise or lower any of these without a
          code deploy. Changes apply immediately to both the input fields (client-side cap) and the server actions
          that save them (the real enforcement).
        </p>
      </header>

      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <TextLimitsTable limits={limits} />
      </div>
    </div>
  );
}
