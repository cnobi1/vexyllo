import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/admin-guard";
import { ShowcaseForm } from "@/app/admin/_components/showcase-form";
import { ShowcaseTabs } from "@/app/admin/_components/showcase-tabs";

export default async function AdminPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data: items } = await supabase
    .from("showcase_items")
    .select("id, kind, storage_path, prompt, created_at")
    .order("created_at", { ascending: false });

  const showcaseItems = (items ?? []).map((item) => ({
    id: item.id,
    kind: item.kind as "image" | "video",
    prompt: item.prompt,
    url: supabase.storage.from("showcase").getPublicUrl(item.storage_path).data.publicUrl,
    createdAt: item.created_at,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Homepage showcase</h1>
        <p className="mt-0.5 text-sm text-muted">
          Sample images and videos shown on the homepage, each with the prompt that produced them.
        </p>
      </header>

      <div className="flex w-full flex-col gap-8 px-6 py-8">
        <ShowcaseForm />

        <ShowcaseTabs items={showcaseItems} />
      </div>
    </div>
  );
}
