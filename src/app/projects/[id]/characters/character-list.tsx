"use client";

import { useState, useTransition, type FormEvent } from "react";
import { generateCharacterSheet } from "@/lib/actions/media";
import { IMAGE_CREDIT_COST } from "@/lib/billing/credit-costs";
import { DeleteAssetButton } from "../_components/delete-asset-button";
import { ExpandableTextarea } from "../_components/expandable-textarea";
import { ZoomableImage } from "../_components/zoomable-image";
import { useAssetPrimaryImage } from "../_components/use-asset-primary-image";

type Character = { id: string; name: string; description: string | null };

/**
 * Only Delete and Edit show by default. Edit slides open a single prompt
 * field (seeded from the character's description) with one regenerate
 * action — no separate name/description form, no reference-image/primary
 * picker (removed: with no variant picker, a batch of more than one image
 * only ever showed its first result anyway, and "regenerate" now always
 * replaces the shown image, so there's nothing left to pick between).
 */
export function CharacterList({
  projectId,
  characters,
  imageUrlByAsset,
}: {
  projectId: string;
  characters: Character[];
  imageUrlByAsset: Record<string, string>;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          projectId={projectId}
          character={character}
          imageUrl={imageUrlByAsset[character.id] ?? null}
        />
      ))}
    </ul>
  );
}

function CharacterCard({
  projectId,
  character,
  imageUrl: initialImageUrl,
}: {
  projectId: string;
  character: Character;
  imageUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const imageUrl = useAssetPrimaryImage(projectId, character.id, initialImageUrl);

  return (
    <li className="card-glow flex flex-col gap-3 rounded-2xl p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{character.name}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            aria-expanded={editing}
            className="rounded-full border border-border-strong bg-primary/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/20"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <DeleteAssetButton
            projectId={projectId}
            assetId={character.id}
            className="rounded-full border border-danger/30 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          />
        </div>
      </div>

      {imageUrl ? (
        <ZoomableImage url={imageUrl} alt={character.name} />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-2">
          No sheet yet
        </div>
      )}

      {/* grid-template-rows 0fr/1fr is the standard CSS-only way to animate
          to/from "auto" height without measuring the content in JS. `inert`
          when collapsed keeps the still-mounted field out of tab order and
          unclickable, since a 0fr row hides it visually but not from the DOM. */}
      <div className="grid transition-[grid-template-rows] duration-300 ease-in-out" style={{ gridTemplateRows: editing ? "1fr" : "0fr" }}>
        <div className="overflow-hidden" inert={!editing}>
          <RegenerateForm projectId={projectId} assetId={character.id} initialPrompt={character.description ?? ""} />
        </div>
      </div>
    </li>
  );
}

function RegenerateForm({
  projectId,
  assetId,
  initialPrompt,
}: {
  projectId: string;
  assetId: string;
  initialPrompt: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        // Character sheets default to 16:9, matching Scenes > Assets — a
        // fixed storyboard-panel aspect, not user-configurable here (no
        // ratio control in this form).
        await generateCharacterSheet(projectId, assetId, { prompt, quantity: 1, ratio: "16:9" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
      <ExpandableTextarea value={prompt} onChange={setPrompt} placeholder="Describe its appearance…" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {IMAGE_CREDIT_COST} credit{(IMAGE_CREDIT_COST as number) === 1 ? "" : "s"}
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary rounded-full px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Regenerating…" : "✦ Regenerate character"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
