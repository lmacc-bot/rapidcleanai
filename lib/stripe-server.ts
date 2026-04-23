import "server-only";
import Stripe from "stripe";

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY. Server-side Stripe features require the secret key.");
  }

  return secretKey;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "Missing STRIPE_WEBHOOK_SECRET. Stripe webhook signature verification requires the webhook secret.",
    );
  }

  return webhookSecret;
}

export function createStripeServerClient() {
  return new Stripe(getStripeSecretKey(), {
    maxNetworkRetries: 2,
  });
}
