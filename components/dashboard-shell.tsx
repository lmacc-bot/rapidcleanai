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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isClientCreateResponse,
  type ClientCreateInput,
  type ClientSummary,
} from "@/lib/client-types";
import {
  isFollowUpCompleteResponse,
  isFollowUpCreateResponse,
  type FollowUpSummary,
} from "@/lib/follow-up-types";
import { isProposalPayload, type ProposalPayload } from "@/lib/proposal-types";
import type { Language, TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

function buildInitialMessage(content: string): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content,
  };
}

type Translator = (key: TranslationKey) => string;

type ClientFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type FollowUpOption = "tomorrow" | "three_days" | "seven_days" | "custom";

type FollowUpCreateInput = {
  proposalId: string;
  clientId: string | null;
  dueAt: string;
  note: string;
};

type ProposalEmailInput = {
  proposalId: string;
  recipientEmail: string;
  recipientName: string;
  customMessage: string;
};

const emptyClientForm: ClientFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const CLIENT_SELECTOR_LIMIT = 25;
const CLIENT_PANEL_LIMIT = 5;

const followUpOptions: Array<{
  value: FollowUpOption;
  labelKey: TranslationKey;
  days: number | null;
}> = [
  {
    value: "tomorrow",
    labelKey: "follow_up_tomorrow",
    days: 1,
  },
  {
    value: "three_days",
    labelKey: "follow_up_three_days",
    days: 3,
  },
  {
    value: "seven_days",
    labelKey: "follow_up_seven_days",
    days: 7,
  },
  {
    value: "custom",
    labelKey: "follow_up_custom_date",
    days: null,
  },
];

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

