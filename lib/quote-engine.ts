import type { MockQuoteResponse, QuoteBreakdownLineItem } from "@/lib/mock-quote";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/translations";
import { sanitizePlainText } from "@/lib/validation";

type CleaningType = "standard" | "deep" | "move_out";
type OccupancyCondition = "occupied" | "empty" | "move_out" | null;

type PropertyDetails = {
  squareFootage?: number;
  beds?: number;
  baths?: number;
};

type ParsedQuoteDetails = {
  squareFootage: number | null;
  squareFootageWasEstimated: boolean;
  beds: number | null;
  baths: number | null;
  cleaningType: CleaningType;
  cleaningTypeWasInferred: boolean;
  pets: boolean;
  interiorWindows: boolean;
  interiorWindowCount: number | null;
  estimatedInteriorWindowCount: number | null;
  fridge: boolean;
  oven: boolean;
  rush: boolean;
  heavyCondition: boolean;
  occupancyCondition: OccupancyCondition;
  possibleAddress: string | null;
  propertyDetailsResolved: boolean;
};

type LocalizedCopy = {
  baseClean: string;
  petHair: string;
  rush: string;
  interiorWindows: string;
  fridge: string;
  oven: string;
  heavyCondition: string;
  estimated: string;
  standard: string;
  deep: string;
  moveOut: string;
};

const PROMPT_INJECTION_PATTERNS = [
  /\bignore\b.{0,40}\binstructions?\b/i,
  /\breveal\b.{0,40}\b(prompt|system|secret|instruction|token)\b/i,
  /\bshow\b.{0,40}\b(prompt|system|secret|instruction|token)\b/i,
  /\bdeveloper mode\b/i,
  /\bsystem prompt\b/i,
  /\bact as\b/i,
  /\boverride\b.{0,40}\b(policy|instruction)\b/i,
];

const ADDRESS_PATTERN =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){1,7}(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|circle|cir\.?|place|pl\.?|way|terrace|ter\.?|parkway|pkwy|highway|hwy|calle|avenida|av\.?|camino|carretera)\b(?:\s*(?:,|#|apt\.?|apartment|unit|suite|ste\.?)\s*[A-Za-z0-9 .-]+)?(?:,\s*[A-Za-z .'-]+)?(?:,\s*[A-Z]{2})?(?:\s+\d{5}(?:-\d{4})?)?/i;

const RATE_BY_TYPE = {
  standard: {
    low: 0.1,
    high: 0.15,
    minimumLow: 125,
    minimumHigh: 175,
    sqftPerLaborHour: 500,
  },
  deep: {
    low: 0.15,
    high: 0.22,
    minimumLow: 180,
    minimumHigh: 250,
    sqftPerLaborHour: 350,
  },
  move_out: {
    low: 0.18,
    high: 0.25,
    minimumLow: 220,
    minimumHigh: 320,
    sqftPerLaborHour: 300,
  },
} satisfies Record<
  CleaningType,
  {
    low: number;
    high: number;
    minimumLow: number;
    minimumHigh: number;
    sqftPerLaborHour: number;
  }
>;

const localizedCopy = {
  en: {
    baseClean: "Base cleaning scope",
    petHair: "Pet hair / extra detail",
    rush: "Rush scheduling",
    interiorWindows: "Interior windows",
    fridge: "Inside fridge",
    oven: "Inside oven",
    heavyCondition: "Heavy soil / buildup",
    estimated: "estimated",
    standard: "standard",
    deep: "deep",
    moveOut: "move-out",
  },
  es: {
    baseClean: "Alcance base de limpieza",
    petHair: "Pelo de mascota / detalle extra",
    rush: "Agenda urgente",
    interiorWindows: "Ventanas interiores",
    fridge: "Interior de refrigerador",
    oven: "Interior de horno",
    heavyCondition: "Suciedad pesada / acumulacion",
    estimated: "estimado",
    standard: "estandar",
    deep: "profunda",
    moveOut: "mudanza",
  },
} satisfies Record<Language, LocalizedCopy>;

function includesPattern(source: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(source));
}

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stripPromptInjectionLines(prompt: string) {
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const safeLines = lines.filter(
    (line) => !PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(line)),
  );

  return safeLines.join("\n").trim();
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rca_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `rca_${Math.random().toString(36).slice(2, 10)}`;
}

