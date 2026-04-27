import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/events";
import { isProposalPayload, type ProposalPayload } from "@/lib/proposal-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/translations";
import { isValidEmail, sanitizePlainText } from "@/lib/validation";

const MAX_PROPOSAL_EMAIL_BODY_BYTES = 4 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TEST_FROM_EMAIL = "onboarding@resend.dev";

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

type ProposalRow = {
  id: string;
  payload: unknown;
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

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function logUnexpectedFailure(context: string, error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown error";
  console.error(`[api/proposals/email] ${context}`, detail);
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

function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? "";
}

function buildEmailSubject(proposal: ProposalPayload, language: Language) {
  return language === "es"
    ? `Propuesta de limpieza - ${proposal.subject}`
    : `Cleaning proposal - ${proposal.subject}`;
}

function buildEmailText(input: {
  proposal: ProposalPayload;
  recipientName: string;
  customMessage: string;
  language: Language;
}) {
  const { proposal, recipientName, customMessage, language } = input;

  if (language === "es") {
    return [
      recipientName ? `Hola ${recipientName},` : "Hola,",
      "",
      customMessage || "Comparto la propuesta de limpieza para tu revision.",
      "",
      proposal.message_text,
      "",
      "Gracias por considerar RapidCleanAI. Si tienes preguntas o quieres ajustar el alcance, responde a este email y con gusto lo revisamos.",
      "",
      "Saludos,",
      "RapidCleanAI",
    ].join("\n");
  }

  return [
    recipientName ? `Hi ${recipientName},` : "Hi there,",
    "",
    customMessage || "I'm sharing the cleaning proposal for your review.",
    "",
    proposal.message_text,
    "",
    "Thanks for considering RapidCleanAI. If you have questions or want to adjust the scope, reply to this email and we will be happy to review it.",
    "",
    "Best,",
    "RapidCleanAI",
  ].join("\n");
}

async function loadProposal(input: {
  proposalId: string;
  userId: string;
}): Promise<ProposalRow | null> {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("proposals")
    .select("id, payload")
    .eq("user_id", input.userId);

  query = isUuid(input.proposalId)
    ? query.eq("id", input.proposalId)
    : query.contains("payload", {
        proposal_id: input.proposalId,
      });

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ProposalRow | null;
}

async function sendProposalEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo: string | null;
}) {
  const apiKey = getResendApiKey();
  const from = RESEND_TEST_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  console.log("[api/proposals/email] Resend from address", from);

  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    console.error("[api/proposals/email] Resend request failed", response.status);
    throw new Error("Resend email request failed.");
  }

  return response.json().catch(() => null) as Promise<unknown>;
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
  let replyToEmail: string | null = null;

  try {
    const { user } = await getServerUser();
    if (!user) {
      return jsonError("Please log in to email proposals.", 401, {
        Vary: "Cookie",
      });
    }

    userId = user.id;
    replyToEmail = user.email && isValidEmail(user.email) ? user.email : null;
  } catch (error) {
    logUnexpectedFailure("Session verification failure", error);
    return jsonError("Unable to verify your session right now.", 503, {
      Vary: "Cookie",
    });
  }

  const parsedBody = await parseJsonBody(request, MAX_PROPOSAL_EMAIL_BODY_BYTES);
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

  const proposalId =
    typeof parsedBody.data.proposal_id === "string"
      ? sanitizePlainText(parsedBody.data.proposal_id, { maxLength: 100 })
      : "";
  const recipientEmail = sanitizePlainText(
    typeof parsedBody.data.recipient_email === "string" ? parsedBody.data.recipient_email : "",
    { maxLength: 254 },
  ).toLowerCase();
  const recipientName = sanitizePlainText(
    typeof parsedBody.data.recipient_name === "string" ? parsedBody.data.recipient_name : "",
    { maxLength: 120 },
  );
  const customMessage = sanitizePlainText(
    typeof parsedBody.data.custom_message === "string" ? parsedBody.data.custom_message : "",
    {
      maxLength: 1000,
      preserveNewlines: true,
    },
  );
  const language = isLanguage(parsedBody.data.language)
    ? parsedBody.data.language
    : DEFAULT_LANGUAGE;

  if (!proposalId || !recipientEmail || !isValidEmail(recipientEmail)) {
    return jsonError("Enter a valid proposal and recipient email.", 400, {
      Vary: "Cookie",
    });
  }

  try {
    const proposalRow = await loadProposal({
      proposalId,
      userId,
    });

    if (!proposalRow || !isProposalPayload(proposalRow.payload)) {
      return jsonError("Proposal was not found.", 404, {
        Vary: "Cookie",
      });
    }

    await sendProposalEmail({
      to: recipientEmail,
      subject: buildEmailSubject(proposalRow.payload, language),
      text: buildEmailText({
        proposal: proposalRow.payload,
        recipientName,
        customMessage,
        language,
      }),
      replyTo: replyToEmail,
    });

    trackEvent(
      "proposal_sent_email",
      {
        proposal_id: proposalRow.id,
        language,
        recipient_domain: recipientEmail.split("@")[1] ?? null,
      },
      userId,
    );

    return jsonResponse(
      {
        sent: true,
      },
      200,
      {
        Vary: "Cookie",
      },
    );
  } catch (error) {
    logUnexpectedFailure("Proposal email failure", error);
    return jsonError("Unable to send this proposal email right now.", 500, {
      Vary: "Cookie",
    });
  }
}
