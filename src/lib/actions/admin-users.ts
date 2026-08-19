"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "./admin-guard";

/**
 * Admin-granted credits (goodwill/support credits, not a purchase) can
 * target a user who has never subscribed, so no `subscriptions` row may
 * exist yet — the credits_ledger trigger (apply_credit_ledger_entry) only
 * updates an *existing* row, so one has to exist before the ledger insert
 * below or the grant would silently vanish into a no-op UPDATE. The
 * stripe_customer_id/plan values here are non-Stripe sentinels ("admin
 * grant, not a real subscription"), never fed into a real Stripe API call
 * elsewhere in the app.
 */
export async function grantUserCredits(userId: string, amount: number) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Enter a positive whole number of credits.");
  }

  const service = createServiceClient();

  const { data: existing, error: lookupError } = await service
    .from("subscriptions")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  if (!existing) {
    const { error: insertError } = await service.from("subscriptions").insert({
      user_id: userId,
      stripe_customer_id: "admin-granted",
      plan: "free",
      status: "active",
    });
    if (insertError) throw new Error(insertError.message);
  }

  const { error: ledgerError } = await service
    .from("credits_ledger")
    .insert({ user_id: userId, amount, reason: "admin_adjustment" });
  if (ledgerError) throw new Error(ledgerError.message);

  revalidatePath("/admin/users");
}
