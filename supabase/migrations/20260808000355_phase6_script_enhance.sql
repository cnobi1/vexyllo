-- Phase 6: script enhance mode (Upload & Enhance tab). Before the AI
-- polishes an uploaded/pasted script, the pre-AI extracted/pasted text is
-- stashed here so the user can restore it from the "Edit manually" tab.
-- Nullable: absent for projects that have never used Upload & Enhance.
-- Set by enhanceScriptFromUpload() alongside script_text; cleared back to
-- null by restoreOriginalScript() once restored.
alter table public.projects
  add column if not exists original_script_text text;
