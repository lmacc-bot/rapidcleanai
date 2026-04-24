import "server-only";
import Stripe from "stripe";
import { siteConfig } from "@/lib/site";
import {
  DEFAULT_BILLING_PLAN,
  isBillingPlanId,
  type BillingPlanId,
} from "@/lib/stripe";

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

function getStripePlanPriceMap() {
  const starter = process.env.STRIPE_STARTER_PRICE_ID;
  const pro = process.env.STRIPE_PRO_PRICE_ID;
  const elite = process.env.STRIPE_ELITE_PRICE_ID;

  if (!starter || !pro || !elite) {
    throw new Error(
      "Missing Stripe price IDs. Set STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, and STRIPE_ELITE_PRICE_ID.",
    );
  }

  return {
    starter,
    pro,
    elite,
  } satisfies Record<BillingPlanId, string>;
}

export function getStripePriceId(plan: BillingPlanId) {
  return getStripePlanPriceMap()[plan];
}

export function getPlanFromStripePriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) {
    return null;
  }

  const entries = Object.entries(getStripePlanPriceMap()) as [BillingPlanId, string][];
  const match = entries.find(([, configuredPriceId]) => configuredPriceId === priceId);
  return match?.[0] ?? null;
}

export function normalizeBillingPlan(value: unknown): BillingPlanId {
  return isBillingPlanId(value) ? value : DEFAULT_BILLING_PLAN;
}

export function buildAppUrl(path: string) {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url).toString();
}
