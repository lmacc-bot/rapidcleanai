"use client";

import type { FormEvent } from "react";
import { MessageSquareText, SendHorizontal, Sparkles } from "lucide-react";
import { useT } from "@/components/language-provider";
import type { QuoteUsageSummary } from "@/lib/quote-limits";
import { formatBillingAiSpeed, getBillingPlanLabel } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_CHAT_PROMPT_CHARS } from "@/lib/validation";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (value: string) => Promise<void> | void;
  onLimitReached: () => void;
  messages: ChatMessage[];
  samplePrompts: string[];
  loading: boolean;
  usage: QuoteUsageSummary;
};

function formatResetTime(isoString: string | null) {
  if (!isoString) {
    return null;
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatPanel({
  prompt,
  onPromptChange,
  onSubmit,
  onLimitReached,
  messages,
  samplePrompts,
  loading,
  usage,
}: ChatPanelProps) {
  const t = useT();
  const limitReached = usage.quoteLimit !== null && usage.quotesRemaining !== null && usage.quotesRemaining <= 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (limitReached) {
      onLimitReached();
      return;
    }

    void onSubmit(prompt);
  }

  const resetTime = formatResetTime(usage.resetsAt);
  const usageLabel =
    usage.quoteLimit === null
      ? `${getBillingPlanLabel(usage.effectivePlan)} access includes unlimited quote sessions.`
      : `${usage.quotesRemaining ?? 0} of ${usage.quoteLimit} quotes remaining in this 24-hour window.`;

  return (
    <Card className="surface-gradient premium-border h-full">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>{t("chat_panel")}</Badge>
            <CardTitle className="mt-3 text-2xl">{t("chat_title")}</CardTitle>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brand-cyan">
            <Sparkles className="size-3.5" />
            {t("chat_mvp_assistant")}
          </div>
        </div>
        <CardDescription className="text-base leading-7">
          {t("chat_description")}
        </CardDescription>
        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] px-4 py-3 text-sm text-brand-text">
          <p className="font-medium text-white">
            {usage.isTrialing
              ? "Elite trial active: unlimited quotes, full history, and fastest mock responses."
              : usageLabel}
          </p>
          <p className="mt-1 text-brand-muted">
            {usage.isTrialing
              ? "Your trial keeps the dashboard at Elite-level access until Stripe switches you to your selected plan."
              : `AI speed: ${formatBillingAiSpeed(usage.aiSpeed)}. Reset ${
                  resetTime ? `at ${resetTime}` : "automatically every 24 hours"
                }.`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.6)] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted">
            <MessageSquareText className="size-4" />
            {t("chat_recent_prompts")}
          </div>
          <div className="max-h-[280px] space-y-3 overflow-auto pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-7",
                  message.role === "assistant"
                    ? "border-brand-cyan/20 bg-brand-cyan/10 text-brand-text"
                    : "border-brand-neon/20 bg-brand-neon/10 text-brand-text",
                )}
              >
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                  {message.role === "assistant" ? "RapidCleanAI" : "You"}
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">{t("chat_sample_prompts")}</p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onPromptChange(sample)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-brand-muted transition hover:border-brand-neon/30 hover:text-white"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder={t("chat_placeholder")}
            className="min-h-[150px]"
            maxLength={MAX_CHAT_PROMPT_CHARS}
          />
          {limitReached ? (
            <p className="text-sm text-amber-300">
              {t("chat_limit_inline")}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={loading || !prompt.trim()}
          >
            {loading ? t("chat_generating") : t("chat_send")}
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
