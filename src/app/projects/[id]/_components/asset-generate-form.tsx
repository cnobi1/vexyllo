"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { generateCharacterSheet } from "@/lib/actions/media";
import { IMAGE_CREDIT_COST } from "@/lib/billing/credit-costs";
import { QuantityControl } from "./quantity-control";

export function AssetGenerateForm({
  projectId,
  assetId,
  prefill,
}: {
  projectId: string;
  assetId: string;
  /** Set (with a fresh `nonce`) to prefill the prompt from an existing generation's "Edit & regenerate". */
  prefill?: { value: string; nonce: number } | null;
}) {
  const [prompt, setPrompt] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [appliedNonce, setAppliedNonce] = useState(prefill?.nonce);

  // Adjusting state in response to a prop change is done during render (React's
  // recommended pattern), not in an effect — the effect below only drives the
  // scroll/focus DOM side effect, which does belong there.
  if (prefill && prefill.nonce !== appliedNonce) {
    setAppliedNonce(prefill.nonce);
    setPrompt(prefill.value);
  }

  useEffect(() => {
    if (!prefill) return;
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
  }, [prefill]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        // Scenes > Assets reference boards default to 16:9 — a fixed
        // storyboard-panel aspect, not user-configurable here (no ratio
        // control in this form).
        await generateCharacterSheet(projectId, assetId, { prompt, quantity, ratio: "16:9" });
        setPrompt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Describe its appearance — this generates a batch of consistent reference images…"
        rows={3}
        required
        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-border-strong"
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuantityControl value={quantity} onChange={setQuantity} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {quantity * IMAGE_CREDIT_COST} credit{quantity * IMAGE_CREDIT_COST === 1 ? "" : "s"}
          </span>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Generating…" : "✦ Generate images"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
