"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactForm, type ContactState } from "@/lib/actions/contact";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContactForm, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card-glow flex flex-col gap-4 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-foreground">Send us a message</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-muted">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
          />
        </div>
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
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm text-muted">
          Phone <span className="text-muted-2">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm text-muted">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.message && <p className="text-sm text-success">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="btn-primary self-start rounded-full px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
