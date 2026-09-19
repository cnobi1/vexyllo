"use client";

import { useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { generateCharacterSheet } from "@/lib/actions/media";
import { updateAssetVoice } from "@/lib/actions/assets";
import { isActionError } from "@/lib/actions/action-result";
import { computeCreditCost } from "@/lib/billing/credit-costs";
import { DeleteAssetButton } from "../_components/delete-asset-button";
import { ExpandableTextarea } from "../_components/expandable-textarea";
import { ZoomableImage } from "../_components/zoomable-image";
import { useAssetPrimaryImage } from "../_components/use-asset-primary-image";
import { ModelSelectControl, pickDefaultModelId, type ModelOption } from "../_components/model-select-control";

type Character = {
  id: string;
  name: string;
  description: string | null;
  elevenlabs_voice_id: string | null;
  elevenlabs_voice_name: string | null;
};

export type VoiceOption = { id: string; name: string; previewUrl: string | null };

/**
 * Module-level singleton (not per-VoicePicker state) so playing one voice's
 * preview clip automatically stops whichever other preview was already
 * playing — including one started from a different character's card —
 * same as any normal single-player audio widget. Subscribed via
 * useSyncExternalStore so every open VoicePicker's play/pause icon stays in
 * sync with the one shared <audio> element.
 */
const previewListeners = new Set<() => void>();
let previewAudioEl: HTMLAudioElement | null = null;
let playingVoiceId: string | null = null;

function notifyPreviewListeners() {
  previewListeners.forEach((listener) => listener());
}

function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  return () => previewListeners.delete(listener);
}

function getPlayingVoiceId() {
  return playingVoiceId;
}

function stopVoicePreview() {
  previewAudioEl?.pause();
  playingVoiceId = null;
  notifyPreviewListeners();
}