function buildProposalHtml(proposal: ProposalPayload, t: Translator) {
  const escapeHtml = (value: string | number | null) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const lineItems = proposal.line_items
    .map((item) => {
      const description = item.description ? ` ${escapeHtml(item.description)}` : "";
      return `<li><strong>${escapeHtml(item.label)}</strong>: $${escapeHtml(item.price)}${description}</li>`;
    })
    .join("");
  const upsells = proposal.upsells
    .map((item) => {
      const description = item.description ? ` ${escapeHtml(item.description)}` : "";
      return `<li><strong>${escapeHtml(item.label)}</strong>: $${escapeHtml(item.price)}${description}</li>`;
    })
    .join("");
  const terms = proposal.terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(proposal.subject)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.55; padding: 32px; }
    h1 { font-size: 26px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 24px; }
    .message { white-space: pre-wrap; border: 1px solid #d1d5db; border-radius: 14px; padding: 18px; }
    .total { font-size: 20px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(proposal.subject)}</h1>
  <p class="total">${escapeHtml(t("proposal_total_price"))}: $${escapeHtml(proposal.total_price)}</p>
  <p>${escapeHtml(t("proposal_estimated_hours"))}: ${
    proposal.estimated_hours === null
      ? escapeHtml(t("proposal_hours_unknown"))
      : `${escapeHtml(proposal.estimated_hours)} ${escapeHtml(t("proposal_hours_suffix"))}`
  }</p>
  <h2>${escapeHtml(t("proposal_line_items"))}</h2>
  <ul>${lineItems}</ul>
  <h2>${escapeHtml(t("proposal_optional_addons"))}</h2>
  <ul>${upsells || `<li>${escapeHtml(t("proposal_none"))}</li>`}</ul>
  <h2>${escapeHtml(t("proposal_terms"))}</h2>
  <ul>${terms}</ul>
  <h2>Message</h2>
  <div class="message">${escapeHtml(proposal.message_text)}</div>
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`;
}

function normalizeSharePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const startsWithPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  return startsWithPlus ? digitsOnly : digitsOnly;
}

function buildWhatsAppShareHref(message: string, phone: string) {
  const encodedMessage = encodeURIComponent(message);
  const normalizedPhone = normalizeSharePhone(phone);

  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
}

function buildSmsShareHref(message: string, phone: string) {
  const encodedMessage = encodeURIComponent(message);
  const normalizedPhone = normalizeSharePhone(phone);

  return normalizedPhone
    ? `sms:${normalizedPhone}?body=${encodedMessage}`
    : `sms:?body=${encodedMessage}`;
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

function getApiErrorMessage(payload: unknown, t: Translator) {
  if (isQuoteApiErrorPayload(payload)) {
    return payload.error;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
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
    id: result.savedQuoteId ?? Date.now(),
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

function buildClientQuotePrompt(client: ClientSummary, language: Language) {
  const fallbackClient =
    client.name ||
    client.email ||
    client.phone ||
    (language === "es" ? "cliente guardado" : "saved client");
  const lines = [
    client.address
      ? language === "es"
        ? `Cotizacion para ${client.address}`
        : `Quote for ${client.address}`
      : language === "es"
        ? `Cotizacion para ${fallbackClient}`
        : `Quote for ${fallbackClient}`,
  ];

  if (client.name) {
    lines.push(language === "es" ? `Cliente: ${client.name}` : `Client: ${client.name}`);
  }

  if (client.notes) {
    lines.push(language === "es" ? `Notas: ${client.notes}` : `Notes: ${client.notes}`);
  }

  return lines.join("\n");
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getTomorrowDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getCustomDateIso(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day, 9, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getFollowUpDueAt(option: FollowUpOption, customDate: string) {
  const optionConfig = followUpOptions.find((item) => item.value === option);

  if (!optionConfig) {
    return null;
  }

  return optionConfig.days === null
    ? getCustomDateIso(customDate)
    : addDaysIso(optionConfig.days);
}

function formatFollowUpDueDate(isoString: string, language: Language) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleDateString(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const { language, t } = useLanguage();
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
            onClick={() =>
              trackClientEvent("upgrade_clicked", {
                source: "quote_limit_modal",
                plan: usage.selectedPlan,
                effective_plan: usage.effectivePlan,
                language,
              })
            }
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

function ProposalPreviewModal({
  proposal,
  copied,
  emailNotice,
  onClose,
  onCopy,
  onDownloadPdf,
  onSendEmail,
  onSaveClient,
  onCreateFollowUp,
}: {
  proposal: ProposalPayload;
  copied: boolean;
  emailNotice: string | null;
  onClose: () => void;
  onCopy: () => void;
  onDownloadPdf: () => void;
  onSendEmail: (input: ProposalEmailInput) => Promise<boolean>;
  onSaveClient: (input: ClientCreateInput) => Promise<ClientSummary | null>;
  onCreateFollowUp: (input: FollowUpCreateInput) => Promise<boolean>;
}) {
  const { language, t } = useLanguage();
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientSaveMessage, setClientSaveMessage] = useState<string | null>(null);
  const [followUpOption, setFollowUpOption] = useState<FollowUpOption>("three_days");
  const [customFollowUpDate, setCustomFollowUpDate] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const [emailRecipientName, setEmailRecipientName] = useState("");
  const [emailRecipientEmail, setEmailRecipientEmail] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailValidationMessage, setEmailValidationMessage] = useState<string | null>(null);
  const whatsappHref = buildWhatsAppShareHref(proposal.message_text, clientForm.phone);
  const smsHref = buildSmsShareHref(proposal.message_text, clientForm.phone);
  const proposalDatabaseId = proposal.database_proposal_id ?? "";
  const proposalTrackingId = proposal.database_proposal_id ?? proposal.proposal_id;

  function updateClientField(field: keyof ClientFormState, value: string) {
    setClientForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveClient() {
    setClientSaving(true);
    setClientSaveMessage(null);

    try {
      const savedClient = await onSaveClient({
        ...clientForm,
        proposalId: proposal.proposal_id,
      });
      setSavedClientId(savedClient?.id ?? null);
      setClientSaveMessage(savedClient ? t("client_saved") : t("client_save_failed"));
    } finally {
      setClientSaving(false);
    }
  }

  async function handleCreateFollowUp() {
    const dueAt = getFollowUpDueAt(followUpOption, customFollowUpDate);

    if (!proposalDatabaseId || !dueAt) {
      setFollowUpMessage(t("follow_up_failed"));
      return;
    }

    setFollowUpSaving(true);
    setFollowUpMessage(null);

    try {
      const saved = await onCreateFollowUp({
        proposalId: proposalDatabaseId,
        clientId: savedClientId,
        dueAt,
        note: proposal.subject,
      });
      setFollowUpMessage(saved ? t("follow_up_saved") : t("follow_up_failed"));
    } finally {
      setFollowUpSaving(false);
    }
  }

  async function handleSendEmail() {
    const proposalId = proposal.database_proposal_id ?? proposal.proposal_id;

    if (!emailRecipientEmail.trim()) {
      setEmailValidationMessage(t("proposal_email_required"));
      return;
    }

    setEmailValidationMessage(null);
    setEmailSending(true);

    try {
      await onSendEmail({
        proposalId,
        recipientEmail: emailRecipientEmail,
        recipientName: emailRecipientName,
        customMessage: emailCustomMessage,
      });
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-preview-title"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/12 bg-brand-surface p-6 shadow-[0_24px_90px_rgba(0,0,0,0.46)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">
              {t("proposal_modal_title")}
            </p>
            <h2 id="proposal-preview-title" className="mt-3 font-display text-3xl font-semibold text-white">
              {proposal.subject}
            </h2>
            <p className="mt-2 text-sm leading-7 text-brand-muted">
              {t("proposal_modal_description")}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("proposal_close")}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{t("proposal_total_price")}</p>
              <p className="font-display text-3xl text-brand-neon">${proposal.total_price}</p>
            </div>
            <p className="mt-2 text-sm text-brand-muted">
              {t("proposal_estimated_hours")}:{" "}
              {proposal.estimated_hours === null
                ? t("proposal_hours_unknown")
                : `${proposal.estimated_hours} ${t("proposal_hours_suffix")}`}
            </p>
            <pre className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-brand-text">
              {proposal.message_text}
            </pre>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-display text-xl text-white">{t("proposal_line_items")}</h3>
              <ul className="mt-4 space-y-3 text-sm text-brand-muted">
                {proposal.line_items.map((item) => (
                  <li key={`${item.label}-${item.price}`}>
                    <div className="flex justify-between gap-3">
                      <span>{item.label}</span>
                      <span className="text-white">${item.price}</span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-6 text-brand-muted">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-display text-xl text-white">{t("proposal_optional_addons")}</h3>
              <ul className="mt-4 space-y-3 text-sm text-brand-muted">
                {proposal.upsells.map((item) => (
                  <li key={`${item.label}-${item.price}`}>
                    <div className="flex justify-between gap-3">
                      <span>{item.label}</span>
                      <span className="text-white">${item.price}</span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-6 text-brand-muted">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-display text-xl text-white">{t("proposal_terms")}</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                {proposal.terms.map((term) => (
                  <li key={term}>- {term}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">
                {t("proposal_email_title")}
              </p>
              <p className="mt-2 text-sm leading-7 text-brand-text">
                {t("proposal_email_description")}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={emailSending}
            >
              {emailSending ? t("proposal_email_sending") : t("proposal_send_email")}
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              value={emailRecipientName}
              onChange={(event) => setEmailRecipientName(event.target.value)}
              placeholder={t("proposal_email_name_placeholder")}
              aria-label={t("proposal_email_recipient_name")}
            />
            <Input
              type="email"
              value={emailRecipientEmail}
              onChange={(event) => setEmailRecipientEmail(event.target.value)}
              placeholder={t("proposal_email_placeholder")}
              aria-label={t("proposal_email_recipient_email")}
            />
            <Textarea
              value={emailCustomMessage}
              onChange={(event) => setEmailCustomMessage(event.target.value)}
              placeholder={t("proposal_email_custom_placeholder")}
              aria-label={t("proposal_email_custom_message")}
              className="sm:col-span-2"
            />
          </div>
          {emailValidationMessage || emailNotice ? (
            <p className="mt-3 text-sm text-brand-text">
              {emailValidationMessage ?? emailNotice}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">
            {t("client_details_title")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              value={clientForm.name}
              onChange={(event) => updateClientField("name", event.target.value)}
              placeholder={t("client_name_placeholder")}
              aria-label={t("client_name")}
            />
            <Input
              type="tel"
              inputMode="tel"
              value={clientForm.phone}
              onChange={(event) => updateClientField("phone", event.target.value)}
              placeholder={t("client_phone_placeholder")}
              aria-label={t("client_phone")}
            />
            <Input
              type="email"
              value={clientForm.email}
              onChange={(event) => updateClientField("email", event.target.value)}
              placeholder={t("client_email_placeholder")}
              aria-label={t("client_email")}
            />
            <Input
              value={clientForm.address}
              onChange={(event) => updateClientField("address", event.target.value)}
              placeholder={t("client_address_placeholder")}
              aria-label={t("client_address")}
            />
            <Textarea
              value={clientForm.notes}
              onChange={(event) => updateClientField("notes", event.target.value)}
              placeholder={t("client_notes_placeholder")}
              aria-label={t("client_notes")}
              className="sm:col-span-2"
            />
          </div>
          {clientSaveMessage ? (
            <p className="mt-3 text-sm text-brand-muted">{clientSaveMessage}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="secondary" onClick={handleSaveClient} disabled={clientSaving}>
              {clientSaving ? t("client_saving") : t("client_save")}
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackClientEvent("proposal_sent_whatsapp", {
                  proposal_id: proposalTrackingId,
                  language,
                  quote_value: proposal.total_price,
                })
              }
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-neon px-5 text-sm font-semibold text-brand-bg shadow-glow transition hover:-translate-y-0.5"
            >
              {t("proposal_send_whatsapp")}
            </a>
            <a
              href={smsHref}
              onClick={() =>
                trackClientEvent("proposal_sent_sms", {
                  proposal_id: proposalTrackingId,
                  language,
                  quote_value: proposal.total_price,
                })
              }
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-5 text-sm font-semibold text-brand-text transition hover:border-brand-cyan/40 hover:bg-white/10"
            >
              {t("proposal_send_sms")}
            </a>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
                {t("dashboard_follow_ups")}
              </p>
              <h3 className="mt-2 font-display text-xl text-white">
                {t("follow_up_remind")}
              </h3>
            </div>
            <Button
              type="button"
              onClick={handleCreateFollowUp}
              disabled={followUpSaving || !proposalDatabaseId}
            >
              {followUpSaving ? t("follow_up_saving") : t("follow_up_set")}
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {followUpOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFollowUpOption(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                  followUpOption === option.value
                    ? "border-brand-neon/50 bg-brand-neon/15 text-white"
                    : "border-white/10 bg-white/5 text-brand-muted hover:border-brand-cyan/30 hover:text-white",
                )}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          {followUpOption === "custom" ? (
            <div className="mt-3 max-w-xs">
              <Input
                type="date"
                min={getTomorrowDateValue()}
                value={customFollowUpDate}
                onChange={(event) => setCustomFollowUpDate(event.target.value)}
                aria-label={t("follow_up_custom_date")}
              />
            </div>
          ) : null}
          {followUpMessage ? (
            <p className="mt-3 text-sm text-brand-text">{followUpMessage}</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onCopy}>
            {copied ? t("proposal_copied") : t("proposal_copy_text")}
          </Button>
          <Button type="button" variant="secondary" onClick={onDownloadPdf}>
            {t("proposal_download_pdf")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClientsPanel({ clients }: { clients: ClientSummary[] }) {
  const t = useT();
  const visibleClients = clients.slice(0, CLIENT_PANEL_LIMIT);

  return (
    <section className="surface-gradient premium-border rounded-3xl p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
            {t("dashboard_clients")}
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">{t("dashboard_clients")}</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-brand-muted">
          {t("dashboard_clients_description")}
        </p>
      </div>

      {visibleClients.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {visibleClients.map((client) => {
            const displayName = client.name || client.address || client.email || client.phone || t("dashboard_clients");
            const contact = client.phone || client.email || t("client_contact_missing");

            return (
              <div key={client.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">{displayName}</p>
                <p className="mt-2 text-sm text-brand-muted">{contact}</p>
                {client.address ? (
                  <p className="mt-2 text-xs leading-6 text-brand-muted">{client.address}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted">
          {t("dashboard_clients_empty")}
        </p>
      )}
    </section>
  );
}

function FollowUpsPanel({
  followUps,
  completingFollowUpId,
  onComplete,
}: {
  followUps: FollowUpSummary[];
  completingFollowUpId: string | null;
  onComplete: (followUpId: string) => Promise<void>;
}) {
  const { language, t } = useLanguage();

  return (
    <section className="surface-gradient premium-border rounded-3xl p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">
            {t("dashboard_follow_ups")}
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">{t("dashboard_follow_ups")}</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-brand-muted">
          {t("dashboard_follow_ups_description")}
        </p>
      </div>

      {followUps.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {followUps.map((followUp) => {
            const clientName = followUp.clientName || t("follow_up_no_client");

            return (
              <div
                key={followUp.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{clientName}</p>
                    {followUp.clientContact ? (
                      <p className="mt-1 text-sm text-brand-muted">{followUp.clientContact}</p>
                    ) : null}
                    <p className="mt-3 text-sm text-brand-text">
                      {t("follow_up_due")}: {formatFollowUpDueDate(followUp.dueAt, language)}
                    </p>
                    {typeof followUp.proposalTotal === "number" ? (
                      <p className="mt-1 text-sm text-brand-muted">
                        {t("follow_up_total")}: ${followUp.proposalTotal}
                      </p>
                    ) : null}
                    {followUp.note ? (
                      <p className="mt-2 text-xs leading-6 text-brand-muted">{followUp.note}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onComplete(followUp.id)}
                    disabled={completingFollowUpId === followUp.id}
                  >
                    {completingFollowUpId === followUp.id
                      ? t("follow_up_marking_done")
                      : t("follow_up_mark_done")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted">
          {t("dashboard_follow_ups_empty")}
        </p>
      )}
    </section>
  );
}

export function DashboardShell({
  initialUsage,
  initialRecentQuotes,
  initialClients,
  initialFollowUps,
}: {
  initialUsage: QuoteUsageSummary;
  initialRecentQuotes: SavedQuoteSummary[];
  initialClients: ClientSummary[];
  initialFollowUps: FollowUpSummary[];
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
  const [proposal, setProposal] = useState<ProposalPayload | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalCopied, setProposalCopied] = useState(false);
  const [proposalEmailNotice, setProposalEmailNotice] = useState<string | null>(null);
  const [clients, setClients] = useState(initialClients);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null);
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

  async function handleCreateProposal(savedQuoteId: number | null | undefined) {
    if (!savedQuoteId) {
      setErrorMessage(t("proposal_saved_quote_required"));
      return;
    }

    setProposalLoading(true);
    setErrorMessage(null);
    setProposalCopied(false);
    setProposalEmailNotice(null);

    try {
      const response = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saved_quote_id: savedQuoteId,
          language,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, t));
      }

      if (!isProposalPayload(payload)) {
        throw new Error(t("proposal_generation_failed"));
      }

      setProposal(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("proposal_generation_failed"),
      );
    } finally {
      setProposalLoading(false);
    }
  }

  async function handleSaveClient(input: ClientCreateInput) {
    try {
      const response = await fetch("/api/clients/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          notes: input.notes,
          proposal_id: input.proposalId,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isClientCreateResponse(payload)) {
        return null;
      }

      setClients((current) =>
        [payload.client, ...current.filter((client) => client.id !== payload.client.id)].slice(0, CLIENT_SELECTOR_LIMIT),
      );
      return payload.client;
    } catch {
      return null;
    }
  }

  async function handleCreateFollowUp(input: FollowUpCreateInput) {
    try {
      const response = await fetch("/api/follow-ups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal_id: input.proposalId,
          client_id: input.clientId,
          due_at: input.dueAt,
          note: input.note,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isFollowUpCreateResponse(payload)) {
        return false;
      }

      setFollowUps((current) =>
        [payload.followUp, ...current.filter((followUp) => followUp.id !== payload.followUp.id)]
          .sort((first, second) => new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime())
          .slice(0, 8),
      );
      return true;
    } catch {
      return false;
    }
  }

  async function handleCompleteFollowUp(followUpId: string) {
    setCompletingFollowUpId(followUpId);

    try {
      const response = await fetch("/api/follow-ups/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          follow_up_id: followUpId,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (response.ok && isFollowUpCompleteResponse(payload)) {
        setFollowUps((current) => current.filter((followUp) => followUp.id !== payload.id));
      }
    } finally {
      setCompletingFollowUpId(null);
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

  async function handleCopyProposal() {
    if (!proposal || typeof navigator === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(proposal.message_text);
      setProposalCopied(true);
    } catch {
      setProposalCopied(false);
    }
  }

  function handleDownloadProposalPdf() {
    if (!proposal || typeof window === "undefined") {
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      return;
    }

    popup.document.write(buildProposalHtml(proposal, t));
    popup.document.close();
  }

  async function handleSendProposalEmail(input: ProposalEmailInput) {
    setProposalEmailNotice(null);

    try {
      console.log("[proposal email] sending email request");
      const response = await fetch("/api/proposals/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal_id: input.proposalId,
          recipient_email: input.recipientEmail,
          recipient_name: input.recipientName,
          custom_message: input.customMessage,
          language,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, t));
      }

      setProposalEmailNotice(t("proposal_email_sent"));
      return true;
    } catch (error) {
      setProposalEmailNotice(
        error instanceof Error ? error.message : t("proposal_email_failed"),
      );
      return false;
    }
  }

  function handleNewQuote() {
    setPrompt("");
    setSelectedClientId("");
    setResult(null);
    setCopied(false);
    setErrorMessage(null);
    setQuoteLimitModalError(null);
    setProposal(null);
  }

  function handleClear() {
    setPrompt("");
    setSelectedClientId("");
    setResult(null);
    setCopied(false);
    setErrorMessage(null);
    setQuoteLimitModalError(null);
    setProposal(null);
    setMessages([buildInitialMessage(t("chat_welcome"))]);
  }

  function handleLimitReached() {
    const limitError = buildLocalQuoteLimitError(usage, t);
    setApiLimitError(limitError);
    setQuoteLimitModalError(limitError);
    setErrorMessage(null);
    setResult(null);
  }

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId);

    if (!clientId) {
      setPrompt("");
      return;
    }

    const selectedClient = clients.find((client) => client.id === clientId);

    if (selectedClient) {
      setPrompt(buildClientQuotePrompt(selectedClient, language));
    }
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
          clients={clients}
          selectedClientId={selectedClientId}
          onClientSelect={handleClientSelect}
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
          onCreateProposal={handleCreateProposal}
          proposalLoading={proposalLoading}
        />
      </div>

      <FollowUpsPanel
        followUps={followUps}
        completingFollowUpId={completingFollowUpId}
        onComplete={handleCompleteFollowUp}
      />

      <ClientsPanel clients={clients} />

      {quoteLimitModalError ? (
        <QuoteLimitModal
          payload={quoteLimitModalError}
          usage={usage}
          onClose={() => setQuoteLimitModalError(null)}
        />
      ) : null}

      {proposal ? (
        <ProposalPreviewModal
          proposal={proposal}
          copied={proposalCopied}
          emailNotice={proposalEmailNotice}
          onClose={() => setProposal(null)}
          onCopy={handleCopyProposal}
          onDownloadPdf={handleDownloadProposalPdf}
          onSendEmail={handleSendProposalEmail}
          onSaveClient={handleSaveClient}
          onCreateFollowUp={handleCreateFollowUp}
        />
      ) : null}
    </>
  );
}
