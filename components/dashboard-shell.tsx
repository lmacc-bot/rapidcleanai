"use client";

import { useState } from "react";
import { isMockQuoteResponse, type MockQuoteResponse } from "@/lib/mock-quote";
import {
  isQuoteApiErrorPayload,
  type QuoteApiErrorPayload,
  type QuoteUsageSummary,
  type SavedQuoteSummary,
} from "@/lib/quote-limits";
import { isBillingPlanId } from "@/lib/stripe";
import { validateChatPromptInput } from "@/lib/validation";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { ResultsPanel } from "@/components/results-panel";

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
  }

  function handleClear() {
    setPrompt("");
    setResult(null);
    setCopied(false);
    setErrorMessage(null);
    setMessages([initialMessage]);
  }

  return (
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
  );
}
