"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/lib/actions/auth";
import { Logo } from "@/app/_components/logo";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined,
  );

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        action={action}
        className="card-glow flex w-full max-w-sm flex-col gap-4 rounded-2xl p-8"
      >
        <Logo className="h-7 w-auto self-start" />
        <h1 className="text-xl font-semibold text-foreground">Sign up</h1>
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
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
