"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { loadTextLimits } from "@/lib/text-limits";

export type ContactState = { error?: string; message?: string } | undefined;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitContactForm(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { error: "Name, email, and message are required." };
  }
  const limits = await loadTextLimits(await createClient());
  if (
    name.length > limits.name ||
    email.length > limits.email ||
    phone.length > limits.short_text ||
    message.length > limits.instructions
  ) {
    return { error: "One of the fields above is too long. Please shorten it and try again." };
  }

  const { error } = await resend.emails.send({
    from: "VeXyllo AI Contact Form <contact@vexyllo.com>",
    to: ["support@vexyllo.com"],
    replyTo: email,
    subject: `New contact form message from ${name}`,
    text: [`Name: ${name}`, `Email: ${email}`, phone && `Phone: ${phone}`, "", message]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    return { error: "Something went wrong sending your message. Please email us directly instead." };
  }

  return { message: "Thanks — your message is in. We typically reply within one business day." };
}
