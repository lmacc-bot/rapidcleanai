import { NextResponse } from "next/server";
import { isMockQuoteResponse } from "@/lib/mock-quote";
import { createQuoteEstimate } from "@/lib/quote-engine";
import { buildQuoteUsageHeaders, checkQuoteGenerationAllowance, recordGeneratedQuote } from "@/lib/quote-usage";
import { checkRateLimit } from "@/lib/rate-limit";
import { getBillingPlanLimits } from "@/lib/stripe";
import { getServerUser } from "@/lib/supabase/auth";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/translations";
import { validateChatPromptInput } from "@/lib/validation";

const MAX_CHAT_BODY_BYTES = 4 * 1024;
const CHAT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const CHAT_RATE_LIMIT_MAX_REQUESTS = 20;

export const runtime = "nodejs";

type ParsedJsonBodyResult =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      status: 400 | 413;
      message: string;
    };

function buildNoStoreHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
  });

  if (extraHeaders) {
    const additionalHeaders = new Headers(extraHeaders);
    additionalHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function jsonError(message: string, status: number, extraHeaders?: HeadersInit) {
  return jsonResponse({ error: message }, status, extraHeaders);
}

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: buildNoStoreHeaders(extraHeaders),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function logUnexpectedFailure(context: string, error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown error";
  console.error(`[api/chat] ${context}`, detail);
}

async function parseJsonBody(
  request: Request,
  maxBytes: number,
): Promise<ParsedJsonBodyResult> {
  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch (error) {
    logUnexpectedFailure("JSON parse failure", error);
    return {
      success: false,
      status: 400,
      message: "Invalid JSON body.",
    };
  }

  if (!rawBody.trim()) {
    return {
      success: false,
      status: 400,
      message: "Request body cannot be empty.",
    };
  }

  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    return {
      success: false,
      status: 413,
      message: "Request too large.",
    };
  }

  try {
    return {
      success: true,
      data: JSON.parse(rawBody) as unknown,
    };
  } catch (error) {
    logUnexpectedFailure("JSON parse failure", error);
    return {
      success: false,
      status: 400,
      message: "Invalid JSON body.",
    };
  }
}

function buildRateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  resetAt: number;
}) {
  return {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
    Vary: "Cookie",
  };
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

async function waitForQuoteResponse(ms: number) {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildNoStoreHeaders({
      Allow: "POST, OPTIONS",
    }),
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Invalid request format.", 415);
  }

  let userId = "anonymous";
  try {
    const { user } = await getServerUser();
    if (!user) {
      return jsonError("Please log in to generate quotes.", 401, {
        Vary: "Cookie",
      });
    }

    userId = user.id;
  } catch (error) {
    logUnexpectedFailure("Session verification failure", error);
    return jsonError("Unable to verify your session right now.", 503, {
      Vary: "Cookie",
    });
  }

  const rateLimit = checkRateLimit({
    key: `chat:${userId}:${getClientAddress(request)}`,
    limit: CHAT_RATE_LIMIT_MAX_REQUESTS,
    windowMs: CHAT_RATE_LIMIT_WINDOW_MS,
  });

  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return jsonError(
      "Too many quote requests. Please wait a moment and try again.",
      429,
      {
        ...rateLimitHeaders,
        "Retry-After": String(Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1)),
      },
    );
  }

  const parsedBody = await parseJsonBody(request, MAX_CHAT_BODY_BYTES);
  if (!parsedBody.success) {
    return jsonError(parsedBody.message, parsedBody.status, rateLimitHeaders);
  }

  if (!isPlainObject(parsedBody.data)) {
    return jsonError("Invalid request payload.", 400, rateLimitHeaders);
  }

  const parsedPrompt = validateChatPromptInput(parsedBody.data.prompt);
  const language = isLanguage(parsedBody.data.language) ? parsedBody.data.language : DEFAULT_LANGUAGE;

  if (!parsedPrompt.success) {
    return jsonError(parsedPrompt.message, 400, rateLimitHeaders);
  }

  let quoteAllowance: Awaited<ReturnType<typeof checkQuoteGenerationAllowance>> | null = null;

  try {
    console.log("[DEBUG] Using admin client for quote usage");
    quoteAllowance = await checkQuoteGenerationAllowance(userId);
  } catch (error) {
    logUnexpectedFailure("Quote usage verification failure", error);
    return jsonError("Unable to verify your quote usage right now.", 503, rateLimitHeaders);
  }

  if (!quoteAllowance.allowed) {
    return jsonResponse(quoteAllowance.error, quoteAllowance.status, rateLimitHeaders);
  }

  if (!quoteAllowance.plan.hasAccess) {
    return jsonResponse(
      {
        error: "Complete checkout to activate dashboard access.",
        code: "billing_access_required",
      },
      403,
      rateLimitHeaders,
    );
  }

  try {
    await waitForQuoteResponse(getBillingPlanLimits(quoteAllowance.plan.effectivePlan).mockResponseDelayMs);

    const result = await createQuoteEstimate(parsedPrompt.data, language);

    if (!isMockQuoteResponse(result)) {
      return jsonError("Unable to generate a valid quote right now.", 502, rateLimitHeaders);
    }

    const recordedQuote = await recordGeneratedQuote({
      userId,
      prompt: parsedPrompt.data,
      quote: result,
      plan: quoteAllowance.plan,
    });
    const responseBody = {
      ...result,
      savedQuoteId: recordedQuote.savedQuoteId,
    };

    return NextResponse.json(responseBody, {
      headers: buildNoStoreHeaders({
        ...rateLimitHeaders,
        ...buildQuoteUsageHeaders(recordedQuote.usage),
        Vary: "Cookie",
      }),
    });
  } catch (error) {
    logUnexpectedFailure("Quote generation failure", error);
    return jsonError("Unable to generate a quote right now.", 500, rateLimitHeaders);
  }
}
