import type Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  createStripeServerClient,
  getStripeWebhookSecret,
} from "@/lib/stripe-server";
import {
  getBillingSnapshotFromSubscription,
  getBillingSnapshotFromSubscriptionId,
  maskEmailForLogs,
  syncBillingAccessByEmail,
} from "@/lib/stripe-billing";

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

async function applyBillingSnapshot(
  snapshot:
    | Awaited<ReturnType<typeof getBillingSnapshotFromSubscription>>
    | Awaited<ReturnType<typeof getBillingSnapshotFromSubscriptionId>>,
  eventType: string,
  eventId: string,
) {
  if (!snapshot?.email) {
    console.warn(`[stripe webhook] Missing billing email for ${eventType} (${eventId}).`);
    return jsonResponse({ received: true });
  }

  const updateResult = await syncBillingAccessByEmail(snapshot);

  if (!updateResult.success) {
    if (updateResult.message === "Invalid billing email.") {
      console.warn(
        `[stripe webhook] Ignoring ${eventType} because the customer email was invalid (${eventId}).`,
      );
      return jsonResponse({ received: true });
    }

    console.error(`[stripe webhook] Failed to sync billing access for ${eventType}:`, updateResult.message);
    return jsonResponse({ error: "Unable to process billing update." }, 500);
  }

  if (!updateResult.updated) {
    console.warn(
      `[stripe webhook] No billing_access row found for ${maskEmailForLogs(snapshot.email)} on ${eventType} (${eventId}).`,
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
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

      if (!subscriptionId) {
        console.warn(`[stripe webhook] Missing subscription id for ${event.type} (${event.id}).`);
        return jsonResponse({ received: true });
      }

      try {
        const snapshot = await getBillingSnapshotFromSubscriptionId(subscriptionId);
        return applyBillingSnapshot(snapshot, event.type, event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown checkout sync error";
        console.error("[stripe webhook] Failed to sync checkout subscription:", message);
        return jsonResponse({ error: "Unable to process checkout completion." }, 500);
      }
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id ?? null;

      if (!subscriptionId) {
        return jsonResponse({ received: true });
      }

      try {
        const snapshot = await getBillingSnapshotFromSubscriptionId(subscriptionId);
        return applyBillingSnapshot(snapshot, event.type, event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown invoice sync error";
        console.error("[stripe webhook] Failed to sync invoice payment:", message);
        return jsonResponse({ error: "Unable to process invoice payment." }, 500);
      }
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      try {
        const snapshot = await getBillingSnapshotFromSubscription(subscription);
        return applyBillingSnapshot(snapshot, event.type, event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown subscription sync error";
        console.error("[stripe webhook] Failed to sync subscription update:", message);
        return jsonResponse({ error: "Unable to process subscription update." }, 500);
      }
    }
    default:
      return jsonResponse({ received: true });
  }
}
