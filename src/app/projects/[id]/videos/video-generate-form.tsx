"use client";

import { Fragment, useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { generateVideoFromImage } from "@/lib/actions/media";
import { uploadImage } from "@/lib/actions/uploads";
import { videoCreditCost } from "@/lib/billing/credit-costs";
import { isHighlightedScriptLine } from "@/lib/script-highlight";
import { DurationControl } from "../_components/duration-control";
import { RatioControl } from "../_components/ratio-control";
import { ResolutionControl } from "../_components/resolution-control";
import { QuantityControl } from "../_components/quantity-control";
import { GenerationMedia } from "../_components/generation-media";
import { PromptMentionField, extractMentionedAssetIds, type MentionAssetOption } from "../_components/prompt-mention-field";

type SourceOption = { id: string; url: string };
type SceneAssetLink = { asset_id: string; wardrobe_note: string | null };
type SceneOption = {
  id: string;
  order_index: number;
  summary: string | null;
  dialogue: string | null;
  script_text: string | null;
  duration_seconds: number | null;
  /** Characters/locations/props the breakdown linked to this scene (scene_assets), with a per-character wardrobe note. */
  assets: SceneAssetLink[];
};

/**
 * Composes the breakdown's scene summary and any per-character wardrobe
 * notes into one string that gets merged into the actual generation prompt
 * (see media.ts's generateVideoFromImage -> GenerateVideoInput.sceneContext
 * -> the provider adapters' fullPrompt join, the same way project style
 * already gets merged in). Deliberately excludes the verbatim script_text —
 * that's scene-heading/action prose meant for the human to read, not to be
 * fed to a video model alongside the already-separate, cleaned-up dialogue.
 */
function buildSceneContext(scene: SceneOption, assetOptions: MentionAssetOption[]): string | undefined {
  const parts: string[] = [];
  if (scene.summary?.trim()) parts.push(scene.summary.trim());
  const wardrobeLines = scene.assets
    .filter((link): link is SceneAssetLink & { wardrobe_note: string } => Boolean(link.wardrobe_note?.trim()))
    .map((link) => {
      const name = assetOptions.find((option) => option.id === link.asset_id)?.name ?? "A character";
      return `${name} is wearing: ${link.wardrobe_note.trim()}`;
    });
  if (wardrobeLines.length > 0) parts.push(wardrobeLines.join(" "));
  return parts.length > 0 ? parts.join(" ") : undefined;
}

// Matches a name (up to 3 capitalized words) immediately followed by ": " —
// e.g. "CHLOE: " or "HR MANAGER: " — used as a line-break boundary below.
// The leading \b is required: without it, a lookahead alone matches at
// *every* letter inside an ALL-CAPS name (e.g. "CHLOE:" also satisfies the
// pattern starting from "H", "L", "O", "E"), fragmenting the text
// letter-by-letter. \b only matches once, at the actual start of the word.
const SPEAKER_LABEL = /\b(?=[A-Z][A-Za-z']*(?:\s[A-Z][A-Za-z']*){0,2}:\s)/g;

/**
 * scenes.dialogue is stored as a single flat block (either "line one. / line
 * two." or, depending on the breakdown run, "SPEAKER: line one. SPEAKER:
 * line two." with no separator at all) — dense and hard to scan or edit.
 * Reformats it into one line per beat for the prefilled prompt, without
 * inventing or reassigning any attribution that isn't already in the text.
 */
function formatDialogueLines(dialogue: string): string {
  const trimmed = dialogue.trim();
  if (!trimmed) return "";
  if (trimmed.includes(" / ")) {
    return trimmed
      .split(" / ")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }
  const bySpeaker = trimmed
    .split(SPEAKER_LABEL)
    .map((line) => line.trim())
    .filter(Boolean);
  return bySpeaker.length > 1 ? bySpeaker.join("\n") : trimmed;
}

function AssetAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail from a signed Storage URL
    <img src={imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
  ) : (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-hover text-[9px] text-muted">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function VideoGenerateForm({
  projectId,
  sourceImages,
  uploads,
  scenes,
  sceneStoryboardUrls,
  sceneStoryboardRatios,
  assetOptions,
  minDuration,
  maxDuration,
}: {
  projectId: string;
  sourceImages: SourceOption[];
  uploads: SourceOption[];
  /** Scenes from the Generate Scenes breakdown, for "generate from a scene" mode — each carries everything the breakdown knows about it (summary, dialogue, verbatim script text, estimated duration, and linked characters/locations/props with wardrobe notes). */
  scenes: SceneOption[];
  /** Each scene's latest succeeded storyboard sheet (see the Scenes tab), keyed by scene id — auto-attached as the video's first frame when picking that scene. */
  sceneStoryboardUrls: Record<string, string>;
  /** Each scene's storyboard's own aspect ratio (derived from its panel grid at generation time), keyed by scene id — BytePlus hard-rejects an explicit ratio whenever a first-frame image is supplied, so the video's ratio is always this one, not whatever's picked below. */
  sceneStoryboardRatios: Record<string, string>;
  /** Every character/location/prop in the project, for the "@" mention dropdown in either mode's prompt. */
  assetOptions: MentionAssetOption[];
  minDuration: number;
  maxDuration: number;
}) {
  const [sourceMode, setSourceMode] = useState<"media" | "scene">("media");
  const [prompt, setPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceUploadId, setSourceUploadId] = useState<string | undefined>(undefined);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [duration, setDuration] = useState(Math.min(8, maxDuration));
  const [ratio, setRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();

  const creditCost = videoCreditCost(duration, resolution) * quantity;

  const allSources = [
    ...sourceImages.map((source) => ({ ...source, kind: "image" as const })),
    ...uploads.map((source) => ({ ...source, kind: "upload" as const })),
  ];

  const selectedScene = useMemo(
    () => (sourceMode === "scene" ? (scenes.find((scene) => scene.id === selectedSceneId) ?? null) : null),
    [sourceMode, selectedSceneId, scenes],
  );

  const wardrobeNoteByAssetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of selectedScene?.assets ?? []) {
      if (link.wardrobe_note?.trim()) map.set(link.asset_id, link.wardrobe_note.trim());
    }
    return map;
  }, [selectedScene]);

  // Which characters (not locations/props) appear in the selected scene —
  // scenes.dialogue is a flat, unattributed block of lines (the LLM
  // breakdown doesn't preserve per-line speakers), so we can't reliably
  // auto-tag who says what. Surfacing the cast here instead lets the
  // customer see the names and click one to tag the next line themselves.
  const sceneCharacterOptions = useMemo(() => {
    if (!selectedScene) return [];
    const linkedIds = new Set(selectedScene.assets.map((link) => link.asset_id));
    return assetOptions.filter((option) => option.type === "character" && linkedIds.has(option.id));
  }, [selectedScene, assetOptions]);

  // Locations/props linked to the scene — shown read-only (not speaker-
  // taggable like characters above) purely so the customer sees everything
  // the breakdown attached before generating.
  const sceneSettingOptions = useMemo(() => {
    if (!selectedScene) return [];
    const linkedIds = new Set(selectedScene.assets.map((link) => link.asset_id));
    return assetOptions.filter((option) => option.type !== "character" && linkedIds.has(option.id));
  }, [selectedScene, assetOptions]);

  // BytePlus forces the video's ratio to follow a first-frame image once one
  // is attached, rejecting an explicit ratio outright — for a scene's own
  // storyboard we know exactly which ratio that resolves to (derived from
  // its panel grid at generation time), so the customer can be told instead
  // of their ratio pick silently doing nothing with no explanation.
  const activeSourceRatio =
    sourceMode === "scene" && selectedSceneId ? sceneStoryboardRatios[selectedSceneId] : undefined;

  function appendSpeaker(name: string) {
    setPrompt((prev) => {
      const trimmed = prev.replace(/\s+$/, "");
      const tag = `@${name.toUpperCase()}\n`;
      return trimmed ? `${trimmed}\n${tag}` : tag;
    });
  }

  function pickSource(url: string, uploadId?: string) {
    setSourceUrl(url);
    setSourceUploadId(uploadId);
    setSourcePickerOpen(false);
  }

  function clearSource() {
    setSourceUrl("");
    setSourceUploadId(undefined);
    setSourcePickerOpen(false);
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same filename later
    if (!file) return;
    setError(null);
    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        // Can't nest a <form> here — this input lives inside the page's
        // single outer <form>, so FormData is built manually instead.
        formData.append("file", file);
        const result = await uploadImage(projectId, formData);
        pickSource(result.url, result.uploadId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      }
    });
  }

  function switchMode(mode: "media" | "scene") {
    if (mode === sourceMode) return;
    setSourceMode(mode);
    setPrompt("");
    setError(null);
    clearSource();
    if (mode === "media") setSelectedSceneId(null);
  }

  function selectScene(scene: SceneOption) {
    setSelectedSceneId(scene.id);
    setPrompt(formatDialogueLines(scene.dialogue ?? ""));
    // Auto-attach the scene's generated storyboard sheet (if any) as the
    // video's first frame — the customer can still remove it and fall back
    // to pure reference-driven generation.
    setSourceUrl(sceneStoryboardUrls[scene.id] ?? "");
    setSourceUploadId(undefined);
    // Prefill from the scene's own estimated screen time (set by the
    // breakdown on the Generate Scenes page) rather than leaving whatever
    // duration was left over from a previous scene/mode — clamped to the
    // active video model's range since a scene's estimate can fall outside it.
    if (scene.duration_seconds) {
      setDuration(Math.min(maxDuration, Math.max(minDuration, scene.duration_seconds)));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const mentionedAssetIds = extractMentionedAssetIds(prompt, assetOptions);
    if (sourceMode === "scene") {
      if (!selectedSceneId) {
        setError("Pick a scene to generate a video for.");
        return;
      }
    } else if (!sourceUrl && mentionedAssetIds.length === 0) {
      setError("Pick a source image or @ mention a character, location, or prop in the prompt.");
      return;
    }
    setError(null);

    // Scene mode's source frame (if any) is that scene's own generated
    // storyboard sheet, auto-attached by selectScene — the clip is driven
    // by the dialogue prompt plus reference images (the scene's auto-linked
    // characters/locations/props, unioned with whatever's "@" mentioned in
    // the dialogue text). Media mode's references come from the prompt's
    // "@" mentions alone.
    const referenceAssetIds =
      sourceMode === "scene" && selectedScene
        ? Array.from(new Set([...selectedScene.assets.map((link) => link.asset_id), ...mentionedAssetIds]))
        : mentionedAssetIds;

    // The breakdown's scene summary + wardrobe notes, merged into the actual
    // generation prompt alongside dialogue — see buildSceneContext above.
    const sceneContext = sourceMode === "scene" && selectedScene ? buildSceneContext(selectedScene, assetOptions) : undefined;

    startTransition(async () => {
      try {
        await generateVideoFromImage(projectId, {
          sourceUrl: sourceUrl || undefined,
          sourceUploadId: sourceMode === "media" ? sourceUploadId : undefined,
          sourceIsStoryboard: sourceMode === "scene" && Boolean(sourceUrl),
          prompt: prompt.trim() || null,
          sceneContext,
          durationSeconds: duration,
          ratio: ratio || undefined,
          resolution,
          quantity,
          referenceAssetIds: referenceAssetIds.length > 0 ? referenceAssetIds : undefined,
        });
        setPrompt("");
        if (sourceMode === "scene") {
          setSelectedSceneId(null);
          clearSource();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-col gap-4 rounded-2xl p-6">
      {scenes.length > 0 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchMode("media")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              sourceMode === "media"
                ? "border-border-strong bg-primary/15 text-foreground"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            From image/upload
          </button>
          <button
            type="button"
            onClick={() => switchMode("scene")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              sourceMode === "scene"
                ? "border-border-strong bg-primary/15 text-foreground"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            From scene
          </button>
        </div>
      )}

      {sourceMode === "scene" ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Scene</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => selectScene(scene)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedSceneId === scene.id
                      ? "border-border-strong bg-primary/15 text-foreground"
                      : "border-border text-muted hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  Scene {index + 1}
                </button>
              ))}
            </div>
          </div>
          {selectedSceneId && sourceUrl && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {`Storyboard for this scene — used as the video's first frame${activeSourceRatio ? `, so the video will render at ${activeSourceRatio}` : ""}. BytePlus can't combine a first frame with separate character reference images, so this scene's linked characters aren't sent as references while the storyboard is attached — remove it below to generate from references alone instead.`}
                </span>
                <button
                  type="button"
                  onClick={clearSource}
                  className="shrink-0 text-xs font-medium text-muted underline decoration-dotted hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <div className="max-w-xs">
                <GenerationMedia url={sourceUrl} storagePath={null} alt="Storyboard for the selected scene" type="image" />
              </div>
            </div>
          )}
          {selectedScene && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3">
              {selectedScene.summary && <p className="text-xs text-muted">{selectedScene.summary}</p>}
              {sceneCharacterOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Characters in this scene — click a name to tag who speaks next</span>
                  <div className="flex flex-wrap gap-2">
                    {sceneCharacterOptions.map((character) => {
                      const wardrobeNote = wardrobeNoteByAssetId.get(character.id);
                      return (
                        <button
                          key={character.id}
                          type="button"
                          onClick={() => appendSpeaker(character.name)}
                          title={wardrobeNote ? `Wearing: ${wardrobeNote}` : undefined}
                          className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          <AssetAvatar name={character.name} imageUrl={character.referenceImageUrl} />
                          {character.name}
                          {wardrobeNote && <span className="text-muted-2">({wardrobeNote})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {sceneSettingOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Locations &amp; props in this scene</span>
                  <div className="flex flex-wrap gap-2">
                    {sceneSettingOptions.map((setting) => (
                      <span
                        key={setting.id}
                        className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted"
                      >
                        <AssetAvatar name={setting.name} imageUrl={setting.referenceImageUrl} />
                        {setting.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedScene.script_text && (
                <details className="rounded-lg border border-border">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted hover:text-foreground">
                    Script text
                  </summary>
                  <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words border-t border-border p-3 font-mono text-xs leading-6 text-foreground">
                    {selectedScene.script_text.split("\n").map((line, i, lines) => (
                      <Fragment key={i}>
                        <span className={isHighlightedScriptLine(line) ? "font-bold" : undefined}>{line}</span>
                        {i < lines.length - 1 ? "\n" : null}
                      </Fragment>
                    ))}
                  </pre>
                </details>
              )}
            </div>
          )}
          <PromptMentionField
            value={prompt}
            onChange={setPrompt}
            options={assetOptions}
            mentionStyle="screenplay"
            placeholder={"Dialogue for this scene… type @ then a character's name to tag who's speaking, e.g.\n@CHLOE\nSir, they're... inflated."}
          />
        </>
      ) : (
        <>
          {sourceUrl ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail from a signed Storage URL */}
              <img src={sourceUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
              <span className="text-xs text-muted">
                Source image selected — BytePlus can&apos;t combine it with @ mentioned reference images, so those are
                ignored while a source image is attached.
              </span>
              <button
                type="button"
                onClick={clearSource}
                className="shrink-0 text-xs font-medium text-muted underline decoration-dotted hover:text-foreground"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSourcePickerOpen((open) => !open)}
              className="self-start rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              {sourcePickerOpen ? "− Hide source images" : "+ Add a source image (optional)"}
            </button>
          )}

          {sourcePickerOpen && !sourceUrl && (
            <div className="flex flex-col gap-2">
              {allSources.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allSources.map((source) => (
                    <button
                      key={`${source.kind}-${source.id}`}
                      type="button"
                      onClick={() => pickSource(source.url, source.kind === "upload" ? source.id : undefined)}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-border transition-colors hover:border-border-strong"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail from a signed Storage URL */}
                      <img src={source.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setSourceUploadId(undefined);
                }}
                placeholder="…or paste an image URL"
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:opacity-50"
                />
                {isUploading && <span className="text-xs text-muted">Uploading…</span>}
              </div>
            </div>
          )}

          <PromptMentionField
            value={prompt}
            onChange={setPrompt}
            options={assetOptions}
            mentionStyle="inline"
            placeholder="Describe the motion/action for this shot… type @ to reference a character, location, or prop"
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <DurationControl value={duration} onChange={setDuration} min={minDuration} max={maxDuration} />
          {selectedScene?.duration_seconds ? (
            <span className="text-xs text-muted-2">(from scene estimate)</span>
          ) : null}
        </div>
        <ResolutionControl value={resolution} onChange={setResolution} />
        {sourceUrl ? (
          <span className="text-sm text-muted">
            Aspect ratio: {activeSourceRatio ?? "follows the source image"} (fixed — BytePlus derives it from the
            attached image, not the picker)
          </span>
        ) : (
          <RatioControl value={ratio} onChange={setRatio} />
        )}
        <QuantityControl value={quantity} onChange={setQuantity} max={4} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted">
          {creditCost} credit{creditCost === 1 ? "" : "s"}
        </span>
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="btn-primary rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Generating…" : "✦ Generate video"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
