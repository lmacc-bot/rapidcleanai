import "server-only";

import type { MockQuoteResponse } from "@/lib/mock-quote";
import { isMockQuoteResponse } from "@/lib/mock-quote";
import {
  QUOTE_USAGE_WINDOW_MS,
  RECENT_SAVED_QUOTES_DISPLAY_LIMIT,
  type QuoteApiErrorPayload,
  type QuoteUsageSummary,
  type SavedQuoteSummary,
} from "@/lib/quote-limits";
import {
  getBillingPlanLimits,
  getBillingPlanUpgradeTarget,
  MANAGE_BILLING_HREF,
  normalizeBillingPlan,
  type BillingPlanId,
} from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getBillingAccessStatus } from "@/lib/supabase/access";

type QuoteUsageWindowRow = {
  quotes_used: number | null;
  window_started_at: string | null;
};

type SavedQuoteRow = {
  id: number;
  prompt: string | null;
  quote_payload: unknown;
  plan_at_generation: string | null;
  created_at: string | null;
};

type EffectiveQuotePlan = {
  selectedPlan: BillingPlanId;
  effectivePlan: BillingPlanId;
  paymentStatus: string | null;
  isTrialing: boolean;
  hasAccess: boolean;
};

type QuoteGenerationAllowance =
  | {
      allowed: true;
      usage: QuoteUsageSummary;
      plan: EffectiveQuotePlan;
    }
  | {
      allowed: false;
      status: number;
      error: QuoteApiErrorPayload;
    };

type ExportableQuote = {
  id: number;
  createdAt: string;
  prompt: string;
  planAtGeneration: BillingPlanId;
  quote: MockQuoteResponse;
};

type QuoteWorkspaceSnapshotOptions = {
  onReadFailure?: "default" | "throw";
};

type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>;

function normalizeNullableCount(count: number | null) {
  return typeof count === "number" && Number.isFinite(count) && count >= 0 ? count : 0;
}

function normalizeIsoDate(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime()) ? fallback : normalized.toISOString();
}

function getNowIso() {
  return new Date().toISOString();
}

function createQuoteUsageAdminClient() {
  return createAdminSupabaseClient();
}

function buildDefaultUsageWindow(nowIso = getNowIso()) {
  return {
    quotesUsed: 0,
    windowStartedAt: nowIso,
    resetsAt: getResetIso(nowIso),
  };
}

function logQuoteUsageFailure(context: string, error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown error";

  console.error(`[quote usage] ${context}`, detail);
}

function getResetIso(windowStartedAt: string) {
  return new Date(new Date(windowStartedAt).getTime() + QUOTE_USAGE_WINDOW_MS).toISOString();
}

function getHistoryCutoffIso(historyDays: number | null) {
  if (historyDays === null) {
    return null;
  }

  return new Date(Date.now() - historyDays * 86_400_000).toISOString();
}

async function resolveEffectiveQuotePlan(userId: string): Promise<EffectiveQuotePlan> {
  const access = await getBillingAccessStatus(userId);
  const selectedPlan = normalizeBillingPlan(access.plan);
  const isTrialing = access.paymentStatus === "trialing";

  return {
    selectedPlan,
    effectivePlan: isTrialing ? "elite" : selectedPlan,
    paymentStatus: access.paymentStatus,
    isTrialing,
    hasAccess: access.hasAccess,
  };
}

function buildEmptySavedCounts() {
  return {
    visible: 0,
    hidden: 0,
  };
}

