import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAsset } from "@/lib/actions/assets";
import { resolveAssetImageUrlMap } from "@/lib/media/asset-references";
import { CharacterList } from "./character-list";

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) {
    notFound();
  }

  const { data: characters } = await supabase
    .from("assets")
    .select("id, name, description, reference_image_url")
    .eq("project_id", id)
    .eq("type", "character")
    .order("name", { ascending: true });

  // Re-signed from asset_images.storage_path rather than trusting
  // reference_image_url, which may be an expired 1h-TTL signed URL
  // persisted from generation time.
  const imageUrlByAsset = await resolveAssetImageUrlMap(
    supabase,
    id,
    (characters ?? []).map((character) => character.id),
  );

  const createAssetWithId = createAsset.bind(null, id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Characters</h1>
        <p className="text-sm text-muted">
          Create a character, generate a reference sheet, then reference it when generating images or video.
        </p>
      </div>

      <form action={createAssetWithId} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
        <input type="hidden" name="type" value="character" />
        <input
          name="name"
          placeholder="Character name"
          required
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
        <textarea
          name="description"
          placeholder="Description — appearance, personality, wardrobe…"
          rows={2}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
        />
        <button
          type="submit"
          className="btn-primary self-start rounded-full px-5 py-2 text-sm font-medium text-white"
        >
          ✦ Create character
        </button>
      </form>

      {characters && characters.length > 0 ? (
        <CharacterList projectId={id} characters={characters} imageUrlByAsset={imageUrlByAsset} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No characters yet — create one above.
        </p>
      )}
    </main>
  );
}
