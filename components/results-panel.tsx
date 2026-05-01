"use client";

import type { MockQuoteResponse } from "@/lib/mock-quote";
import type { QuoteApiErrorPayload, QuoteUsageSummary, SavedQuoteSummary } from "@/lib/quote-limits";
import { Copy, Download, FilePlus2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { GlowButton } from "@/components/glow-button";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingPlanLabel, MANAGE_BILLING_HREF } from "@/lib/stripe";
import type { Language, TranslationKey } from "@/lib/translations";

type ResultsPanelProps = {
  result: MockQuoteResponse | null;
  loading: boolean;
  copied: boolean;
  errorMessage: string | null;
  usage: QuoteUsageSummary;
  recentQuotes: SavedQuoteSummary[];
  apiLimitError: QuoteApiErrorPayload | null;
  exporting: boolean;
  proposalLoading: boolean;
  onNewQuote: () => void;
  onCopy: () => void;
  onClear: () => void;
  onExport: () => Promise<void> | void;
  onCreateProposal: (savedQuoteId: number | null | undefined) => Promise<void> | void;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

type Translator = (key: TranslationKey) => string;

function fillTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replace(`{${key}}`, String(value)),
    template,
  );
}

function trackClientEvent(eventName: string, metadata: Record<string, unknown>) {
  void fetch("/api/events/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_name: eventName,
      metadata,
    }),
    cache: "no-store",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => null);
}

function formatHistoryWindow(historyDays: number | null, t: Translator) {
  return historyDays === null
    ? t("results_unlimited_history")
    : fillTemplate(t("results_day_history"), { days: historyDays });
}

function formatSavedQuotesLimit(usage: QuoteUsageSummary, t: Translator) {
  return usage.savedQuotesLimit === null
    ? fillTemplate(t("results_saved_quotes_count"), { count: usage.savedQuotesVisible })
    : fillTemplate(t("results_saved_quotes_visible"), {
        visible: usage.savedQuotesVisible,
        limit: usage.savedQuotesLimit,
      });
}

