import { IMAGE_CREDIT_COST, videoCreditCost } from "./credit-costs";

// Shared between the logged-out /pricing page and the authenticated
// /billing page so the two don't drift into inconsistent answers about the
// same credit system. A function (not a static array) because the video
// figure depends on the admin-tunable min-video-credit floor
// (credit_cost_settings) — callers load that live and pass it in, rather
// than this module computing it once from the hardcoded constant at import
// time.
export function buildBillingFaqs(creditsPerVideoSecond1080p: number = videoCreditCost(1, "1080p")) {
  return [
    {
      question: "What's a credit?",
      answer: `A credit is what generation costs come out of. An image generation costs ${IMAGE_CREDIT_COST} credits; video costs ${creditsPerVideoSecond1080p} credits per second at 1080p (less at lower resolutions). A failed generation never costs a credit.`,
    },
    {
      question: "Do unused credits roll over?",
      answer: "Yes, credits don't expire. Every renewal adds your plan's credits on top of whatever you have left.",
    },
    {
      question: "Can I change plans later?",
      answer: "Yes, upgrade or downgrade any time from your billing page. It takes effect on your next renewal.",
    },
  ];
}
