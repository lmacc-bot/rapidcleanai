import { isBillingPlanId, type BillingAiSpeed, type BillingPlanId } from "@/lib/stripe";

export const QUOTE_USAGE_WINDOW_HOURS = 24;
export const QUOTE_USAGE_WINDOW_MS = QUOTE_USAGE_WINDOW_HOURS * 60 * 60 * 1000;
export const RECENT_SAVED_QUOTES_DISPLAY_LIMIT = 5;

export type QuoteLimitFeature = "daily_quotes" | "saved_quotes" | "export";

export type QuoteUsageSummary = {
  selectedPlan: BillingPlanId;
  effectivePlan: BillingPlanId;
  isTrialing: boolean;
  paymentStatus: string | null;
  quoteLimit: number | null;
  quotesUsed: number;
  quotesRemaining: number | null;
  windowStartedAt: string | null;
  resetsAt: string | null;
  savedQuotesVisible: number;
  savedQuotesLimit: number | null;
  hiddenSavedQuotes: number;
  historyDays: number | null;
  exportEnabled: boolean;
  templatesEnabled: boolean;
  aiSpeed: BillingAiSpeed;
};

export type SavedQuoteSummary = {
  id: number;
  prompt: string;
  createdAt: string;
  requestId: string;
  recommendedEstimate: number;
  summary: string;
  planAtGeneration: BillingPlanId;
};

export type QuoteApiErrorPayload = {
  error: string;
  code: string;
  feature?: QuoteLimitFeature;
  plan?: BillingPlanId;
  limit?: number | null;
  used?: number | null;
  remaining?: number | null;
  resetsAt?: string | null;
  upgradeHref?: string;
  upgradePlan?: BillingPlanId | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isQuoteApiErrorPayload(value: unknown): value is QuoteApiErrorPayload {
  if (!isRecord(value) || typeof value.error !== "string" || typeof value.code !== "string") {
    return false;
  }

  if (value.feature !== undefined) {
    if (value.feature !== "daily_quotes" && value.feature !== "saved_quotes" && value.feature !== "export") {
      return false;
    }
  }

  if (value.plan !== undefined && !isBillingPlanId(value.plan)) {
    return false;
  }

  if (value.limit !== undefined && value.limit !== null && typeof value.limit !== "number") {
    return false;
  }

  if (value.used !== undefined && value.used !== null && typeof value.used !== "number") {
    return false;
  }

  if (value.remaining !== undefined && value.remaining !== null && typeof value.remaining !== "number") {
    return false;
  }

  if (value.resetsAt !== undefined && value.resetsAt !== null && typeof value.resetsAt !== "string") {
    return false;
  }

  if (value.upgradeHref !== undefined && typeof value.upgradeHref !== "string") {
    return false;
  }

  if (value.upgradePlan !== undefined && value.upgradePlan !== null && !isBillingPlanId(value.upgradePlan)) {
    return false;
  }

  return true;
}
