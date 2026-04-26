import "server-only";

import type { MockQuoteResponse, QuoteBreakdownLineItem } from "@/lib/mock-quote";
import type { ProposalLineItem, ProposalPayload } from "@/lib/proposal-types";
import type { Language } from "@/lib/translations";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function createProposalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `prop_${crypto.randomUUID().slice(0, 10)}`;
  }

  return `prop_${Math.random().toString(36).slice(2, 12)}`;
}

function midpoint(lineItem: QuoteBreakdownLineItem) {
  return Math.round((lineItem.low + lineItem.high) / 2);
}

function buildLineItems(quote: MockQuoteResponse, language: Language) {
  if (quote.breakdownLineItems?.length) {
    return quote.breakdownLineItems.map((item) => ({
      label: item.label,
      price: midpoint(item),
      description: item.note,
    }));
  }

  return [
    {
      label: language === "es" ? "Servicio de limpieza" : "Cleaning service",
      price: quote.recommendedEstimate.recommended,
      description: quote.summary,
    },
  ];
}

function buildUpsells(quote: MockQuoteResponse, language: Language) {
  const fallbackPrice = 35;

  return quote.upsellSuggestions.slice(0, 4).map((suggestion, index) => ({
    label: suggestion,
    price: index === 0 ? fallbackPrice : fallbackPrice + index * 10,
    description:
      language === "es"
        ? "Opcional; confirmar antes de agregar al total."
        : "Optional; confirm before adding to the total.",
  }));
}

function formatLineItems(lineItems: ProposalLineItem[]) {
  return lineItems.map((item) => `- ${item.label}: ${money.format(item.price)}`).join("\n");
}

function formatUpsells(upsells: ProposalLineItem[], language: Language) {
  if (!upsells.length) {
    return language === "es" ? "- Ninguno por ahora" : "- None right now";
  }

  return upsells.map((item) => `- ${item.label}: ${money.format(item.price)}`).join("\n");
}

function buildTerms(language: Language) {
  return language === "es"
    ? [
        "Precio sujeto a confirmacion final del alcance y condicion del espacio.",
        "Extras no incluidos se cotizan antes de realizarse.",
        "Cambios de agenda pueden requerir ajuste de precio.",
      ]
    : [
        "Price is subject to final confirmation of scope and property condition.",
        "Add-ons not listed are quoted before work is performed.",
        "Schedule changes may require a price adjustment.",
      ];
}

function buildMessage(input: {
  quote: MockQuoteResponse;
  lineItems: ProposalLineItem[];
  upsells: ProposalLineItem[];
  estimatedHours: number | null;
  terms: string[];
  language: Language;
}) {
  const { quote, lineItems, upsells, estimatedHours, terms, language } = input;
  const duration =
    estimatedHours === null
      ? language === "es"
        ? "por confirmar"
        : "to be confirmed"
      : `${estimatedHours} ${language === "es" ? "horas aprox." : "estimated hours"}`;

  if (language === "es") {
    return [
      "Hola, gracias por la oportunidad de cotizar el servicio de limpieza.",
      "",
      `Alcance: ${quote.summary}`,
      "",
      "Incluye:",
      formatLineItems(lineItems),
      "",
      "No incluye: servicios fuera del alcance descrito, reparaciones, remocion de residuos grandes o extras no confirmados.",
      "",
      `Total recomendado: ${money.format(quote.recommendedEstimate.recommended)}`,
      `Duracion estimada: ${duration}`,
      "",
      "Extras opcionales:",
      formatUpsells(upsells, language),
      "",
      "Terminos:",
      terms.map((term) => `- ${term}`).join("\n"),
      "",
      "Si todo se ve bien, podemos confirmar fecha y detalles de acceso.",
    ].join("\n");
  }

  return [
    "Hi, thanks for the opportunity to quote your cleaning service.",
    "",
    `Scope: ${quote.summary}`,
    "",
    "Included:",
    formatLineItems(lineItems),
    "",
    "Not included: work outside the described scope, repairs, large debris removal, or unconfirmed add-ons.",
    "",
    `Recommended total: ${money.format(quote.recommendedEstimate.recommended)}`,
    `Estimated duration: ${duration}`,
    "",
    "Optional add-ons:",
    formatUpsells(upsells, language),
    "",
    "Terms:",
    terms.map((term) => `- ${term}`).join("\n"),
    "",
    "If everything looks good, we can confirm the date and access details.",
  ].join("\n");
}

export function createProposalFromQuote(input: {
  savedQuoteId: number;
  quote: MockQuoteResponse;
  language: Language;
}): ProposalPayload {
  const { savedQuoteId, quote, language } = input;
  const proposalId = createProposalId();
  const lineItems = buildLineItems(quote, language);
  const upsells = buildUpsells(quote, language);
  const estimatedHours = quote.estimatedLaborHours?.recommended ?? null;
  const terms = buildTerms(language);

  return {
    proposal_id: proposalId,
    subject:
      language === "es"
        ? `Propuesta de limpieza ${proposalId} para cotizacion #${savedQuoteId}`
        : `Cleaning Proposal ${proposalId} for quote #${savedQuoteId}`,
    message_text: buildMessage({
      quote,
      lineItems,
      upsells,
      estimatedHours,
      terms,
      language,
    }),
    line_items: lineItems,
    total_price: quote.recommendedEstimate.recommended,
    estimated_hours: estimatedHours,
    terms,
    upsells,
  };
}
