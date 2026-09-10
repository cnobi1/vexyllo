"use client";

import { generateSceneBreakdown } from "@/lib/actions/scenes";
import { useActionForm } from "@/app/_components/use-action-form";
import { GenerateButton } from "./submit-button";

export function GenerateBreakdownForm({
  projectId,
  hasScenes,
  targetSceneDurationSeconds,
}: {
  projectId: string;
  hasScenes: boolean;
  targetSceneDurationSeconds: number | null;
}) {
  const [state, formAction] = useActionForm(generateSceneBreakdown.bind(null, projectId));

  return (
    <form action={formAction} className="card-glow flex flex-col gap-3 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-foreground">Generate Scenes</h2>
      <p className="text-sm text-muted">
        {hasScenes
          ? "Regenerating replaces the current scene breakdown with a fresh one from the script. Existing characters, locations, and props are matched by name and keep their reference images — only ones no longer in the script are removed."
          : "Break this project's script down into a scene-by-scene breakdown sheet: each scene's full text, estimated screen time, and the characters (with wardrobe notes), locations, and props it contains. Every scene is kept between 10 and 30 seconds of screen time — a longer beat is automatically split across sequential scenes, and a shorter one is combined with its neighbor."}
      </p>
      <label className="flex items-center gap-2 text-sm text-muted">
        Target scene duration
        <input
          type="number"
          name="targetSceneDurationSeconds"
          min={10}
          max={30}
          defaultValue={targetSceneDurationSeconds ?? ""}
          placeholder="10-30"
          className="w-20 rounded-lg border border-border bg-background/60 px-2 py-1 text-sm text-foreground outline-none focus:border-border-strong"
        />
        seconds (optional, 10-30)
      </label>
      <GenerateButton hasScenes={hasScenes} />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
