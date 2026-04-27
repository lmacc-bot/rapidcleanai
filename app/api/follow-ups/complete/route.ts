import { NextResponse } from "next/server";
import type { FollowUpCompleteResponse } from "@/lib/follow-up-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth";

const MAX_FOLLOW_UP_COMPLETE_BODY_BYTES = 512;
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
  console.error(`[api/follow-ups/complete] ${context}`, detail);
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
      return jsonError("Please log in to update follow-ups.", 401, {
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

  const parsedBody = await parseJsonBody(request, MAX_FOLLOW_UP_COMPLETE_BODY_BYTES);
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

  const followUpId = isUuid(parsedBody.data.follow_up_id) ? parsedBody.data.follow_up_id : null;
  if (!followUpId) {
    return jsonError("Choose a valid follow-up.", 400, {
      Vary: "Cookie",
    });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("follow_ups")
      .update({
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", followUpId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return jsonError("Follow-up was not found.", 404, {
        Vary: "Cookie",
      });
    }

    const response: FollowUpCompleteResponse = {
      id: followUpId,
      status: "done",
    };

    return jsonResponse(response, 200, {
      Vary: "Cookie",
    });
  } catch (error) {
    logUnexpectedFailure("Follow-up complete failure", error);
    return jsonError("Unable to update this follow-up right now.", 500, {
      Vary: "Cookie",
    });
  }
}
