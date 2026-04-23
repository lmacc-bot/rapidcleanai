"use client";

import { useState } from "react";
import { isMockQuoteResponse, type MockQuoteResponse } from "@/lib/mock-quote";
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

export function DashboardShell() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [result, setResult] = useState<MockQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && typeof payload.error === "string"
            ? payload.error
            : "Unable to generate a quote right now.";
        throw new Error(message);
      }

      if (!isMockQuoteResponse(payload)) {
        throw new Error("The quote response was invalid. Please try again.");
      }

      setResult(payload);
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
      />
      <ResultsPanel
        result={result}
        loading={loading}
        copied={copied}
        errorMessage={errorMessage}
        onNewQuote={handleNewQuote}
        onCopy={handleCopy}
        onClear={handleClear}
      />
    </div>
  );
}
