"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isMockQuoteResponse, type MockQuoteResponse } from "@/lib/mock-quote";
import {
  isQuoteApiErrorPayload,
  type QuoteApiErrorPayload,
  type QuoteUsageSummary,
  type SavedQuoteSummary,
} from "@/lib/quote-limits";
import { isBillingPlanId, MANAGE_BILLING_HREF } from "@/lib/stripe";
import { validateChatPromptInput } from "@/lib/validation";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { useLanguage, useT } from "@/components/language-provider";
import { ResultsPanel } from "@/components/results-panel";
import { Button } from "@/components/ui/button";
import type { TranslationKey } from "@/lib/translations";

function buildInitialMessage(content: string): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content,
  };
}

type Translator = (key: TranslationKey) => string;

function buildCopyPayload(result: MockQuoteResponse, t: Translator) {
  return [
    t("copy_quote_title"),
    `${t("copy_request_id")}: ${result.requestId}`,
    `${t("copy_recommended")}: $${result.recommendedEstimate.recommended}`,
    `${t("copy_range")}: $${result.recommendedEstimate.low}-$${result.recommendedEstimate.high}`,
    ``,
    t("copy_summary"),
    result.summary,
    ``,
    t("copy_customer_message"),
    result.customerMessage,
  ].join("\n");
}

function getApiErrorMessage(payload: unknown, t: Translator) {
  if (isQuoteApiErrorPayload(payload)) {
    return payload.error;
  }

  return t("results_generate_failed");
}