async function getActiveUsageWindow(
  userId: string,
  supabase: AdminSupabaseClient = createQuoteUsageAdminClient(),
) {
  const nowIso = getNowIso();
  const { data, error } = await supabase
    .from("quote_usage_windows")
    .select("quotes_used, window_started_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const currentRow = (data ?? null) as QuoteUsageWindowRow | null;

  if (!currentRow) {
    const { error: insertError } = await supabase.from("quote_usage_windows").upsert(
      {
        user_id: userId,
        quotes_used: 0,
        window_started_at: nowIso,
      },
      {
        onConflict: "user_id",
      },
    );

    if (insertError) {
      throw new Error(insertError.message);
    }

    return {
      quotesUsed: 0,
      windowStartedAt: nowIso,
      resetsAt: getResetIso(nowIso),
    };
  }

  const windowStartedAt = normalizeIsoDate(currentRow.window_started_at, nowIso);
  const resetsAt = getResetIso(windowStartedAt);

  if (Date.now() >= new Date(resetsAt).getTime()) {
    const { error: resetError } = await supabase
      .from("quote_usage_windows")
      .update({
        quotes_used: 0,
        window_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", userId);

    if (resetError) {
      throw new Error(resetError.message);
    }

    return {
      quotesUsed: 0,
      windowStartedAt: nowIso,
      resetsAt: getResetIso(nowIso),
    };
  }

  return {
    quotesUsed: normalizeNullableCount(currentRow.quotes_used),
    windowStartedAt,
    resetsAt,
  };
}

async function getSavedQuoteCounts(
  userId: string,
  historyDays: number | null,
  savedQuoteLimit: number | null,
  supabase: AdminSupabaseClient = createQuoteUsageAdminClient(),
) {
  const historyCutoffIso = getHistoryCutoffIso(historyDays);
  let countQuery = supabase
    .from("saved_quotes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  if (historyCutoffIso) {
    countQuery = countQuery.gte("created_at", historyCutoffIso);
  }

  const { count, error } = await countQuery;

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = normalizeNullableCount(count);

  return {
    visible: savedQuoteLimit === null ? totalCount : Math.min(totalCount, savedQuoteLimit),
    hidden: savedQuoteLimit === null ? 0 : Math.max(totalCount - savedQuoteLimit, 0),
  };
}

function buildQuoteUsageSummary(
  plan: EffectiveQuotePlan,
  usageWindow: {
    quotesUsed: number;
    windowStartedAt: string;
    resetsAt: string;
  },
  savedCounts: {
    visible: number;
    hidden: number;
  },
): QuoteUsageSummary {
  const planLimits = getBillingPlanLimits(plan.effectivePlan);
  const quoteLimit = planLimits.quotesPerDay;
  const quotesRemaining = quoteLimit === null ? null : Math.max(quoteLimit - usageWindow.quotesUsed, 0);

  return {
    selectedPlan: plan.selectedPlan,
    effectivePlan: plan.effectivePlan,
    isTrialing: plan.isTrialing,
    paymentStatus: plan.paymentStatus,
    quoteLimit,
    quotesUsed: usageWindow.quotesUsed,
    quotesRemaining,
    windowStartedAt: usageWindow.windowStartedAt,
    resetsAt: usageWindow.resetsAt,
    savedQuotesVisible: savedCounts.visible,
    savedQuotesLimit: planLimits.savedQuotes,
    hiddenSavedQuotes: savedCounts.hidden,
    historyDays: planLimits.historyDays,
    exportEnabled: planLimits.exportEnabled,
    templatesEnabled: planLimits.templatesEnabled,
    aiSpeed: planLimits.aiSpeed,
  };
}

function buildPlanLimitError(
  plan: EffectiveQuotePlan,
  usage: QuoteUsageSummary,
  feature: QuoteApiErrorPayload["feature"],
  message: string,
): QuoteApiErrorPayload {
  const upgradePlan = getBillingPlanUpgradeTarget(plan.selectedPlan);

  return {
    error: message,
    code: "plan_limit_reached",
    feature,
    plan: plan.selectedPlan,
    limit: feature === "daily_quotes" ? usage.quoteLimit : usage.savedQuotesLimit,
    used: feature === "daily_quotes" ? usage.quotesUsed : usage.savedQuotesVisible,
    remaining: feature === "daily_quotes" ? usage.quotesRemaining : null,
    resetsAt: feature === "daily_quotes" ? usage.resetsAt : null,
    upgradeHref: MANAGE_BILLING_HREF,
    upgradePlan,
  };
}

function mapSavedQuoteRow(row: SavedQuoteRow): SavedQuoteSummary | null {
  if (typeof row.id !== "number" || typeof row.prompt !== "string" || typeof row.created_at !== "string") {
    return null;
  }

  if (!isMockQuoteResponse(row.quote_payload)) {
    return null;
  }

  return {
    id: row.id,
    prompt: row.prompt,
    createdAt: row.created_at,
    requestId: row.quote_payload.requestId,
    recommendedEstimate: row.quote_payload.recommendedEstimate.recommended,
    summary: row.quote_payload.summary,
    planAtGeneration: normalizeBillingPlan(row.plan_at_generation),
  };
}

async function listSavedQuoteRows(
  userId: string,
  usage: QuoteUsageSummary,
  limit: number | null,
  supabase: AdminSupabaseClient = createQuoteUsageAdminClient(),
): Promise<SavedQuoteRow[]> {
  const historyCutoffIso = getHistoryCutoffIso(usage.historyDays);
  let query = supabase
    .from("saved_quotes")
    .select("id, prompt, quote_payload, plan_at_generation, created_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (historyCutoffIso) {
    query = query.gte("created_at", historyCutoffIso);
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SavedQuoteRow[];
}

export function buildQuoteUsageHeaders(usage: QuoteUsageSummary) {
  return {
    "X-Quote-Plan-Selected": usage.selectedPlan,
    "X-Quote-Plan-Effective": usage.effectivePlan,
    "X-Quote-Limit": usage.quoteLimit === null ? "unlimited" : String(usage.quoteLimit),
    "X-Quote-Used": String(usage.quotesUsed),
    "X-Quote-Remaining": usage.quotesRemaining === null ? "unlimited" : String(usage.quotesRemaining),
    "X-Quote-Reset-At": usage.resetsAt ?? "",
    "X-Saved-Quotes-Visible": String(usage.savedQuotesVisible),
    "X-Saved-Quotes-Limit": usage.savedQuotesLimit === null ? "unlimited" : String(usage.savedQuotesLimit),
    "X-Saved-Quotes-Hidden": String(usage.hiddenSavedQuotes),
    "X-Quote-History-Days": usage.historyDays === null ? "unlimited" : String(usage.historyDays),
    "X-Quote-Export-Enabled": usage.exportEnabled ? "true" : "false",
    "X-Quote-Templates-Enabled": usage.templatesEnabled ? "true" : "false",
    "X-Quote-AI-Speed": usage.aiSpeed,
  };
}

export async function getQuoteWorkspaceSnapshot(userId: string): Promise<{
  usage: QuoteUsageSummary;
  recentQuotes: SavedQuoteSummary[];
}> {
  return getQuoteWorkspaceSnapshotWithOptions(userId, {
    onReadFailure: "default",
  });
}

async function getQuoteWorkspaceSnapshotWithOptions(
  userId: string,
  options: QuoteWorkspaceSnapshotOptions,
): Promise<{
  usage: QuoteUsageSummary;
  recentQuotes: SavedQuoteSummary[];
}> {
  const plan = await resolveEffectiveQuotePlan(userId);
  const planLimits = getBillingPlanLimits(plan.effectivePlan);
  const supabase = createQuoteUsageAdminClient();

  try {
    const usageWindow = await getActiveUsageWindow(userId, supabase);
    const savedCounts = await getSavedQuoteCounts(
      userId,
      planLimits.historyDays,
      planLimits.savedQuotes,
      supabase,
    );
    const usage = buildQuoteUsageSummary(plan, usageWindow, savedCounts);
    const recentLimit =
      usage.savedQuotesLimit === null
        ? RECENT_SAVED_QUOTES_DISPLAY_LIMIT
        : Math.min(usage.savedQuotesLimit, RECENT_SAVED_QUOTES_DISPLAY_LIMIT);
    const recentQuoteRows = await listSavedQuoteRows(userId, usage, recentLimit, supabase);

    return {
      usage,
      recentQuotes: recentQuoteRows
        .map(mapSavedQuoteRow)
        .filter((quote): quote is SavedQuoteSummary => quote !== null),
    };
  } catch (error) {
    if (options.onReadFailure === "throw") {
      throw error;
    }

    logQuoteUsageFailure("Falling back to default dashboard quote usage snapshot.", error);
    const usage = buildQuoteUsageSummary(plan, buildDefaultUsageWindow(), buildEmptySavedCounts());

    return {
      usage,
      recentQuotes: [],
    };
  }
}

export async function checkQuoteGenerationAllowance(userId: string): Promise<QuoteGenerationAllowance> {
  const supabase = createQuoteUsageAdminClient();
  const plan = await resolveEffectiveQuotePlan(userId);
  const usageWindow = await getActiveUsageWindow(userId, supabase);
  const usage = buildQuoteUsageSummary(plan, usageWindow, buildEmptySavedCounts());

  if (usage.quoteLimit !== null && usage.quotesRemaining !== null && usage.quotesRemaining <= 0) {
    return {
      allowed: false,
      status: 429,
      error: buildPlanLimitError(
        plan,
        usage,
        "daily_quotes",
        `${plan.selectedPlan === "starter" ? "Starter" : plan.selectedPlan === "pro" ? "Pro" : "Elite"} allows ${
          usage.quoteLimit
        } quote${usage.quoteLimit === 1 ? "" : "s"} per 24-hour window. Upgrade in Billing for more capacity.`,
      ),
    };
  }

  return {
    allowed: true,
    usage,
    plan,
  };
}

export async function recordGeneratedQuote(input: {
  userId: string;
  prompt: string;
  quote: MockQuoteResponse;
  plan: EffectiveQuotePlan;
}): Promise<QuoteUsageSummary> {
  const supabase = createQuoteUsageAdminClient();
  const activeWindow = await getActiveUsageWindow(input.userId, supabase);
  const nextQuotesUsed = activeWindow.quotesUsed + 1;
  const nowIso = getNowIso();

  const { error: insertError } = await supabase.from("saved_quotes").insert({
    user_id: input.userId,
    prompt: input.prompt,
    quote_payload: input.quote,
    plan_at_generation: input.plan.effectivePlan,
  });

  if (insertError) {
    logQuoteUsageFailure("Failed to persist saved quote after generation.", insertError.message);
  }

  const { error: updateError } = await supabase.from("quote_usage_windows").upsert(
    {
      user_id: input.userId,
      quotes_used: nextQuotesUsed,
      window_started_at: activeWindow.windowStartedAt,
      updated_at: nowIso,
    },
    {
      onConflict: "user_id",
    },
  );

  if (updateError) {
    throw new Error(updateError.message);
  }

  const refreshedUsageWindow = {
    quotesUsed: nextQuotesUsed,
    windowStartedAt: activeWindow.windowStartedAt,
    resetsAt: activeWindow.resetsAt,
  };
  const planLimits = getBillingPlanLimits(input.plan.effectivePlan);
  let savedCounts = buildEmptySavedCounts();

  try {
    savedCounts = await getSavedQuoteCounts(
      input.userId,
      planLimits.historyDays,
      planLimits.savedQuotes,
      supabase,
    );
  } catch (error) {
    logQuoteUsageFailure("Failed to refresh saved quote counts after generation.", error);
  }

  return buildQuoteUsageSummary(input.plan, refreshedUsageWindow, savedCounts);
}

export async function getExportableQuotes(userId: string): Promise<
  | {
      allowed: true;
      usage: QuoteUsageSummary;
      quotes: ExportableQuote[];
    }
  | {
      allowed: false;
      status: number;
      error: QuoteApiErrorPayload;
    }
> {
  const snapshot = await getQuoteWorkspaceSnapshotWithOptions(userId, {
    onReadFailure: "throw",
  });

  if (!snapshot.usage.exportEnabled) {
    return {
      allowed: false,
      status: 403,
      error: {
        error: "Quote export is available on Pro and Elite plans. Upgrade in Billing to unlock exports.",
        code: "export_unavailable",
        feature: "export",
        plan: snapshot.usage.selectedPlan,
        limit: null,
        used: snapshot.usage.savedQuotesVisible,
        remaining: null,
        resetsAt: null,
        upgradeHref: MANAGE_BILLING_HREF,
        upgradePlan: getBillingPlanUpgradeTarget(snapshot.usage.selectedPlan),
      },
    };
  }

  const limit = snapshot.usage.savedQuotesLimit;
  const exportRows = await listSavedQuoteRows(userId, snapshot.usage, limit);
  const quotes = exportRows
    .map((row) => {
      const summary = mapSavedQuoteRow(row);

      if (!summary || !isMockQuoteResponse(row.quote_payload)) {
        return null;
      }

      return {
        id: summary.id,
        createdAt: summary.createdAt,
        prompt: summary.prompt,
        planAtGeneration: summary.planAtGeneration,
        quote: row.quote_payload,
      };
    })
    .filter((quote): quote is ExportableQuote => quote !== null);

  return {
    allowed: true,
    usage: snapshot.usage,
    quotes,
  };
}
