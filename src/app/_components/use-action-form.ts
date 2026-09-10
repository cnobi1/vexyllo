"use client";

import { useActionState } from "react";
import { isActionError, type ActionError } from "@/lib/actions/action-result";

/**
 * Adapts a runAction-wrapped Server Action (returns T | ActionError instead
 * of throwing — see action-result.ts) into useActionState's shape, so a
 * plain `<form action={formAction}>` still shows the real failure message.
 * Keeping the native `action` prop (rather than switching to onSubmit)
 * matters here specifically because it's the only way SubmitButton's
 * useFormStatus() picks up the pending state — an onSubmit + useTransition
 * form never triggers useFormStatus.
 */
export function useActionForm<T>(action: (formData: FormData) => Promise<T | ActionError>) {
  return useActionState<{ error: string } | null, FormData>(async (_prevState, formData) => {
    const result = await action(formData);
    return isActionError(result) ? { error: result.error } : null;
  }, null);
}
