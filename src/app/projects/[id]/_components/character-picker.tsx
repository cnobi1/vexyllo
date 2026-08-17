"use client";

export type CharacterOption = {
  id: string;
  name: string;
  referenceImageUrl: string | null;
  /** Every saved image for this character, for outfit-variant selection. Omit/empty when there's only one (or zero) — no sub-picker shown. */
  images?: { id: string; label: string | null; url: string | null }[];
};

/**
 * Character-consistency mechanism: BytePlus keeps a character consistent
 * via a separate reference-image array on the request, not by parsing
 * @mentions out of the prompt text — so this is a picker next to the
 * prompt, not a text-parsing UI. Selecting one or more characters adds
 * their reference image(s) to the generation request.
 */
export function CharacterPicker({
  characters,
  selectedIds,
  onChange,
  imageOverrides,
  onImageOverrideChange,
  label = "Reference characters (optional)",
}: {
  characters: CharacterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** assetId -> chosen asset_images.id, for characters with more than one labeled outfit. */
  imageOverrides?: Record<string, string>;
  onImageOverrideChange?: (assetId: string, assetImageId: string | null) => void;
  /** Override the default label — e.g. when the options include locations/props, not just characters. */
  label?: string;
}) {
  if (characters.length === 0) return null;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex flex-wrap items-start gap-3">
        {characters.map((character) => {
          const isSelected = selectedIds.includes(character.id);
          const variants = character.images ?? [];
          return (
            <div key={character.id} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggle(character.id)}
                className={`flex w-fit items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-border-strong bg-primary/15 text-foreground"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground"
                }`}
              >
                {character.referenceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail from a signed Storage URL
                  <img src={character.referenceImageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-[10px] text-muted">
                    {character.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {character.name}
              </button>
              {isSelected && variants.length > 1 && (
                <div className="ml-2 flex flex-wrap gap-1.5">
                  {variants.map((variant) => {
                    const isChosen = imageOverrides?.[character.id] === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onImageOverrideChange?.(character.id, isChosen ? null : variant.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                          isChosen
                            ? "border-border-strong bg-primary/10 text-foreground"
                            : "border-border text-muted hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        {variant.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail from a signed Storage URL
                          <img src={variant.url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : null}
                        {variant.label || "Unlabeled"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
