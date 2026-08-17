import { stripeBillingAdapter } from "./stripe-adapter";
import { mockBillingAdapter } from "./mock-adapter";
import type { BillingProvider } from "./types";

export function getBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY) return stripeBillingAdapter;
  return mockBillingAdapter;
}

export type { BillingProvider, StartCheckoutInput, StartCheckoutResult } from "./types";