function readNullableNumberHeader(value: string | null) {
  if (!value || value === "unlimited") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBooleanHeader(value: string | null, fallback: boolean) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function getUsageFromHeaders(headers: Headers, current: QuoteUsageSummary): QuoteUsageSummary {
  const aiSpeedHeader = headers.get("X-Quote-AI-Speed");
  const aiSpeed =
    aiSpeedHeader === "slower" || aiSpeedHeader === "fast" || aiSpeedHeader === "fastest"
      ? aiSpeedHeader
      : current.aiSpeed;
  const selectedPlanHeader = headers.get("X-Quote-Plan-Selected");
  const effectivePlanHeader = headers.get("X-Quote-Plan-Effective");

  return {
    ...current,
    selectedPlan: isBillingPlanId(selectedPlanHeader) ? selectedPlanHeader : current.selectedPlan,
    effectivePlan: isBillingPlanId(effectivePlanHeader) ? effectivePlanHeader : current.effectivePlan,
    quoteLimit: readNullableNumberHeader(headers.get("X-Quote-Limit")) ?? current.quoteLimit,
    quotesUsed: readNullableNumberHeader(headers.get("X-Quote-Used")) ?? current.quotesUsed,
    quotesRemaining:
      readNullableNumberHeader(headers.get("X-Quote-Remaining")) ?? current.quotesRemaining,
    resetsAt: headers.get("X-Quote-Reset-At") || current.resetsAt,
    savedQuotesVisible:
      readNullableNumberHeader(headers.get("X-Saved-Quotes-Visible")) ?? current.savedQuotesVisible,
    savedQuotesLimit:
      readNullableNumberHeader(headers.get("X-Saved-Quotes-Limit")) ?? current.savedQuotesLimit,
    hiddenSavedQuotes:
      readNullableNumberHeader(headers.get("X-Saved-Quotes-Hidden")) ?? current.hiddenSavedQuotes,
    historyDays: readNullableNumberHeader(headers.get("X-Quote-History-Days")) ?? current.historyDays,
    exportEnabled: readBooleanHeader(headers.get("X-Quote-Export-Enabled"), current.exportEnabled),
    templatesEnabled: readBooleanHeader(
      headers.get("X-Quote-Templates-Enabled"),
      current.templatesEnabled,
    ),
    aiSpeed,
  };
}

function buildSavedQuoteSummary(result: MockQuoteResponse, usage: QuoteUsageSummary): SavedQuoteSummary {
  return {
    id: Date.now(),
    prompt: result.prompt,
    createdAt: result.generatedAt,
    requestId: result.requestId,
    recommendedEstimate: result.recommendedEstimate.recommended,
    summary: result.summary,
    planAtGeneration: usage.effectivePlan,
  };
}

function applyUsageError(current: QuoteUsageSummary, payload: QuoteApiErrorPayload) {
  if (payload.feature !== "daily_quotes") {
    return current;
  }

  return {
    ...current,
    quoteLimit: payload.limit ?? current.quoteLimit,
    quotesUsed: payload.used ?? current.quotesUsed,
    quotesRemaining: payload.remaining ?? current.quotesRemaining,
    resetsAt: payload.resetsAt ?? current.resetsAt,
  };
}

function getLimitModalUsage(payload: QuoteApiErrorPayload, usage: QuoteUsageSummary) {
  return {
    used: payload.used ?? usage.quotesUsed,
    limit: payload.limit ?? usage.quoteLimit,
  };
}

function shouldShowQuoteLimitModal(status: number, payload: QuoteApiErrorPayload) {
  return (
    payload.feature === "daily_quotes" &&
    (status === 429 || payload.code === "plan_limit_reached")
  );
}

function buildLocalQuoteLimitError(usage: QuoteUsageSummary, t: Translator): QuoteApiErrorPayload {
  return {
    error: t("dashboard_quote_limit_error"),
    code: "plan_limit_reached",
    feature: "daily_quotes",
    plan: usage.selectedPlan,
    limit: usage.quoteLimit,
    used: usage.quotesUsed,
    remaining: usage.quotesRemaining,
    resetsAt: usage.resetsAt,
    upgradeHref: MANAGE_BILLING_HREF,
    upgradePlan: usage.selectedPlan === "starter" ? "pro" : null,
  };
}

function QuoteLimitModal({
  payload,
  usage,
  onClose,
}: {
  payload: QuoteApiErrorPayload;
  usage: QuoteUsageSummary;
  onClose: () => void;
}) {
  const t = useT();
  const { used, limit } = getLimitModalUsage(payload, usage);
  const isStarter = payload.plan === "starter" || usage.selectedPlan === "starter";
  const usageLabel = typeof limit === "number" ? `${used}/${limit}` : `${used}/unlimited`;
  const modalBody = t("upgrade_modal_body").replace("{usage}", usageLabel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-limit-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-brand-surface p-6 shadow-[0_24px_90px_rgba(0,0,0,0.46)]">
        <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">{t("upgrade_modal_heading")}</p>
          <h2 id="quote-limit-title" className="mt-3 font-display text-3xl font-semibold text-white">
            {t("upgrade_modal_title")}
          </h2>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-7 text-brand-text">
          {usage.isTrialing ? (
            <p className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 font-medium text-white">
              {t("upgrade_modal_trial_ending")}
            </p>
          ) : null}

          <p>
            {modalBody}
          </p>

          {isStarter ? (
            <div className="rounded-2xl border border-brand-neon/25 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">{t("upgrade_modal_recommended")}</p>
              <p className="mt-1 font-medium text-white">
                {t("upgrade_modal_starter")}
              </p>
            </div>
          ) : null}

          <p className="text-brand-muted">
            {t("upgrade_modal_urgency")}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={MANAGE_BILLING_HREF}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-neon px-5 text-sm font-semibold text-brand-bg shadow-glow transition hover:-translate-y-0.5"
          >
            {t("upgrade_modal_cta")}
          </Link>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t("upgrade_modal_secondary")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  initialUsage,
  initialRecentQuotes,
}: {
  initialUsage: QuoteUsageSummary;
  initialRecentQuotes: SavedQuoteSummary[];
}) {
  const { language, t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildInitialMessage(t("chat_welcome")),
  ]);
  const [result, setResult] = useState<MockQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [recentQuotes, setRecentQuotes] = useState(initialRecentQuotes);
  const [apiLimitError, setApiLimitError] = useState<QuoteApiErrorPayload | null>(null);
  const [quoteLimitModalError, setQuoteLimitModalError] = useState<QuoteApiErrorPayload | null>(null);
  const [exporting, setExporting] = useState(false);
  const samplePrompts = [
    t("chat_sample_prompt_office"),
    t("chat_sample_prompt_moveout"),
    t("chat_sample_prompt_deep"),
  ];

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0]?.id === "welcome"
        ? [buildInitialMessage(t("chat_welcome"))]
        : current,
    );
  }, [t]);

  async function submitPrompt(value: string) {
    const parsedPrompt = validateChatPromptInput(value);
    if (!parsedPrompt.success) {
      setErrorMessage(parsedPrompt.message);
      return;
    }

    const safePrompt = parsedPrompt.data;

    setLoading(true);
    setCopied(false);
    setErrorMessage(null);
    setApiLimitError(null);
    setQuoteLimitModalError(null);
    setPrompt("");
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: safePrompt,
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: safePrompt, language }),
        cache: "no-store",
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => null)) as
        | MockQuoteResponse
        | QuoteApiErrorPayload
        | null;

      if (!response.ok) {
        const parsedApiError = isQuoteApiErrorPayload(payload) ? payload : null;
        if (parsedApiError) {
          setApiLimitError(parsedApiError);
          setUsage((current) => applyUsageError(current, parsedApiError));

          if (shouldShowQuoteLimitModal(response.status, parsedApiError)) {
            setQuoteLimitModalError(parsedApiError);
            setResult(null);
            setMessages((current) => [
              ...current,
              {
                id: `assistant-limit-${Date.now()}`,
                role: "assistant",
                content: t("upgrade_modal_title"),
              },
            ]);
            return;
          }
        }

        throw new Error(getApiErrorMessage(payload, t));
      }

      if (!isMockQuoteResponse(payload)) {
        throw new Error(t("results_invalid_response"));
      }

      const nextUsage = getUsageFromHeaders(response.headers, usage);
      setResult(payload);
      setUsage(nextUsage);
      setRecentQuotes((current) => [buildSavedQuoteSummary(payload, nextUsage), ...current].slice(0, 5));
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: t("results_mock_ready").replace(
            "{amount}",
            String(payload.recommendedEstimate.recommended),
          ),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("results_endpoint_failed");
      setResult(null);
      setErrorMessage(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/quotes/export", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = response.ok
        ? null
        : ((await response.json().catch(() => null)) as QuoteApiErrorPayload | null);

      if (!response.ok) {
        const parsedApiError = isQuoteApiErrorPayload(payload) ? payload : null;
        if (parsedApiError) {
          setApiLimitError(parsedApiError);
        }

        throw new Error(getApiErrorMessage(payload, t));
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename=\"?([^"]+)\"?/i);
      link.href = objectUrl;
      link.download = filenameMatch?.[1] ?? "rapidcleanai-quotes.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("results_export_failed"),
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleCopy() {
    if (!result || typeof navigator === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(buildCopyPayload(result, t));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handleNewQuote() {
    setPrompt("");
    setResult(null);
    setCopied(false);
    setErrorMessage(null);
    setQuoteLimitModalError(null);
  }

  function handleClear() {
    setPrompt("");
    setResult(null);
    setCopied(false);
    setErrorMessage(null);
    setQuoteLimitModalError(null);
    setMessages([buildInitialMessage(t("chat_welcome"))]);
  }

  function handleLimitReached() {
    const limitError = buildLocalQuoteLimitError(usage, t);
    setApiLimitError(limitError);
    setQuoteLimitModalError(limitError);
    setErrorMessage(null);
    setResult(null);
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChatPanel
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={submitPrompt}
          onLimitReached={handleLimitReached}
          messages={messages}
          samplePrompts={samplePrompts}
          loading={loading}
          usage={usage}
        />
        <ResultsPanel
          result={result}
          loading={loading}
          copied={copied}
          errorMessage={errorMessage}
          usage={usage}
          recentQuotes={recentQuotes}
          apiLimitError={apiLimitError}
          exporting={exporting}
          onNewQuote={handleNewQuote}
          onCopy={handleCopy}
          onClear={handleClear}
          onExport={handleExport}
        />
      </div>

      {quoteLimitModalError ? (
        <QuoteLimitModal
          payload={quoteLimitModalError}
          usage={usage}
          onClose={() => setQuoteLimitModalError(null)}
        />
      ) : null}
    </>
  );
}
