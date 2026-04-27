import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/events";
import type { FollowUpCreateResponse, FollowUpSummary } from "@/lib/follow-up-types";
import { isProposalPayload } from "@/lib/proposal-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth";
import { sanitizePlainText } from "@/lib/validation";

const MAX_FOLLOW_UP_BODY_BYTES = 2 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type ClientRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type ProposalRow = {
  id: string;
  client_id: string | null;
  payload: unknown;
};

type FollowUpRow = {
  id: string;
  client_id: string | null;
  proposal_id: string | null;
  status: string;
  due_at: string;
  note: string | null;
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

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function logUnexpectedFailure(context: string, error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown error";
  console.error(`[api/follow-ups/create] ${context}`, detail);
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

function parseDueAt(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  const now = Date.now();
  const maxDueAt = now + 366 * 24 * 60 * 60 * 1000;

  if (Number.isNaN(date.getTime()) || date.getTime() <= now || date.getTime() > maxDueAt) {
    return null;
  }

  return date.toISOString();
}

function mapFollowUpResponse(
  followUp: FollowUpRow,
  client: ClientRow | null,
  proposal: ProposalRow,
): FollowUpSummary {
  return {
    id: followUp.id,
    clientId: followUp.client_id,
    proposalId: followUp.proposal_id,
    clientName: client?.name || client?.address || client?.email || client?.phone || null,
    clientContact: client?.phone || client?.email || null,
    dueAt: followUp.due_at,
    note: followUp.note,
    proposalTotal: isProposalPayload(proposal.payload) ? proposal.payload.total_price : null,
    status: followUp.status === "done" ? "done" : "pending",
  };
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
      return jsonError("Please log in to create follow-ups.", 401, {
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

  const parsedBody = await parseJsonBody(request, MAX_FOLLOW_UP_BODY_BYTES);
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

  const proposalId = isUuid(parsedBody.data.proposal_id) ? parsedBody.data.proposal_id : null;
  const clientId = isUuid(parsedBody.data.client_id) ? parsedBody.data.client_id : null;
  const dueAt = parseDueAt(parsedBody.data.due_at);
  const note = sanitizePlainText(typeof parsedBody.data.note === "string" ? parsedBody.data.note : "", {
    maxLength: 500,
    preserveNewlines: true,
  });

  if (!proposalId || !dueAt) {
    return jsonError("Choose a valid proposal and follow-up date.", 400, {
      Vary: "Cookie",
    });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: proposalData, error: proposalError } = await supabase
      .from("proposals")
      .select("id, client_id, payload")
      .eq("id", proposalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (proposalError) {
      throw new Error(proposalError.message);
    }

    const proposal = (proposalData ?? null) as ProposalRow | null;
    if (!proposal) {
      return jsonError("Proposal was not found.", 404, {
        Vary: "Cookie",
      });
    }

    const effectiveClientId = clientId ?? proposal.client_id;
    let client: ClientRow | null = null;

    if (effectiveClientId) {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, phone, email, address")
        .eq("id", effectiveClientId)
        .eq("user_id", userId)
        .maybeSingle();

      if (clientError) {
        throw new Error(clientError.message);
      }

      client = (clientData ?? null) as ClientRow | null;
      if (!client) {
        return jsonError("Client was not found.", 404, {
          Vary: "Cookie",
        });
      }
    }

    const { data: followUpData, error: insertError } = await supabase
      .from("follow_ups")
      .insert({
        user_id: userId,
        client_id: effectiveClientId,
        proposal_id: proposalId,
        due_at: dueAt,
        note: note || null,
      })
      .select("id, client_id, proposal_id, status, due_at, note")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const response: FollowUpCreateResponse = {
      followUp: mapFollowUpResponse(followUpData as FollowUpRow, client, proposal),
    };

    trackEvent(
      "follow_up_created",
      {
        follow_up_id: response.followUp.id,
        proposal_id: proposalId,
        client_id: effectiveClientId,
        due_at: dueAt,
        proposal_total: response.followUp.proposalTotal,
      },
      userId,
    );

    return jsonResponse(response, 200, {
      Vary: "Cookie",
    });
  } catch (error) {
    logUnexpectedFailure("Follow-up create failure", error);
    return jsonError("Unable to create this follow-up right now.", 500, {
      Vary: "Cookie",
    });
  }
}
