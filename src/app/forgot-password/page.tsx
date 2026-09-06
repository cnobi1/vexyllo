"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/lib/actions/auth";
import { Logo } from "@/app/_components/logo";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card-glow flex w-full max-w-sm flex-col gap-4 rounded-2xl p-8">
        <Link href="/" className="self-center">
          <Logo className="h-9 w-auto" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted">
          Enter the email on your account and we&apos;ll send you a link to reset your password.
        </p>
        {state?.message ? (
          <p className="text-sm text-foreground">{state.message}</p>
        ) : (
          <form action={action} className="flex flex-col gap-4">
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
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <button
              disabled={pending}
              type="submit"
              className="btn-primary rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <p className="text-sm text-muted">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
