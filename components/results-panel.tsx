"use client";

import type { MockQuoteResponse } from "@/lib/mock-quote";
import type { QuoteApiErrorPayload, QuoteUsageSummary, SavedQuoteSummary } from "@/lib/quote-limits";
import { Copy, Download, FilePlus2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { GlowButton } from "@/components/glow-button";
import { useT } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingPlanLabel, MANAGE_BILLING_HREF } from "@/lib/stripe";

type ResultsPanelProps = {
  result: MockQuoteResponse | null;
  loading: boolean;
  copied: boolean;
  errorMessage: string | null;
  usage: QuoteUsageSummary;
  recentQuotes: SavedQuoteSummary[];
  apiLimitError: QuoteApiErrorPayload | null;
  exporting: boolean;
  onNewQuote: () => void;
  onCopy: () => void;
  onClear: () => void;
  onExport: () => Promise<void> | void;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatHistoryWindow(historyDays: number | null) {
  return historyDays === null ? "Unlimited history" : `${historyDays}-day history`;
}

function formatSavedQuotesLimit(usage: QuoteUsageSummary) {
  return usage.savedQuotesLimit === null
    ? `${usage.savedQuotesVisible} saved quotes`
    : `${usage.savedQuotesVisible} of ${usage.savedQuotesLimit} visible`;
}

function formatSavedQuoteDate(isoString: string) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "Saved recently";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUpgradePrompt(usage: QuoteUsageSummary, apiLimitError: QuoteApiErrorPayload | null) {
  if (apiLimitError?.upgradeHref) {
    return {
      title: apiLimitError.error,
      description:
        apiLimitError.feature === "daily_quotes"
          ? "Upgrade in Billing to increase your quote capacity without waiting for the next 24-hour reset."
          : "Open Billing to unlock more capability on your current account.",
      href: apiLimitError.upgradeHref,
      cta:
        apiLimitError.upgradePlan !== null
          ? `Upgrade to ${getBillingPlanLabel(apiLimitError.upgradePlan)}`
          : "Manage Billing",
    };
  }

  if (usage.hiddenSavedQuotes > 0 && usage.savedQuotesLimit !== null) {
    return {
      title: `${getBillingPlanLabel(usage.selectedPlan)} currently shows your newest ${usage.savedQuotesLimit} saved quotes.`,
      description: `Upgrade in Billing to unlock ${usage.hiddenSavedQuotes} additional saved quote${
        usage.hiddenSavedQuotes === 1 ? "" : "s"
      } and keep a longer retained quote library.`,
      href: MANAGE_BILLING_HREF,
      cta: "Upgrade Billing",
    };
  }

  if (!usage.exportEnabled) {
    return {
      title: "Export is locked on Starter.",
      description: "Upgrade to Pro or Elite in Billing to export saved quotes for handoff, review, or archiving.",
      href: MANAGE_BILLING_HREF,
      cta: "Unlock Export",
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
  onNewQuote,
  onCopy,
  onClear,
  onExport,
}: ResultsPanelProps) {
  const t = useT();
  const upgradePrompt = getUpgradePrompt(usage, apiLimitError);

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
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Quotes</p>
            <p className="mt-2 text-white">
              {usage.quoteLimit === null
                ? "Unlimited"
                : `${usage.quotesUsed} used / ${usage.quoteLimit}`}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              {usage.quoteLimit === null
                ? "Trial and Elite accounts stay open-ended."
                : `${usage.quotesRemaining ?? 0} remaining before the next reset.`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Saved Quotes</p>
            <p className="mt-2 text-white">{formatSavedQuotesLimit(usage)}</p>
            <p className="mt-1 text-xs text-brand-muted">{formatHistoryWindow(usage.historyDays)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Export</p>
            <p className="mt-2 text-white">{usage.exportEnabled ? "Enabled" : "Upgrade Required"}</p>
            <p className="mt-1 text-xs text-brand-muted">
              {usage.templatesEnabled ? "Templates included on this plan." : "Templates unlock on Elite."}
            </p>
          </div>
        </div>

        {upgradePrompt ? (
          <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-5">
            <p className="text-sm font-semibold text-white">{upgradePrompt.title}</p>
            <p className="mt-2 text-sm leading-7 text-brand-text">{upgradePrompt.description}</p>
            <div className="mt-4">
              <GlowButton href={upgradePrompt.href} variant="secondary" trailingIcon={false}>
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
                  Suggested range {money.format(result.recommendedEstimate.low)} -{" "}
                  {money.format(result.recommendedEstimate.high)}
                </p>
              </div>
              <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{t("results_margin_note")}</p>
                <p className="mt-3 text-sm leading-7 text-brand-text">{result.marginNote}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brand-muted">
                  <ShieldCheck className="size-3.5 text-brand-neon" />
                  Phase 1 protected dashboard
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_summary")}</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.summary}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">{t("results_customer_message")}</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.customerMessage}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
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
            <Badge variant="secondary">{formatHistoryWindow(usage.historyDays)}</Badge>
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
                      {formatSavedQuoteDate(quote.createdAt)}
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
