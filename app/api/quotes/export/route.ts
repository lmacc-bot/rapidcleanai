import { NextResponse } from "next/server";
import { buildQuoteUsageHeaders, getExportableQuotes } from "@/lib/quote-usage";
import { getServerUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

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

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: buildNoStoreHeaders(extraHeaders),
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildNoStoreHeaders({
      Allow: "GET, OPTIONS",
      Vary: "Cookie",
    }),
  });
}

export async function GET() {
  let userId = "";

  try {
    const { user } = await getServerUser();

    if (!user) {
      return jsonResponse(
        {
          error: "Please log in to export quotes.",
          code: "auth_required",
        },
        401,
        {
          Vary: "Cookie",
        },
      );
    }

    userId = user.id;
  } catch (error) {
    console.error(
      "[api/quotes/export] Session verification failure:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      {
        error: "Unable to verify your session right now.",
        code: "auth_unavailable",
      },
      503,
      {
        Vary: "Cookie",
      },
    );
  }

  try {
    const exportResult = await getExportableQuotes(userId);

    if (!exportResult.allowed) {
      return jsonResponse(exportResult.error, exportResult.status, {
        Vary: "Cookie",
      });
    }

    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        plan: exportResult.usage.effectivePlan,
        quotes: exportResult.quotes,
      },
      null,
      2,
    );

    return new NextResponse(body, {
      status: 200,
      headers: buildNoStoreHeaders({
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="rapidcleanai-quotes-${new Date().toISOString().slice(0, 10)}.json"`,
        Vary: "Cookie",
        ...buildQuoteUsageHeaders(exportResult.usage),
      }),
    });
  } catch (error) {
    console.error(
      "[api/quotes/export] Quote export failure:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      {
        error: "Unable to export quotes right now.",
        code: "export_failed",
      },
      500,
      {
        Vary: "Cookie",
      },
    );
  }
}
