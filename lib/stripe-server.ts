import "server-only";
import Stripe from "stripe";
import { siteConfig } from "@/lib/site";
import {
  DEFAULT_BILLING_PLAN,
  isBillingPlanId,
  type BillingPlanId,
} from "@/lib/stripe";

const STRIPE_PRICE_ENV_KEYS = {
  starter: "STRIPE_STARTER_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
  elite: "STRIPE_ELITE_PRICE_ID",
} as const satisfies Record<BillingPlanId, string>;

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

function readStripePriceId(plan: BillingPlanId) {
  const value = process.env[STRIPE_PRICE_ENV_KEYS[plan]]?.trim();
  return value && value.length > 0 ? value : null;
}

function getConfiguredStripePriceEntries() {
  return (Object.keys(STRIPE_PRICE_ENV_KEYS) as BillingPlanId[])
    .map((plan) => [plan, readStripePriceId(plan)] as const)
    .filter((entry): entry is readonly [BillingPlanId, string] => entry[1] !== null);
}

export function getStripePriceEnvPresence() {
  return {
    starter: Boolean(readStripePriceId("starter")),
    pro: Boolean(readStripePriceId("pro")),
    elite: Boolean(readStripePriceId("elite")),
  } satisfies Record<BillingPlanId, boolean>;
}

export function getStripePriceIdForPlan(plan: BillingPlanId) {
  const priceId = readStripePriceId(plan);

  if (!priceId) {
    throw new Error(
      `Missing ${STRIPE_PRICE_ENV_KEYS[plan]}. Set this Stripe price ID before starting ${plan} checkout.`,
    );
  }

  return priceId;
}

export function getStripePriceId(plan: BillingPlanId) {
  return getStripePriceIdForPlan(plan);
}

export function getPlanFromStripePriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) {
    return null;
  }

  const match = getConfiguredStripePriceEntries().find(
    ([, configuredPriceId]) => configuredPriceId === priceId,
  );
  return match?.[0] ?? null;
}

export function normalizeBillingPlan(value: unknown): BillingPlanId {
  return isBillingPlanId(value) ? value : DEFAULT_BILLING_PLAN;
}

export function buildAppUrl(path: string) {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url).toString();
}
