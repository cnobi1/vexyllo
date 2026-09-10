import { unstable_rethrow } from "next/navigation";

export type ActionError = { error: string };

/**
 * Runs a Server Action's body and converts any thrown Error into a returned
 * {error} value instead of letting it cross the action boundary as a thrown
 * exception. In production builds, Next/React Flight always replaces a
 * thrown error's message with a generic "error occurred in the Server
 * Components render" placeholder on the client (react-server-dom's
 * resolveErrorProd) regardless of what was actually thrown — every
 * `throw new Error("helpful message")` in an action was silently unreadable
 * in production despite working fine in dev. redirect()/notFound()/forbidden()
 * still propagate via unstable_rethrow — those are Next's own control-flow
 * signals, not application errors, and must not be swallowed here.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<T | ActionError> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export function isActionError(result: unknown): result is ActionError {
  return typeof result === "object" && result !== null && "error" in result;
}
