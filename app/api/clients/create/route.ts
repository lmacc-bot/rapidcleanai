import { NextResponse } from "next/server";
import { isClientSummary, type ClientCreateResponse } from "@/lib/client-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth";
import { isValidEmail, sanitizePlainText } from "@/lib/validation";

const MAX_CLIENT_BODY_BYTES = 4 * 1024;

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
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  console.error(`[api/clients/create] ${context}`, detail);
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

function readTextField(body: Record<string, unknown>, field: string, maxLength: number) {
  const value = body[field];
  return sanitizePlainText(typeof value === "string" ? value : "", {
    maxLength,
    preserveNewlines: field === "notes",
  });
}

function mapClientRow(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at,
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
      return jsonError("Please log in to save clients.", 401, {
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

  const parsedBody = await parseJsonBody(request, MAX_CLIENT_BODY_BYTES);
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

  const name = readTextField(parsedBody.data, "name", 120);
  const phone = readTextField(parsedBody.data, "phone", 40);
  const email = readTextField(parsedBody.data, "email", 254).toLowerCase();
  const address = readTextField(parsedBody.data, "address", 240);
  const notes = readTextField(parsedBody.data, "notes", 1000);
  const proposalId =
    typeof parsedBody.data.proposal_id === "string"
      ? sanitizePlainText(parsedBody.data.proposal_id, { maxLength: 80 })
      : "";

  if (!name && !phone && !email && !address) {
    return jsonError("Add at least one client detail before saving.", 400, {
      Vary: "Cookie",
    });
  }

  if (email && !isValidEmail(email)) {
    return jsonError("Enter a valid client email address.", 400, {
      Vary: "Cookie",
    });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: name || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      })
      .select("id, name, phone, email, address, notes, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const client = mapClientRow(data as ClientRow);
    if (!isClientSummary(client)) {
      return jsonError("Unable to save a valid client right now.", 502, {
        Vary: "Cookie",
      });
    }

    let proposalAttached = false;

    if (proposalId) {
      const { data: attachedRows, error: attachError } = await supabase
        .from("proposals")
        .update({
          client_id: client.id,
        })
        .eq("user_id", userId)
        .contains("payload", {
          proposal_id: proposalId,
        })
        .select("id");

      if (attachError) {
        logUnexpectedFailure("Proposal client attachment failure", attachError.message);
      } else {
        proposalAttached = Array.isArray(attachedRows) && attachedRows.length > 0;
      }
    }

    const response: ClientCreateResponse = {
      client,
      proposalAttached,
    };

    return jsonResponse(response, 200, {
      Vary: "Cookie",
    });
  } catch (error) {
    logUnexpectedFailure("Client save failure", error);
    return jsonError("Unable to save this client right now.", 500, {
      Vary: "Cookie",
    });
  }
}