function formatSavedQuoteDate(isoString: string, language: Language, t: Translator) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return t("results_saved_recently");
  }

  return date.toLocaleString(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLaborHoursRange(
  estimatedLaborHours: MockQuoteResponse["estimatedLaborHours"],
  t: Translator,
) {
  if (!estimatedLaborHours) {
    return t("results_labor_to_confirm");
  }

  return fillTemplate(t("results_labor_hours_range"), {
    low: number.format(estimatedLaborHours.low),
    high: number.format(estimatedLaborHours.high),
  });
}

function getUpgradePrompt(
  usage: QuoteUsageSummary,
  apiLimitError: QuoteApiErrorPayload | null,
  t: Translator,
) {
  if (apiLimitError?.upgradeHref) {
    return {
      title: apiLimitError.error,
      description:
        apiLimitError.feature === "daily_quotes"
          ? t("results_upgrade_daily")
          : t("results_upgrade_capability"),
      href: apiLimitError.upgradeHref,
      cta:
        apiLimitError.upgradePlan !== null
          ? fillTemplate(t("results_upgrade_to"), {
              plan: getBillingPlanLabel(apiLimitError.upgradePlan),
            })
          : t("results_manage_billing"),
    };
  }

  if (usage.hiddenSavedQuotes > 0 && usage.savedQuotesLimit !== null) {
    return {
      title: fillTemplate(t("results_hidden_saved_title"), {
        plan: getBillingPlanLabel(usage.selectedPlan),
        limit: usage.savedQuotesLimit,
      }),
      description: fillTemplate(t("results_hidden_saved_description"), {
        count: usage.hiddenSavedQuotes,
        plural: usage.hiddenSavedQuotes === 1 ? "" : "s",
      }),
      href: MANAGE_BILLING_HREF,
      cta: t("results_upgrade_billing"),
    };
  }

  if (!usage.exportEnabled) {
    return {
      title: t("results_unlock_export_title"),
      description: t("results_unlock_export_description"),
      href: MANAGE_BILLING_HREF,
      cta: t("results_unlock_export_cta"),
    };
  }

  return null;
}

export function ResultsPanel({
  result,
  loading,
  copied,
  errorMessage,
  usage,
  recentQuotes,
  apiLimitError,
  exporting,
  proposalLoading,
  onNewQuote,
  onCopy,
  onClear,
  onExport,
  onCreateProposal,
}: ResultsPanelProps) {
  const { language, t } = useLanguage();
  const upgradePrompt = getUpgradePrompt(usage, apiLimitError, t);

  return (
    <Card className="surface-gradient premium-border h-full">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary">{t("results_panel")}</Badge>
            <CardTitle className="mt-3 text-2xl">{t("results_title")}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onNewQuote}>
              <FilePlus2 className="size-4" />
              {t("results_new_quote")}
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={onCopy} disabled={!result}>
              <Copy className="size-4" />
              {copied ? t("results_copied") : t("results_copy")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => onCreateProposal(result?.savedQuoteId)}
              disabled={!result?.savedQuoteId || proposalLoading}
              title={!result?.savedQuoteId ? t("proposal_saved_quote_required") : undefined}
            >
              <Sparkles className="size-4" />
              {proposalLoading ? t("results_creating_proposal") : t("results_create_proposal")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onExport}
              disabled={exporting || !usage.exportEnabled || recentQuotes.length === 0}
            >
              <Download className="size-4" />
              {exporting ? t("results_exporting") : t("results_export")}
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={onClear}>
              <RotateCcw className="size-4" />
              {t("results_clear")}
            </Button>
          </div>
        </div>
        <CardDescription className="text-base leading-7">
          {t("results_description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">{t("results_quotes_label")}</p>
            <p className="mt-2 text-white">
              {usage.quoteLimit === null
                ? t("results_unlimited")
                : fillTemplate(t("results_used_of_limit"), {
                    used: usage.quotesUsed,
                    limit: usage.quoteLimit,
                  })}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              {usage.quoteLimit === null
                ? t("results_trial_unlimited")
                : fillTemplate(t("results_remaining_before_reset"), {
                    remaining: usage.quotesRemaining ?? 0,
                  })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">{t("results_saved_quotes_label")}</p>
            <p className="mt-2 text-white">{formatSavedQuotesLimit(usage, t)}</p>
            <p className="mt-1 text-xs text-brand-muted">{formatHistoryWindow(usage.historyDays, t)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">{t("results_export_label")}</p>
            <p className="mt-2 text-white">
              {usage.exportEnabled ? t("results_enabled") : t("results_upgrade_required")}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              {usage.templatesEnabled ? t("results_templates_included") : t("results_templates_elite")}
            </p>
          </div>
        </div>

        {upgradePrompt ? (
          <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-5">
            <p className="text-sm font-semibold text-white">{upgradePrompt.title}</p>
            <p className="mt-2 text-sm leading-7 text-brand-text">{upgradePrompt.description}</p>
            <div className="mt-4">
              <GlowButton
                href={upgradePrompt.href}
                variant="secondary"
                trailingIcon={false}
                onClick={() =>
                  trackClientEvent("upgrade_clicked", {
                    source: "results_panel",
                    plan: usage.selectedPlan,
                    effective_plan: usage.effectivePlan,
                    language,
                  })
                }
              >
                {upgradePrompt.cta}
              </GlowButton>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {!result && !loading ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-[rgba(11,15,20,0.55)] px-6 text-center">
            <div className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-brand-neon/20 bg-brand-neon/10 text-brand-neon">
              <Sparkles className="size-6" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-white">
              {t("results_placeholder_title")}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-brand-muted">
              {t("results_placeholder_description")}
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-5 glow-ring">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">{t("results_recommended_estimate")}</p>
                <div className="mt-3 font-display text-5xl font-semibold text-white">
                  {money.format(result.recommendedEstimate.recommended)}
                </div>
                <p className="mt-3 text-sm text-brand-text/90">
                  {t("results_suggested_range")} {money.format(result.recommendedEstimate.low)} -{" "}
                  {money.format(result.recommendedEstimate.high)}
                </p>
              </div>
              <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{t("results_margin_note")}</p>
                <p className="mt-3 text-sm leading-7 text-brand-text">{result.marginNote}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brand-muted">
                  <ShieldCheck className="size-3.5 text-brand-neon" />
                  {t("results_protected_dashboard")}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_why_price")}</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">
                  {t("results_why_price_description")}
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-[rgba(11,15,20,0.58)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                    {t("results_labor_estimate")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatLaborHoursRange(result.estimatedLaborHours, t)}
                  </p>
                </div>
                {result.breakdownLineItems?.length ? (
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                    {result.breakdownLineItems.map((item) => (
                      <li key={`${item.label}-${item.low}-${item.high}`}>
                        <span className="font-medium text-brand-text">{item.label}</span>:{" "}
                        {money.format(item.low)} - {money.format(item.high)}
                        {item.note ? <span> ({item.note})</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-brand-muted">
                    {t("results_why_price_fallback")}
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_summary")}</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.summary}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_customer_message")}</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.customerMessage}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_scope")}</h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                  {result.scopeHighlights.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_upsells")}</h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                  {result.upsellSuggestions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-5">
              <h4 className="font-display text-xl text-white">{t("results_next_actions")}</h4>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                {result.nextActions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-5">
              <h4 className="font-display text-xl text-white">{t("results_cta_title")}</h4>
              <p className="mt-3 text-sm leading-7 text-brand-text">{t("results_cta_description")}</p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onCreateProposal(result.savedQuoteId)}
                  disabled={!result.savedQuoteId || proposalLoading}
                  title={!result.savedQuoteId ? t("proposal_saved_quote_required") : undefined}
                >
                  <Sparkles className="size-4" />
                  {proposalLoading ? t("results_creating_proposal") : t("results_create_proposal")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-xl text-white">{t("results_saved_history")}</h4>
              <p className="mt-2 text-sm leading-7 text-brand-muted">
                {t("results_saved_history_description")}
              </p>
            </div>
            <Badge variant="secondary">{formatHistoryWindow(usage.historyDays, t)}</Badge>
          </div>

          {recentQuotes.length ? (
            <div className="mt-5 space-y-3">
              {recentQuotes.map((quote) => (
                <div
                  key={`${quote.id}-${quote.requestId}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{money.format(quote.recommendedEstimate)}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                      {formatSavedQuoteDate(quote.createdAt, language, t)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-brand-muted">{quote.prompt}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-7 text-brand-muted">
              {t("results_no_saved")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
