import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // A recovery link must always land on the reset-password page — never
  // trust `next` for this type, since it comes from the email template
  // and getting it wrong would drop the user on /dashboard mid-recovery
  // with no way to actually set their new password.
  const next = type === "recovery" ? "/reset-password" : (searchParams.get("next") ?? "/dashboard");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