function parseNumericToken(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFirstNumber(source: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const parsed = match?.[1] ? parseNumericToken(match[1]) : null;

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function detectAddress(prompt: string) {
  const match = prompt.match(ADDRESS_PATTERN);
  return match?.[0]?.replace(/[.!,;:]+$/, "").trim() || null;
}

function inferCleaningType(source: string): {
  cleaningType: CleaningType;
  cleaningTypeWasInferred: boolean;
} {
  if (
    includesPattern(source, [
      /\bmove[-\s]?out\b/,
      /\bmove[-\s]?in\b/,
      /\bvacate\b/,
      /\bturnover\b/,
      /\bmudanza\b/,
      /\bdesocupad[oa]\b/,
      /\bentrega\b/,
    ])
  ) {
    return {
      cleaningType: "move_out",
      cleaningTypeWasInferred: false,
    };
  }

  if (
    includesPattern(source, [
      /\bdeep\b/,
      /\bdeep[-\s]?clean\b/,
      /\blimpieza profunda\b/,
      /\ba fondo\b/,
      /\bdetallad[ao]\b/,
    ])
  ) {
    return {
      cleaningType: "deep",
      cleaningTypeWasInferred: false,
    };
  }

  if (
    includesPattern(source, [
      /\bstandard\b/,
      /\bregular\b/,
      /\bmaintenance\b/,
      /\bmantenimiento\b/,
      /\bestandar\b/,
      /\bnormal\b/,
    ])
  ) {
    return {
      cleaningType: "standard",
      cleaningTypeWasInferred: false,
    };
  }

  return {
    cleaningType: "standard",
    cleaningTypeWasInferred: true,
  };
}

function inferOccupancyCondition(source: string, cleaningType: CleaningType): OccupancyCondition {
  if (cleaningType === "move_out") {
    return "move_out";
  }

  if (includesPattern(source, [/\bempty\b/, /\bvacant\b/, /\bvacio\b/, /\bvacia\b/, /\bsin muebles\b/])) {
    return "empty";
  }

  if (includesPattern(source, [/\boccupied\b/, /\blived[-\s]?in\b/, /\bocupad[oa]\b/, /\bhabitad[ao]\b/])) {
    return "occupied";
  }

  return null;
}

function estimateSquareFootage(beds: number | null, baths: number | null) {
  if (beds === null && baths === null) {
    return 1400;
  }

  const bedroomEstimate = beds === null ? 950 : 650 + beds * 420;
  const bathAdjustment = baths === null ? 0 : Math.max(baths - 1, 0) * 120;
  return Math.round((bedroomEstimate + bathAdjustment) / 50) * 50;
}

function estimateInteriorWindowCount(squareFootage: number, beds: number | null) {
  const sqftEstimate = Math.max(6, Math.round(squareFootage / 275));
  const bedroomEstimate = beds === null ? 0 : beds * 2 + 3;
  return Math.max(sqftEstimate, bedroomEstimate);
}

function roundMoney(value: number) {
  return Math.max(0, Math.round(value));
}

function roundToNearestFive(value: number) {
  return Math.max(0, Math.round(value / 5) * 5);
}

function roundHours(value: number) {
  return Math.max(1, Math.round(value * 2) / 2);
}

function formatMoneyRange(low: number, high: number) {
  return `$${low}-$${high}`;
}

function getCleaningTypeLabel(cleaningType: CleaningType, language: Language) {
  const copy = localizedCopy[language];

  if (cleaningType === "move_out") {
    return copy.moveOut;
  }

  return cleaningType === "deep" ? copy.deep : copy.standard;
}

async function parseQuotePrompt(prompt: string): Promise<ParsedQuoteDetails> {
  const search = normalizeForSearch(prompt);
  const possibleAddress = detectAddress(prompt);
  const propertyDetails = possibleAddress
    ? await resolvePropertyDetailsFromAddress(possibleAddress)
    : null;

  const beds =
    propertyDetails?.beds ??
    extractFirstNumber(search, [
      /\b(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?|bd|br|habitaciones?|recamaras?|dormitorios?|cuartos?)\b/,
      /\b(?:bed(?:room)?s?|habitaciones?|recamaras?|dormitorios?|cuartos?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/,
    ]);
  const baths =
    propertyDetails?.baths ??
    extractFirstNumber(search, [
      /\b(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|ba|banos?|bano?s?|half bath|medio bano)\b/,
      /\b(?:bath(?:room)?s?|banos?|bano?s?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/,
    ]);
  const squareFootage =
    propertyDetails?.squareFootage ??
    extractFirstNumber(search, [
      /\b(\d{3,6}(?:,\d{3})?)\s*(?:sq\.?\s*ft\.?|sqft|square feet|sf|ft2)\b/,
      /\b(\d{3,6}(?:,\d{3})?)\s*(?:pies cuadrados|pie cuadrado|pies2|metros cuadrados|m2)\b/,
    ]);
  const inferredSquareFootage = squareFootage ?? estimateSquareFootage(beds, baths);
  const cleaningTypeResult = inferCleaningType(search);
  const interiorWindows = includesPattern(search, [
    /\binterior windows?\b/,
    /\binside windows?\b/,
    /\bventanas interiores\b/,
    /\bventanas por dentro\b/,
  ]);
  const interiorWindowCount = interiorWindows
    ? extractFirstNumber(search, [
        /\b(\d{1,3})\s*(?:interior\s*)?windows?\b/,
        /\b(\d{1,3})\s*ventanas(?: interiores)?\b/,
      ])
    : null;
  const estimatedInteriorWindowCount =
    interiorWindows && interiorWindowCount === null
      ? estimateInteriorWindowCount(inferredSquareFootage, beds)
      : null;

  return {
    squareFootage: inferredSquareFootage,
    squareFootageWasEstimated: squareFootage === null,
    beds,
    baths,
    cleaningType: cleaningTypeResult.cleaningType,
    cleaningTypeWasInferred: cleaningTypeResult.cleaningTypeWasInferred,
    pets: includesPattern(search, [
      /\bpet\b/,
      /\bpets\b/,
      /\bpet hair\b/,
      /\bdog\b/,
      /\bcat\b/,
      /\bmascota\b/,
      /\bmascotas\b/,
      /\bperro\b/,
      /\bgato\b/,
      /\bpelo de mascota\b/,
    ]),
    interiorWindows,
    interiorWindowCount,
    estimatedInteriorWindowCount,
    fridge: includesPattern(search, [
      /\bfridge\b/,
      /\brefrigerator\b/,
      /\brefrigerador\b/,
      /\bnevera\b/,
    ]),
    oven: includesPattern(search, [/\boven\b/, /\bhorno\b/]),
    rush: includesPattern(search, [
      /\brush\b/,
      /\burgent\b/,
      /\basap\b/,
      /\bsame day\b/,
      /\btoday\b/,
      /\btomorrow\b/,
      /\bthis week\b/,
      /\burgente\b/,
      /\bhoy\b/,
      /\bmanana\b/,
      /\bmismo dia\b/,
      /\bmisma semana\b/,
      /\besta semana\b/,
      /\bprioridad\b/,
    ]),
    heavyCondition: includesPattern(search, [
      /\bheavy\b/,
      /\bheavy soil\b/,
      /\bheavy buildup\b/,
      /\bvery dirty\b/,
      /\bneglected\b/,
      /\bpost[-\s]?construction\b/,
      /\btrash\b/,
      /\bhoarding\b/,
      /\bmuy suci[oa]\b/,
      /\bsuciedad pesada\b/,
      /\bacumulacion\b/,
      /\bpost construccion\b/,
    ]),
    occupancyCondition: inferOccupancyCondition(search, cleaningTypeResult.cleaningType),
    possibleAddress,
    propertyDetailsResolved: propertyDetails !== null,
  };
}

function addLineItem(
  breakdownLineItems: QuoteBreakdownLineItem[],
  label: string,
  low: number,
  high: number,
  note?: string,
) {
  breakdownLineItems.push({
    label,
    low: roundMoney(low),
    high: roundMoney(high),
    note,
  });
}

function buildPricing(details: ParsedQuoteDetails, language: Language) {
  const copy = localizedCopy[language];
  const rates = RATE_BY_TYPE[details.cleaningType];
  const breakdownLineItems: QuoteBreakdownLineItem[] = [];
  const squareFootage = details.squareFootage ?? 1400;
  let low = Math.max(squareFootage * rates.low, rates.minimumLow);
  let high = Math.max(squareFootage * rates.high, rates.minimumHigh);

  addLineItem(
    breakdownLineItems,
    copy.baseClean,
    low,
    high,
    `${squareFootage.toLocaleString("en-US")} sq ft ${
      details.squareFootageWasEstimated ? `(${copy.estimated})` : ""
    }`.trim(),
  );

  if (details.heavyCondition) {
    const adjustmentLow = low * 0.1;
    const adjustmentHigh = high * 0.25;
    addLineItem(breakdownLineItems, copy.heavyCondition, adjustmentLow, adjustmentHigh);
    low += adjustmentLow;
    high += adjustmentHigh;
  }

  if (details.pets) {
    const adjustmentLow = low * 0.1;
    const adjustmentHigh = high * 0.2;
    addLineItem(breakdownLineItems, copy.petHair, adjustmentLow, adjustmentHigh);
    low += adjustmentLow;
    high += adjustmentHigh;
  }

  if (details.interiorWindows) {
    const count = details.interiorWindowCount ?? details.estimatedInteriorWindowCount ?? 6;
    const note =
      details.interiorWindowCount === null
        ? language === "es"
          ? `${count} ventanas estimadas; confirmar cantidad`
          : `${count} windows estimated; confirm count`
        : `${count} windows`;
    const adjustmentLow = count * 5;
    const adjustmentHigh = count * 10;
    addLineItem(breakdownLineItems, copy.interiorWindows, adjustmentLow, adjustmentHigh, note);
    low += adjustmentLow;
    high += adjustmentHigh;
  }

  if (details.fridge) {
    addLineItem(breakdownLineItems, copy.fridge, 25, 40);
    low += 25;
    high += 40;
  }

  if (details.oven) {
    addLineItem(breakdownLineItems, copy.oven, 25, 50);
    low += 25;
    high += 50;
  }

  if (details.rush) {
    const adjustmentLow = low * 0.15;
    const adjustmentHigh = high * 0.15;
    addLineItem(breakdownLineItems, copy.rush, adjustmentLow, adjustmentHigh);
    low += adjustmentLow;
    high += adjustmentHigh;
  }

  const roundedLow = roundToNearestFive(low);
  const roundedHigh = Math.max(roundToNearestFive(high), roundedLow + 25);
  const recommended = roundToNearestFive((roundedLow + roundedHigh) / 2);

  return {
    low: roundedLow,
    high: roundedHigh,
    recommended,
    breakdownLineItems,
  };
}

function estimateLaborHours(details: ParsedQuoteDetails) {
  const squareFootage = details.squareFootage ?? 1400;
  const rates = RATE_BY_TYPE[details.cleaningType];
  let baseHours = squareFootage / rates.sqftPerLaborHour;

  if (details.heavyCondition) {
    baseHours *= 1.2;
  }

  if (details.pets) {
    baseHours += 0.5;
  }

  if (details.interiorWindows) {
    baseHours += (details.interiorWindowCount ?? details.estimatedInteriorWindowCount ?? 6) * 0.08;
  }

  if (details.fridge) {
    baseHours += 0.4;
  }

  if (details.oven) {
    baseHours += 0.5;
  }

  if (details.rush) {
    baseHours *= 1.08;
  }

  return {
    low: roundHours(baseHours * 0.85),
    high: roundHours(baseHours * 1.25),
    recommended: roundHours(baseHours),
  };
}

function buildAssumptions(details: ParsedQuoteDetails, language: Language) {
  const assumptions: string[] = [];

  if (details.possibleAddress && !details.propertyDetailsResolved) {
    assumptions.push(
      language === "es"
        ? `Direccion detectada: ${details.possibleAddress}. Confirma pies cuadrados, habitaciones, banos y tipo de limpieza porque aun no usamos datos externos de propiedad.`
        : `Address detected: ${details.possibleAddress}. Please confirm square footage, beds, baths, and cleaning type because property data lookup is not connected yet.`,
    );
  }

  if (details.squareFootageWasEstimated) {
    assumptions.push(
      language === "es"
        ? `Los pies cuadrados se estimaron en ${details.squareFootage?.toLocaleString("en-US")} por la informacion disponible.`
        : `Square footage was estimated at ${details.squareFootage?.toLocaleString("en-US")} from the available details.`,
    );
  }

  if (details.cleaningTypeWasInferred) {
    assumptions.push(
      language === "es"
        ? "No se especifico el tipo de limpieza; se uso limpieza estandar como punto de partida."
        : "Cleaning type was not specified; standard cleaning was used as the starting point.",
    );
  }

  if (details.interiorWindows && details.interiorWindowCount === null) {
    assumptions.push(
      language === "es"
        ? `La cantidad de ventanas interiores se estimo en ${details.estimatedInteriorWindowCount ?? 6}; confirma el numero final.`
        : `Interior window count was estimated at ${details.estimatedInteriorWindowCount ?? 6}; confirm the final count.`,
    );
  }

  assumptions.push(
    language === "es"
      ? "El rango asume acceso normal, suministros estandar y que no hay condiciones fuera del alcance descrito."
      : "Range assumes normal access, standard supplies, and no conditions beyond the described scope.",
  );

  return assumptions;
}

function buildScopeHighlights(details: ParsedQuoteDetails, language: Language) {
  const cleaningTypeLabel = getCleaningTypeLabel(details.cleaningType, language);
  const sqft = details.squareFootage?.toLocaleString("en-US") ?? "unknown";
  const occupancy =
    details.occupancyCondition === "move_out"
      ? language === "es"
        ? "condicion de mudanza"
        : "move-out condition"
      : details.occupancyCondition === "empty"
        ? language === "es"
          ? "propiedad vacia"
          : "empty property"
        : details.occupancyCondition === "occupied"
          ? language === "es"
            ? "propiedad ocupada"
            : "occupied property"
          : language === "es"
            ? "ocupacion por confirmar"
            : "occupancy to confirm";

  const detailsLine =
    language === "es"
      ? `${cleaningTypeLabel} para aproximadamente ${sqft} pies cuadrados, ${details.beds ?? "?"} habitaciones y ${details.baths ?? "?"} banos.`
      : `${cleaningTypeLabel} clean for approximately ${sqft} sq ft, ${details.beds ?? "?"} beds, and ${details.baths ?? "?"} baths.`;
  const conditionsLine =
    language === "es"
      ? `${occupancy}${details.heavyCondition ? " con acumulacion pesada" : ""}${details.pets ? " y pelo de mascota" : ""}.`
      : `${occupancy}${details.heavyCondition ? " with heavy buildup" : ""}${details.pets ? " and pet hair" : ""}.`;
  const addonsLine =
    language === "es"
      ? `Extras detectados: ${[
          details.interiorWindows ? "ventanas interiores" : null,
          details.fridge ? "refrigerador" : null,
          details.oven ? "horno" : null,
          details.rush ? "agenda urgente" : null,
        ]
          .filter(Boolean)
          .join(", ") || "ninguno por ahora"}.`
      : `Detected add-ons: ${[
          details.interiorWindows ? "interior windows" : null,
          details.fridge ? "fridge" : null,
          details.oven ? "oven" : null,
          details.rush ? "rush scheduling" : null,
        ]
          .filter(Boolean)
          .join(", ") || "none yet"}.`;

  return [detailsLine, conditionsLine, addonsLine];
}

function buildUpsellSuggestions(details: ParsedQuoteDetails, language: Language) {
  const suggestions: string[] = [];

  if (!details.interiorWindows) {
    suggestions.push(language === "es" ? "Ofrecer ventanas interiores como extra" : "Offer interior windows as an add-on");
  }

  if (!details.fridge || !details.oven) {
    suggestions.push(
      language === "es"
        ? "Agregar detalle de refrigerador u horno si el cliente lo necesita"
        : "Add fridge or oven detail if the customer needs it",
    );
  }

  suggestions.push(
    language === "es"
      ? "Ofrecer una tarifa recurrente para mantenimiento semanal o quincenal"
      : "Offer a recurring maintenance rate for weekly or biweekly service",
  );

  if (details.pets) {
    suggestions.push(
      language === "es"
        ? "Separar el cargo por pelo de mascota para proteger margen"
        : "Separate the pet-hair fee to protect margin",
    );
  }

  return suggestions.slice(0, 4);
}

function buildMarginNote(details: ParsedQuoteDetails, language: Language) {
  if (language === "es") {
    return details.squareFootageWasEstimated || details.cleaningTypeWasInferred
      ? "Protege el margen confirmando los datos faltantes antes de cerrar el precio final; usa el rango alto si hay acumulacion, urgencia o extras."
      : "Protege el margen manteniendo los extras separados y usando el rango alto si el cliente confirma acumulacion, urgencia o acceso complicado.";
  }

  return details.squareFootageWasEstimated || details.cleaningTypeWasInferred
    ? "Protect margin by confirming missing details before locking the final price; use the high end if buildup, rush timing, or add-ons are confirmed."
    : "Protect margin by keeping add-ons separated and using the high end if the customer confirms buildup, rush timing, or difficult access.";
}

function buildSummary(details: ParsedQuoteDetails, pricing: { low: number; high: number }, language: Language) {
  const cleaningTypeLabel = getCleaningTypeLabel(details.cleaningType, language);
  const sqft = details.squareFootage?.toLocaleString("en-US");

  if (language === "es") {
    return `Cotizacion ${cleaningTypeLabel} basada en ${sqft} pies cuadrados${
      details.squareFootageWasEstimated ? " estimados" : ""
    } con rango recomendado de ${formatMoneyRange(pricing.low, pricing.high)}.`;
  }

  return `${cleaningTypeLabel} quote based on ${sqft} sq ft${
    details.squareFootageWasEstimated ? " estimated" : ""
  } with a recommended range of ${formatMoneyRange(pricing.low, pricing.high)}.`;
}

function buildCustomerMessage(
  details: ParsedQuoteDetails,
  pricing: { low: number; high: number; recommended: number },
  estimatedLaborHours: {
    low: number;
    high: number;
    recommended: number;
  },
  language: Language,
) {
  if (language === "es") {
    return `Gracias por compartir los detalles. Para este alcance, el rango estimado es ${formatMoneyRange(
      pricing.low,
      pricing.high,
    )}, con una recomendacion de $${pricing.recommended}. Estimamos aproximadamente ${estimatedLaborHours.low}-${
      estimatedLaborHours.high
    } horas de trabajo. Este rango asume acceso normal y el alcance descrito; podemos ajustar el precio final al confirmar pies cuadrados, banos, extras y condicion del espacio.`;
  }

  return `Thanks for sharing the details. For this scope, the estimated range is ${formatMoneyRange(
    pricing.low,
    pricing.high,
  )}, with a recommended quote of $${pricing.recommended}. We estimate about ${estimatedLaborHours.low}-${
    estimatedLaborHours.high
  } labor hours. This range assumes normal access and the described scope; we can adjust the final price after confirming square footage, bathrooms, add-ons, and property condition.`;
}

function buildNextActions(details: ParsedQuoteDetails, language: Language) {
  if (language === "es") {
    return [
      details.possibleAddress
        ? "Confirmar pies cuadrados, habitaciones, banos y tipo de limpieza antes de cerrar precio."
        : "Confirmar pies cuadrados, habitaciones, banos y condicion general del espacio.",
      "Confirmar extras como ventanas interiores, refrigerador, horno y pelo de mascota.",
      "Enviar el mensaje al cliente y reservar la fecha mientras el lead sigue interesado.",
    ];
  }

  return [
    details.possibleAddress
      ? "Confirm square footage, beds, baths, and cleaning type before locking the price."
      : "Confirm square footage, beds, baths, and general property condition.",
    "Confirm add-ons like interior windows, fridge, oven, and pet hair.",
    "Send the customer-ready message and reserve the date while the lead is still warm.",
  ];
}

// Placeholder seam for future property-data enrichment. Intentionally no external API calls yet.
export async function resolvePropertyDetailsFromAddress(
  address: string,
): Promise<PropertyDetails | null> {
  void address;
  return null;
}

export async function createQuoteEstimate(
  prompt: string,
  language: Language = DEFAULT_LANGUAGE,
): Promise<MockQuoteResponse> {
  const sanitizedPrompt = sanitizePlainText(prompt, {
    maxLength: 2000,
    preserveNewlines: true,
  });
  const safePrompt = stripPromptInjectionLines(sanitizedPrompt) || sanitizedPrompt;
  const details = await parseQuotePrompt(safePrompt);
  const pricing = buildPricing(details, language);
  const estimatedLaborHours = estimateLaborHours(details);
  const assumptions = buildAssumptions(details, language);

  return {
    requestId: createRequestId(),
    generatedAt: new Date().toISOString(),
    prompt: safePrompt,
    summary: buildSummary(details, pricing, language),
    recommendedEstimate: {
      low: pricing.low,
      high: pricing.high,
      recommended: pricing.recommended,
      currency: "USD",
      cadence: "one-time",
    },
    estimatedLaborHours,
    breakdownLineItems: pricing.breakdownLineItems,
    assumptions,
    detectedAddress: details.possibleAddress,
    propertyDataResolved: details.propertyDetailsResolved,
    parsedInputs: {
      squareFootage: details.squareFootage,
      beds: details.beds,
      baths: details.baths,
      cleaningType: details.cleaningType,
      pets: details.pets,
      petHair: details.pets,
      interiorWindows: details.interiorWindows,
      interiorWindowCount: details.interiorWindowCount ?? details.estimatedInteriorWindowCount,
      fridge: details.fridge,
      oven: details.oven,
      rush: details.rush,
      occupied: details.occupancyCondition === "occupied",
      empty: details.occupancyCondition === "empty" || details.occupancyCondition === "move_out",
      heavyCondition: details.heavyCondition,
    },
    scopeHighlights: buildScopeHighlights(details, language),
    marginNote: buildMarginNote(details, language),
    upsellSuggestions: buildUpsellSuggestions(details, language),
    customerMessage: buildCustomerMessage(details, pricing, estimatedLaborHours, language),
    nextActions: buildNextActions(details, language),
  };
}
