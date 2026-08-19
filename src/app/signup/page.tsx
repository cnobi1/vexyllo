"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signup, type AuthState } from "@/lib/actions/auth";
import { Logo } from "@/app/_components/logo";
import { GoogleAuthButton } from "@/app/_components/google-auth-button";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined,
  );
  const idea = useSearchParams().get("idea");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card-glow flex w-full max-w-sm flex-col gap-4 rounded-2xl p-8">
        <Link href="/" className="self-center">
          <Logo className="h-9 w-auto" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Sign up</h1>
        {idea && (
          <p className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted">
            We&apos;ll start your project from: <span className="text-foreground">&ldquo;{idea}&rdquo;</span>
          </p>
        )}
        <GoogleAuthButton label="Sign up with Google" />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form action={action} className="flex flex-col gap-4">
          {idea && <input type="hidden" name="idea" value={idea} />}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
            />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.message && <p className="text-sm text-success">{state.message}</p>}
          <button
            disabled={pending}
            type="submit"
            className="btn-primary rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Signing up…" : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
