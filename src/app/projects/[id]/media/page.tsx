import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerationFeed } from "../_components/generation-feed";

const ALL_KINDS = [
  "shot",
  "freeform_image",
  "image_to_video",
  "character_sheet",
  "upload_to_video",
  "scene_storyboard",
];

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) {
    notFound();
  }

  const { data: generations } = await supabase
    .from("generations")
    .select("id, kind, type, status, output_url, storage_path, error, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">All Media</h1>
        <p className="text-sm text-muted">Every image and video generated in this project, newest first.</p>
      </div>
      <GenerationFeed
        projectId={id}
        kinds={ALL_KINDS}
        initialItems={generations ?? []}
        emptyLabel="No media yet — generate an image or video from any tab."
      />
    </main>
  );
}
