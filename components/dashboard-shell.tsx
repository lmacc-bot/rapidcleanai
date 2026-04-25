"use client";

import { useState } from "react";
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
import { ResultsPanel } from "@/components/results-panel";
import { Button } from "@/components/ui/button";

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Share the job details and I will generate a structured mock quote response for this MVP.",
};

const samplePrompts = [
  "Weekly office clean for 4,000 sq ft, 3 restrooms, 2 break rooms, quote needed this week.",
  "Move-out clean for a 2 bed / 2 bath apartment with inside oven and fridge.",
  "Deep clean for 2,100 sq ft home with pet hair, interior windows, and rush scheduling.",
];

function buildCopyPayload(result: MockQuoteResponse) {
  return [
    `RapidCleanAI Quote`,
    `Request ID: ${result.requestId}`,
    `Recommended: $${result.recommendedEstimate.recommended}`,
    `Range: $${result.recommendedEstimate.low}-$${result.recommendedEstimate.high}`,
    ``,
    `Summary`,
    result.summary,
    ``,
    `Customer Message`,
    result.customerMessage,
  ].join("\n");
}

function getApiErrorMessage(payload: unknown) {
  if (isQuoteApiErrorPayload(payload)) {
    return payload.error;
  }

  return "Unable to generate a quote right now.";
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

function QuoteLimitModal({
  payload,
  usage,
  onClose,
}: {
  payload: QuoteApiErrorPayload;
  usage: QuoteUsageSummary;
  onClose: () => void;
}) {
  const { used, limit } = getLimitModalUsage(payload, usage);
  const isStarter = payload.plan === "starter" || usage.selectedPlan === "starter";
  const usageLabel = typeof limit === "number" ? `${used}/${limit}` : `${used}/unlimited`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-limit-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-brand-surface p-6 shadow-[0_24px_90px_rgba(0,0,0,0.46)]">
        <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Upgrade recommended</p>
          <h2 id="quote-limit-title" className="mt-3 font-display text-3xl font-semibold text-white">
            You&apos;ve reached your quote limit
          </h2>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-7 text-brand-text">
          {usage.isTrialing ? (
            <p className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 font-medium text-white">
              Your full-access trial is ending soon.
            </p>
          ) : null}

          <p>
            You&rsquo;ve generated {usageLabel} quotes in your 24-hour window. Upgrade now to keep
            generating quotes and close more jobs faster.
          </p>

          {isStarter ? (
            <div className="rounded-2xl border border-brand-neon/25 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Recommended</p>
              <p className="mt-1 font-medium text-white">
                Pro is recommended for Starter teams that need more quote capacity and fewer
                interruptions.
              </p>
            </div>
          ) : null}

          <p className="text-brand-muted">
            Most users upgrade to Pro to avoid interruptions during busy days.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={MANAGE_BILLING_HREF}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-neon px-5 text-sm font-semibold text-brand-bg shadow-glow transition hover:-translate-y-0.5"
          >
            Upgrade to Pro
          </Link>
          <Button variant="secondary" type="button" onClick={onClose}>
            Not now
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
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [result, setResult] = useState<MockQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [recentQuotes, setRecentQuotes] = useState(initialRecentQuotes);
  const [apiLimitError, setApiLimitError] = useState<QuoteApiErrorPayload | null>(null);
  const [quoteLimitModalError, setQuoteLimitModalError] = useState<QuoteApiErrorPayload | null>(null);
  const [exporting, setExporting] = useState(false);

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
        body: JSON.stringify({ prompt: safePrompt }),
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
                content: "You have reached your quote limit. Upgrade in Billing to keep generating quotes.",
              },
            ]);
            return;
          }
        }

        throw new Error(getApiErrorMessage(payload));
      }

      if (!isMockQuoteResponse(payload)) {
        throw new Error("The quote response was invalid. Please try again.");
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
          content: `Mock quote ready. Recommended estimate: $${payload.recommendedEstimate.recommended}.`,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The mock quote endpoint did not respond.";
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

        throw new Error(getApiErrorMessage(payload));
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
        error instanceof Error ? error.message : "Unable to export quotes right now.",
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
      await navigator.clipboard.writeText(buildCopyPayload(result));
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
    setMessages([initialMessage]);
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChatPanel
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={submitPrompt}
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
