"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertMaxLength, loadTextLimits } from "@/lib/text-limits";
import { isPlanId } from "@/lib/billing/plans";
import { requireAdmin } from "./admin-guard";
import { runAction } from "./action-result";

// Fixed key/id sets for both tables — no insert/delete policy on either
// (see the add_subscription_plans_and_credit_cost_settings migration): app
// code references these ids/keys by name, so an admin can retune the
// numbers, not invent categories nothing reads. Same "admin edits, no
// deploy" pattern as /admin/models and /admin/text-limits.

export async function updatePlanCredits(planId: string, monthlyCredits: number) {
  return runAction(() => updatePlanCreditsImpl(planId, monthlyCredits));
}

async function updatePlanCreditsImpl(planId: string, monthlyCredits: number) {
  if (!Number.isInteger(monthlyCredits) || monthlyCredits <= 0) {
    throw new Error("Monthly credits must be a positive whole number.");
  }

  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase
    .from("subscription_plans")
    .update({ monthly_credits: monthlyCredits })
    .eq("id", planId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/pricing");
}

export async function updateCreditCostSetting(key: string, credits: number) {
  return runAction(() => updateCreditCostSettingImpl(key, credits));
}

async function updateCreditCostSettingImpl(key: string, credits: number) {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error("Credits must be a positive whole number.");
  }

  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from("credit_cost_settings").update({ credits }).eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/pricing");
}

// Unlike the two fixed-row-set tables above, subscription_plan_features has
// full insert/update/delete admin policies (see the
// add_subscription_plan_features migration) — an admin adds and removes
// arbitrary pricing-card bullets per plan, not just retunes a fixed set.

export async function createPlanFeature(planId: string, label: string, sortOrder: number) {
  return runAction(() => createPlanFeatureImpl(planId, label, sortOrder));
}

async function createPlanFeatureImpl(planId: string, label: string, sortOrder: number) {
  if (!isPlanId(planId)) throw new Error("Unknown plan.");
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Feature text is required.");

  const supabase = await createClient();
  await requireAdmin(supabase);
  assertMaxLength(trimmed, (await loadTextLimits(supabase)).short_text, "Feature");

  const { error } = await supabase
    .from("subscription_plan_features")
    .insert({ plan_id: planId, label: trimmed, sort_order: sortOrder });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/pricing");
}

export async function updatePlanFeature(id: string, label: string, sortOrder: number) {
  return runAction(() => updatePlanFeatureImpl(id, label, sortOrder));
}

async function updatePlanFeatureImpl(id: string, label: string, sortOrder: number) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Feature text is required.");

  const supabase = await createClient();
  await requireAdmin(supabase);
  assertMaxLength(trimmed, (await loadTextLimits(supabase)).short_text, "Feature");

  const { error } = await supabase
    .from("subscription_plan_features")
    .update({ label: trimmed, sort_order: sortOrder })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/pricing");
}

export async function deletePlanFeature(id: string) {
  return runAction(() => deletePlanFeatureImpl(id));
}

async function deletePlanFeatureImpl(id: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from("subscription_plan_features").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/pricing");
}