function toggleVoicePreview(voiceId: string, previewUrl: string) {
  if (playingVoiceId === voiceId) {
    stopVoicePreview();
    return;
  }
  if (!previewAudioEl) previewAudioEl = new Audio();
  previewAudioEl.src = previewUrl;
  previewAudioEl.onended = () => {
    playingVoiceId = null;
    notifyPreviewListeners();
  };
  previewAudioEl.play().catch(() => {
    playingVoiceId = null;
    notifyPreviewListeners();
  });
  playingVoiceId = voiceId;
  notifyPreviewListeners();
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
      <path d="M6 4.5a1 1 0 0 1 1.53-.85l11 6.5a1 1 0 0 1 0 1.7l-11 6.5A1 1 0 0 1 6 17.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

/**
 * Small circular play/pause control on one voice's listbox row —
 * stopPropagation so clicking it previews the voice instead of also
 * selecting it. A <span role="button"> rather than a real <button>: this
 * sits inside the row's own <button role="option">, and nesting an
 * interactive <button> inside another <button> is invalid HTML (React
 * flags it as a hydration error) — the row itself needs to stay a real
 * <button> for its primary "select this voice" action, so the nested
 * preview control gives up its own native button up instead.
 */
function VoicePreviewButton({ voiceId, previewUrl }: { voiceId: string; previewUrl: string | null }) {
  const currentlyPlaying = useSyncExternalStore(subscribePreview, getPlayingVoiceId, () => null);
  if (!previewUrl) return null;
  const isPlaying = currentlyPlaying === voiceId;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        toggleVoicePreview(voiceId, previewUrl);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        toggleVoicePreview(voiceId, previewUrl);
      }}
      aria-label={isPlaying ? "Pause voice preview" : "Play voice preview"}
      className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-primary/10 text-foreground transition-colors hover:bg-primary/20"
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`h-3.5 w-3.5 shrink-0 text-muted-2 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-primary">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  voices,
  imageModels,
}: {
  projectId: string;
  characters: Character[];
  imageUrlByAsset: Record<string, string>;
  /** ElevenLabs voices available to pick from — [] when ELEVENLABS_API_KEY isn't configured. */
  voices: VoiceOption[];
  imageModels: ModelOption[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          projectId={projectId}
          character={character}
          imageUrl={imageUrlByAsset[character.id] ?? null}
          voices={voices}
          imageModels={imageModels}
        />
      ))}
    </ul>
  );
}

function CharacterCard({
  projectId,
  character,
  imageUrl: initialImageUrl,
  voices,
  imageModels,
}: {
  projectId: string;
  character: Character;
  imageUrl: string | null;
  voices: VoiceOption[];
  imageModels: ModelOption[];
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

      <VoicePicker projectId={projectId} character={character} voices={voices} />

      {/* grid-template-rows 0fr/1fr is the standard CSS-only way to animate
          to/from "auto" height without measuring the content in JS. `inert`
          when collapsed keeps the still-mounted field out of tab order and
          unclickable, since a 0fr row hides it visually but not from the DOM. */}
      <div className="grid transition-[grid-template-rows] duration-300 ease-in-out" style={{ gridTemplateRows: editing ? "1fr" : "0fr" }}>
        <div className="overflow-hidden" inert={!editing}>
          <RegenerateForm
            projectId={projectId}
            assetId={character.id}
            initialPrompt={character.description ?? ""}
            imageModels={imageModels}
          />
        </div>
      </div>
    </li>
  );
}

/**
 * Assigns this character's reusable ElevenLabs voice — reused every time
 * this character speaks via the Videos tab's "Generate voice" action, the
 * same "set once, reused everywhere" role the primary reference image plays
 * for AI generation prompts. Auto-saves on change, no separate save step,
 * matching this card's other lightweight inline pickers.
 */
function VoicePicker({
  projectId,
  character,
  voices,
}: {
  projectId: string;
  character: Character;
  voices: VoiceOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function toggleOpen() {
    setOpen((prev) => !prev);
    setQuery("");
  }

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  function handleChange(voiceId: string) {
    closeMenu();
    setError(null);
    stopVoicePreview();
    const voice = voices.find((v) => v.id === voiceId) ?? null;
    startTransition(async () => {
      const result = await updateAssetVoice(projectId, character.id, {
        voiceId: voice?.id ?? null,
        voiceName: voice?.name ?? null,
      });
      if (isActionError(result)) setError(result.error);
    });
  }

  if (voices.length === 0) {
    return (
      <p className="text-xs text-muted-2">
        {character.elevenlabs_voice_name
          ? `Voice: ${character.elevenlabs_voice_name}`
          : "No ElevenLabs voices available — set ELEVENLABS_API_KEY to assign one."}
      </p>
    );
  }

  const selectedVoice = voices.find((voice) => voice.id === character.elevenlabs_voice_id);
  const label = isPending ? "Saving…" : (selectedVoice?.name ?? "Not set");
  const trimmedQuery = query.trim().toLowerCase();
  const filteredVoices = trimmedQuery
    ? voices.filter((voice) => voice.name.toLowerCase().includes(trimmedQuery))
    : voices;
  // "Not set" stays visible regardless of the search query — it's a
  // clear-selection action, not a voice to search through, matching how a
  // browser's own address-bar-style search never hides its own "clear" button.
  const showNotSet = !trimmedQuery || "not set".includes(trimmedQuery);

  // Custom button+listbox instead of a native <select> — matches the same
  // shell as every other dropdown in the app (StyleSelector,
  // ModelSelectControl) rather than falling back to unstyled browser select
  // chrome. A project's ElevenLabs voice library commonly runs to dozens of
  // premade voices, so a search box up top (filters by name, client-side —
  // the full list is already in memory) makes finding one faster than
  // scrolling the whole listbox.
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="shrink-0 text-muted-2">Voice</span>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleOpen}
            disabled={isPending}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition-colors hover:border-border-strong disabled:opacity-50"
          >
            <span className="truncate">{label}</span>
            <ChevronIcon open={open} />
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Close voice menu"
                onClick={closeMenu}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="card-glow absolute left-0 right-0 top-full z-20 mt-1 flex max-h-72 flex-col rounded-lg border border-border-strong bg-surface p-1 shadow-lg">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  placeholder="Search voices…"
                  className="mb-1 shrink-0 rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-border-strong"
                />
                {/* min-h-0 is required: a flex child otherwise refuses to
                    shrink below its content height (same flexbox default
                    behind the "Generate voice" button-clipping bug fixed
                    earlier), so max-h-72 on the panel above would just let
                    this list spill past it instead of actually scrolling. */}
                <div role="listbox" className="min-h-0 overflow-y-auto">
                  {showNotSet && (
                    <button
                      type="button"
                      role="option"
                      aria-selected={!character.elevenlabs_voice_id}
                      onClick={() => handleChange("")}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-surface-hover ${
                        !character.elevenlabs_voice_id ? "text-foreground" : "text-muted"
                      }`}
                    >
                      Not set
                      {!character.elevenlabs_voice_id && <CheckIcon />}
                    </button>
                  )}
                  {filteredVoices.length === 0 && !showNotSet && (
                    <p className="px-2.5 py-1.5 text-xs text-muted-2">No voices match &quot;{query.trim()}&quot;.</p>
                  )}
                  {filteredVoices.map((voice) => {
                    const isSelected = voice.id === character.elevenlabs_voice_id;
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleChange(voice.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-surface-hover ${
                          isSelected ? "text-foreground" : "text-muted"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <VoicePreviewButton voiceId={voice.id} previewUrl={voice.previewUrl} />
                          <span className="truncate">{voice.name}</span>
                        </span>
                        {isSelected && <CheckIcon />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function RegenerateForm({
  projectId,
  assetId,
  initialPrompt,
  imageModels,
}: {
  projectId: string;
  assetId: string;
  initialPrompt: string;
  imageModels: ModelOption[];
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [modelId, setModelId] = useState(pickDefaultModelId(imageModels));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModel = imageModels.find((m) => m.id === modelId);
  const creditCost = selectedModel ? computeCreditCost(selectedModel) : 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    startTransition(async () => {
      // Character sheets default to 16:9, matching Scenes > Assets — a
      // fixed storyboard-panel aspect, not user-configurable here (no
      // ratio control in this form).
      const result = await generateCharacterSheet(projectId, assetId, { prompt, quantity: 1, ratio: "16:9", modelId });
      if (isActionError(result)) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
      <ExpandableTextarea value={prompt} onChange={setPrompt} placeholder="Describe its appearance…" />
      {imageModels.length > 1 && <ModelSelectControl options={imageModels} value={modelId} onChange={setModelId} />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {creditCost} credit{creditCost === 1 ? "" : "s"}
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
