"use client";

import type { FormEvent } from "react";
import { ListChecks, MessageSquareText, SendHorizontal, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { ClientSummary } from "@/lib/client-types";
import type { QuoteUsageSummary } from "@/lib/quote-limits";
import { getBillingPlanLabel, type BillingAiSpeed } from "@/lib/stripe";
import type { Language, TranslationKey } from "@/lib/translations";
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
  clients: ClientSummary[];
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  loading: boolean;
  usage: QuoteUsageSummary;
};

const aiSpeedTranslationKeys = {
  slower: "ai_speed_slower",
  fast: "ai_speed_fast",
  fastest: "ai_speed_fastest",
} satisfies Record<BillingAiSpeed, TranslationKey>;

function formatResetTime(isoString: string | null, language: Language) {
  if (!isoString) {
    return null;
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getClientOptionLabel(client: ClientSummary, fallback: string) {
  const primary = client.name || client.address || client.email || client.phone || fallback;
  const secondary =
    client.name && client.address
      ? client.address
      : client.name
        ? client.email || client.phone
        : null;

  return secondary && secondary !== primary ? `${primary} - ${secondary}` : primary;
}

export function ChatPanel({
  prompt,
  onPromptChange,
  onSubmit,
  onLimitReached,
  messages,
  clients,
  selectedClientId,
  onClientSelect,
  loading,
  usage,
}: ChatPanelProps) {
  const { language, t } = useLanguage();
  const limitReached = usage.quoteLimit !== null && usage.quotesRemaining !== null && usage.quotesRemaining <= 0;
  const examplePrompts = [
    t("chat_sample_prompt_deep"),
    t("chat_sample_prompt_moveout"),
    t("chat_sample_prompt_standard"),
  ];

  function handleExamplePromptClick(examplePrompt: string) {
    onPromptChange(examplePrompt);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (limitReached) {
      onLimitReached();
      return;
    }

    void onSubmit(prompt);
  }

  const resetTime = formatResetTime(usage.resetsAt, language);
  const usageLabel =
    usage.quoteLimit === null
      ? t("chat_unlimited_sessions").replace("{plan}", getBillingPlanLabel(usage.effectivePlan))
      : t("chat_quotes_remaining")
          .replace("{remaining}", String(usage.quotesRemaining ?? 0))
          .replace("{limit}", String(usage.quoteLimit));
  const resetLabel = resetTime
    ? t("chat_reset_at").replace("{time}", resetTime)
    : t("chat_reset_auto");
  const aiSpeedLabel = t("chat_ai_speed_reset")
    .replace("{speed}", t(aiSpeedTranslationKeys[usage.aiSpeed]))
    .replace("{reset}", resetLabel);

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
            {t("chat_quote_assistant")}
          </div>
        </div>
        <CardDescription className="text-base leading-7">
          {t("chat_description")}
        </CardDescription>
        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] px-4 py-3 text-sm text-brand-text">
          <p className="font-medium text-white">
            {usage.isTrialing
              ? t("chat_elite_trial_active")
              : usageLabel}
          </p>
          <p className="mt-1 text-brand-muted">
            {usage.isTrialing
              ? t("chat_trial_keeps_elite")
              : aiSpeedLabel}
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
                  {message.role === "assistant" ? "RapidCleanAI" : t("chat_you")}
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="quote-client-select"
              className="block text-xs uppercase tracking-[0.18em] text-brand-muted"
            >
              {t("chat_select_client")}
            </label>
            <select
              id="quote-client-select"
              value={selectedClientId}
              onChange={(event) => onClientSelect(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-[rgba(11,15,20,0.82)] px-4 text-sm text-brand-text outline-none transition focus:border-brand-neon/50 focus:ring-2 focus:ring-brand-neon/15"
            >
              <option value="">{t("chat_new_client")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {getClientOptionLabel(client, t("dashboard_clients"))}
                </option>
              ))}
            </select>
            {clients.length ? (
              <p className="text-xs leading-6 text-brand-muted">
                {t("chat_client_autofill_hint")}
              </p>
            ) : null}
          </div>
          <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-neon">
              <ListChecks className="size-4" />
              {t("chat_instruction_title")}
            </div>
            <p className="text-sm leading-7 text-brand-text">{t("chat_instruction_intro")}</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-brand-muted sm:grid-cols-2">
              <li>- {t("chat_instruction_property")}</li>
              <li>- {t("chat_instruction_scope")}</li>
              <li>- {t("chat_instruction_condition")}</li>
              <li>- {t("chat_instruction_timing")}</li>
            </ul>
          </div>
          <div className="space-y-3 rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-4 shadow-[0_14px_42px_rgba(39,210,255,0.08)]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{t("chat_sample_prompts")}</p>
              <p className="mt-1 text-sm leading-6 text-brand-muted">{t("chat_sample_prompts_hint")}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {examplePrompts.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handleExamplePromptClick(sample)}
                  className="max-w-full cursor-pointer rounded-full border border-brand-cyan/30 bg-white/8 px-4 py-2 text-left text-sm font-medium leading-6 text-brand-text shadow-[0_10px_28px_rgba(34,255,136,0.08)] transition hover:-translate-y-0.5 hover:border-brand-neon/60 hover:bg-brand-neon/10 hover:text-white hover:shadow-[0_16px_40px_rgba(34,255,136,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-neon/50 sm:w-auto"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
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
