import "server-only";

import type {
  MockQuoteResponse,
  QuoteBreakdownLineItem,
  QuoteOptionalAddOn,
} from "@/lib/mock-quote";
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

function midpointRange(low: number, high: number) {
  return Math.round((low + high) / 2);
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

function mapOptionalAddOn(addOn: QuoteOptionalAddOn): ProposalLineItem {
  return {
    label: addOn.label,
    price: addOn.recommended,
    description: [addOn.description, addOn.note].filter(Boolean).join(" "),
  };
}

function buildFallbackUpsell(
  suggestion: string,
  quote: MockQuoteResponse,
  language: Language,
): ProposalLineItem {
  const normalized = suggestion.toLowerCase();
  const standardBase =
    quote.standardCleanEstimate?.recommended ?? quote.recommendedEstimate.recommended;

  if (normalized.includes("recurring") || normalized.includes("recurrente") || normalized.includes("mantenimiento")) {
    const low = Math.max(Math.round(standardBase * 0.55), 120);
    const high = Math.max(Math.round(standardBase * 0.7), low + 10);

    return {
      label: language === "es" ? "Mantenimiento semanal" : "Weekly maintenance",
      price: midpointRange(low, high),
      description:
        language === "es"
          ? `Mantenimiento recurrente desde ${money.format(low)} por visita despues de la limpieza inicial.`
          : `Recurring maintenance starting at ${money.format(low)} per visit after initial clean.`,
    };
  }

  if (normalized.includes("fridge") || normalized.includes("refrigerador") || normalized.includes("nevera")) {
    return {
      label: language === "es" ? "Extra de refrigerador" : "Inside fridge add-on",
      price: 40,
      description:
        language === "es"
          ? "Rango sugerido: $30-$45."
          : "Suggested range: $30-$45.",
    };
  }

  if (normalized.includes("oven") || normalized.includes("horno")) {
    return {
      label: language === "es" ? "Extra de horno" : "Inside oven add-on",
      price: 45,
      description:
        language === "es"
          ? "Rango sugerido: $35-$55."
          : "Suggested range: $35-$55.",
    };
  }

  if (normalized.includes("pet") || normalized.includes("mascota")) {
    const low = Math.max(Math.round(standardBase * 0.1), 35);
    const high = Math.max(Math.round(standardBase * 0.15), low + 10);

    return {
      label: language === "es" ? "Cargo por pelo de mascota" : "Pet hair fee",
      price: midpointRange(low, high),
      description:
        language === "es"
          ? `Rango sugerido: ${money.format(low)}-${money.format(high)}.`
          : `Suggested range: ${money.format(low)}-${money.format(high)}.`,
    };
  }

  const fallback = Math.max(Math.round(quote.recommendedEstimate.recommended * 0.12), 50);

  return {
    label: suggestion,
    price: fallback,
    description:
      language === "es"
        ? "Opcional; confirmar alcance y precio antes de agregar al total."
        : "Optional; confirm before adding to the total.",
  };
}

function buildUpsells(quote: MockQuoteResponse, language: Language) {
  if (quote.optionalAddOns?.length) {
    return quote.optionalAddOns.map(mapOptionalAddOn);
  }

  return quote.upsellSuggestions
    .slice(0, 4)
    .map((suggestion) => buildFallbackUpsell(suggestion, quote, language));
}

function formatLineItems(lineItems: ProposalLineItem[]) {
  return lineItems.map((item) => `- ${item.label}: ${money.format(item.price)}`).join("\n");
}

function formatUpsells(upsells: ProposalLineItem[], language: Language) {
  if (!upsells.length) {
    return language === "es" ? "- Ninguno por ahora" : "- None right now";
  }

  return upsells
    .map((item) => {
      const description = item.description ? ` - ${item.description}` : "";
      return `- ${item.label}: ${money.format(item.price)}${description}`;
    })
    .join("\n");
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
