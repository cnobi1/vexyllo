"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GSI_SCRIPT_ID = "google-identity-services";
const BUTTON_WIDTH = 320;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

/**
 * Random nonce (raw + SHA-256 hex digest), per Supabase's signInWithIdToken
 * docs: the hashed form goes to Google (initialize's `nonce`), the raw form
 * goes back to Supabase (signInWithIdToken's `nonce`) so it can verify the
 * ID token wasn't replayed.
 */
async function generateNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return [raw, hashed];
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

/**
 * Signs the user in via Google Identity Services' own button + credential
 * flow (an id_token handed to supabase.auth.signInWithIdToken), instead of
 * Supabase's hosted OAuth redirect (supabase.auth.signInWithOAuth, the
 * previous implementation here). The redirect flow's Google consent screen
 * always reads "to continue to <project-ref>.supabase.co" -- that's
 * GoTrue's own callback URL, which Google displays verbatim, and the only
 * way to change *that* is Supabase's paid Custom Domain add-on (see the
 * project_pending_custom_auth_domain memory, declined as a paid option).
 * This flow instead has the browser talk to Google directly from our own
 * origin, so Google shows our own domain on the consent screen instead --
 * no Supabase add-on, no extra redirect hop. Requires the site's origin(s)
 * (production + localhost) to be added under "Authorized JavaScript
 * origins" on this Client ID in Google Cloud Console -- a one-time manual
 * step only the project owner can do there. See
 * https://supabase.com/docs/guides/auth/social-login/auth-google#google-pre-built-button.
 */
export function GoogleAuthButton({ mode }: { mode: "continue" | "signup" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Render-time check below already hides the component entirely when
    // this is unset, so there's nothing to synchronize here in that case.
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      const [rawNonce, hashedNonce] = await generateNonce();
      await loadGsiScript();
      if (cancelled || !containerRef.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          const supabase = createClient();
          const { error: signInError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          });
          if (signInError) {
            setError(signInError.message);
            return;
          }
          // Full navigation, not router.push/refresh: this codebase has an
          // observed router.refresh()-after-client-side-auth hang in this
          // exact Next.js/Turbopack setup (see image-generate-form.tsx's
          // upload mode and delete-upload-button.tsx), so a hard reload is
          // the reliable choice on a login-critical path.
          window.location.assign("/dashboard");
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: BUTTON_WIDTH,
        text: mode === "signup" ? "signup_with" : "continue_with",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
