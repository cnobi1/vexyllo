import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase's remove() accepts an array of paths in one call — batching
// defensively rather than sending a project's entire (potentially large)
// file list in a single request.
const REMOVE_BATCH_SIZE = 100;

/**
 * Storage has no real directories — `list()` only returns one level at a
 * time, and subfolders come back as entries with `id: null` (Storage
 * synthesizes these for common prefixes rather than storing real
 * directories) — so finding every object under a prefix means listing
 * recursively.
 */
async function listAllFiles(supabase: SupabaseClient, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from("media").list(prefix, { limit: 1000 });
  if (error) throw new Error(error.message);

  const files: string[] = [];
  for (const entry of data ?? []) {
    const entryPath = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      files.push(...(await listAllFiles(supabase, entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

/**
 * Deletes every Storage object under `<projectId>/` in the "media" bucket
 * (generated images/videos, uploads — everything copy-to-storage.ts or
 * uploads.ts ever wrote there). Deleting the `projects` row alone only
 * cascades the *database* rows (scenes/shots/assets/generations/uploads all
 * reference `projects` with `on delete cascade`) — it does nothing to the
 * actual files, which would otherwise sit in the bucket forever, orphaned
 * and unreachable (the bucket's RLS policies re-derive ownership via a join
 * back to `projects`, so once that row is gone nobody — not even the
 * original owner — can list or delete these paths anymore).
 *
 * Must be called *before* the `projects` row is deleted, for exactly that
 * reason: this function's own list/remove calls depend on the project still
 * existing for RLS to allow them.
 */
export async function deleteProjectStorage(supabase: SupabaseClient, projectId: string): Promise<void> {
  const paths = await listAllFiles(supabase, projectId);
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
    const { error } = await supabase.storage.from("media").remove(batch);
    if (error) throw new Error(error.message);
  }
}
