import { NextResponse } from "next/server";
import { isMockQuoteResponse } from "@/lib/mock-quote";
import { isProposalPayload } from "@/lib/proposal-types";
import { createProposalFromQuote } from "@/lib/proposals";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/translations";

const MAX_PROPOSAL_BODY_BYTES = 1024;

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

type SavedQuoteRow = {
  quote_payload: unknown;
};

function buildNoStoreHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
  });

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: buildNoStoreHeaders(extraHeaders),
  });
}

function jsonError(message: string, status: number, extraHeaders?: HeadersInit) {
  return jsonResponse({ error: message }, status, extraHeaders);
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
  console.error(`[api/proposals/generate] ${context}`, detail);
}

async function parseJsonBody(
  request: Request,
  maxBytes: number,
): Promise<ParsedJsonBodyResult> {
  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch (error) {
    logUnexpectedFailure("JSON read failure", error);
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

function parseSavedQuoteId(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
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

  let userId: string;

  try {
    const { user } = await getServerUser();
    if (!user) {
      return jsonError("Please log in to generate proposals.", 401, {
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

  const parsedBody = await parseJsonBody(request, MAX_PROPOSAL_BODY_BYTES);
  if (!parsedBody.success) {
    return jsonError(parsedBody.message, parsedBody.status, {
      Vary: "Cookie",
    });
  }

  if (!isPlainObject(parsedBody.data)) {
    return jsonError("Invalid request payload.", 400, {
      Vary: "Cookie",
    });
  }

  const savedQuoteId = parseSavedQuoteId(parsedBody.data.saved_quote_id);
  if (savedQuoteId === null) {
    return jsonError("Choose a saved quote before creating a proposal.", 400, {
      Vary: "Cookie",
    });
  }

  const language = isLanguage(parsedBody.data.language)
    ? parsedBody.data.language
    : DEFAULT_LANGUAGE;

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("saved_quotes")
      .select("quote_payload")
      .eq("id", savedQuoteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const savedQuote = (data ?? null) as SavedQuoteRow | null;
    if (!savedQuote || !isMockQuoteResponse(savedQuote.quote_payload)) {
      return jsonError("Saved quote was not found.", 404, {
        Vary: "Cookie",
      });
    }

    const proposal = createProposalFromQuote({
      savedQuoteId,
      quote: savedQuote.quote_payload,
      language,
    });

    if (!isProposalPayload(proposal)) {
      return jsonError("Unable to generate a valid proposal right now.", 502, {
        Vary: "Cookie",
      });
    }

    const { error: insertError } = await supabase.from("proposals").insert({
      user_id: userId,
      saved_quote_id: savedQuoteId,
      payload: proposal,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return jsonResponse(proposal, 200, {
      Vary: "Cookie",
    });
  } catch (error) {
    logUnexpectedFailure("Proposal generation failure", error);
    return jsonError("Unable to generate a proposal right now.", 500, {
      Vary: "Cookie",
    });
  }
}
