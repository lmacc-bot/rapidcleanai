import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe-server";
import { maskEmailForLogs, updateBillingAccessByEmail } from "@/lib/stripe-billing";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

function buildHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers(noStoreHeaders);

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
    headers: buildHeaders(extraHeaders),
  });
}

function normalizeNullableEmail(email: string | null | undefined) {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? normalizedEmail : null;
}

function getCheckoutSessionEmail(session: Stripe.Checkout.Session) {
  return normalizeNullableEmail(session.customer_details?.email ?? session.customer_email);
}

function getInvoiceEmail(invoice: Stripe.Invoice) {
  return normalizeNullableEmail(invoice.customer_email);
}

async function unlockAccessByEmail(email: string, eventType: string, eventId: string) {
  const updateResult = await updateBillingAccessByEmail({
    email,
    paymentStatus: "active",
    hasAccess: true,
    plan: "pro",
  });

  if (!updateResult.success) {
    if (updateResult.message === "Invalid billing email.") {
      console.warn(
        `[stripe webhook] Ignoring ${eventType} because the customer email was invalid (${eventId}).`,
      );
      return jsonResponse({ received: true });
    }

    console.error(`[stripe webhook] Failed to update billing access for ${eventType}:`, updateResult.message);
    return jsonResponse({ error: "Unable to process billing update." }, 500);
  }

  if (!updateResult.updated) {
    console.warn(
      `[stripe webhook] No billing_access row found for ${maskEmailForLogs(email)} on ${eventType} (${eventId}).`,
    );
  }

  return jsonResponse({ received: true });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildHeaders({
      Allow: "POST, OPTIONS",
    }),
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature." }, 400);
  }

  let stripe: ReturnType<typeof createStripeServerClient>;
  let webhookSecret = "";

  try {
    stripe = createStripeServerClient();
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe configuration error";
    console.error("[stripe webhook] Stripe server configuration is unavailable:", message);
    return jsonResponse({ error: "Webhook configuration is unavailable." }, 500);
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request body error";
    console.error("[stripe webhook] Failed to read webhook body:", message);
    return jsonResponse({ error: "Invalid webhook request body." }, 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown signature verification error";
    console.error("[stripe webhook] Signature verification failed:", message);
    return jsonResponse({ error: "Invalid webhook signature." }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = getCheckoutSessionEmail(session);

      if (!email) {
        console.warn(`[stripe webhook] Missing checkout email for ${event.type} (${event.id}).`);
        return jsonResponse({ received: true });
      }

      return unlockAccessByEmail(email, event.type, event.id);
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const email = getInvoiceEmail(invoice);

      if (!email) {
        console.warn(`[stripe webhook] Missing invoice email for ${event.type} (${event.id}).`);
        return jsonResponse({ received: true });
      }

      return unlockAccessByEmail(email, event.type, event.id);
    }
    default:
      return jsonResponse({ received: true });
  }
}
