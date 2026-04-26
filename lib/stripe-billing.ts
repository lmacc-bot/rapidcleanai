import "server-only";
import type Stripe from "stripe";
import { isValidEmail } from "@/lib/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BILLING_PLANS, TRIAL_PERIOD_DAYS, type BillingPlanId } from "@/lib/stripe";
import {
  buildAppUrl,
  createStripeServerClient,
  getPlanFromStripePriceId,
  getStripePriceId,
  normalizeBillingPlan,
} from "@/lib/stripe-server";

type UpdateBillingAccessByEmailInput = {
  email: string;
  paymentStatus: string;
  hasAccess: boolean;
  plan?: BillingPlanId;
};

type UpdateBillingAccessByEmailResult =
  | {
      success: true;
      updated: boolean;
    }
  | {
      success: false;
      updated: false;
      message: string;
    };

export type StripeSubscriptionSummary = {
  customerId: string | null;
  subscriptionId: string | null;
  plan: BillingPlanId | null;
  status: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialing: boolean;
};

type CreateCheckoutSessionInput = {
  email: string;
  userId: string;
  fullName?: string | null;
  plan: BillingPlanId;
  allowTrial?: boolean;
};

type CreateBillingPortalSessionResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      message: string;
    };

type BillingAccessSyncInput = {
  email: string;
  paymentStatus: string | null;
  plan: BillingPlanId | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeNullableEmail(email: string | null | undefined) {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail.length > 0 ? normalizedEmail : null;
}

function normalizeNullableString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getStableSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (!siteUrl) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL. Stripe checkout redirects require a stable site URL.");
  }

  return siteUrl;
}

function normalizeSubscriptionStatus(status: string | null | undefined) {
  return normalizeNullableString(status);
}

function shouldGrantDashboardAccess(paymentStatus: string | null) {
  return paymentStatus === "trialing" || paymentStatus === "active" || paymentStatus === "past_due";
}

function toIsoDate(timestampSeconds: number | null | undefined) {
  return typeof timestampSeconds === "number" ? new Date(timestampSeconds * 1000).toISOString() : null;
}

function getTrialDaysRemaining(trialEndSeconds: number | null | undefined) {
  if (typeof trialEndSeconds !== "number") {
    return null;
  }

  const remainingMs = trialEndSeconds * 1000 - Date.now();
  return Math.max(Math.ceil(remainingMs / 86_400_000), 0);
}

function pickRelevantSubscription(subscriptions: Stripe.Subscription[]) {
  const rankedStatuses: Stripe.Subscription.Status[] = [
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
  ];

  for (const status of rankedStatuses) {
    const match = subscriptions.find((subscription) => subscription.status === status);
    if (match) {
      return match;
    }
  }

  return subscriptions[0] ?? null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): BillingPlanId | null {
  const itemPriceId = subscription.items.data[0]?.price?.id;
  return (
    getPlanFromStripePriceId(itemPriceId) ??
    (normalizeNullableString(subscription.metadata.selected_plan)
      ? normalizeBillingPlan(subscription.metadata.selected_plan)
      : null)
  );
}

async function findStripeCustomerByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  const stripe = createStripeServerClient();
  const customers = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  });

  return customers.data[0] ?? null;
}

async function getOrCreateStripeCustomer(input: {
  email: string;
  userId: string;
  fullName?: string | null;
}) {
  const existingCustomer = await findStripeCustomerByEmail(input.email);

  if (existingCustomer) {
    return existingCustomer;
  }

  const stripe = createStripeServerClient();
  return stripe.customers.create({
    email: normalizeEmail(input.email),
    name: normalizeNullableString(input.fullName ?? undefined) ?? undefined,
    metadata: {
      supabase_user_id: input.userId,
    },
  });
}

async function resolveCustomerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
) {
  if (!customer) {
    return null;
  }

  if (typeof customer !== "string") {
    if ("deleted" in customer && customer.deleted) {
      return null;
    }

    return normalizeNullableEmail(customer.email);
  }

  const stripe = createStripeServerClient();
  const resolvedCustomer = await stripe.customers.retrieve(customer);

  if ("deleted" in resolvedCustomer && resolvedCustomer.deleted) {
    return null;
  }

  return normalizeNullableEmail(resolvedCustomer.email);
}

async function getSubscriptionById(subscriptionId: string) {
  const stripe = createStripeServerClient();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

export function maskEmailForLogs(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) {
    return "invalid-email";
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - visibleLocal.length, 1))}@${domain}`;
}

export async function updateBillingAccessByEmail(
  input: UpdateBillingAccessByEmailInput,
): Promise<UpdateBillingAccessByEmailResult> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      updated: false,
      message: "Invalid billing email.",
    };
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: existingRow, error: selectError } = await supabase
      .from("billing_access")
      .select("user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (selectError) {
      return {
        success: false,
        updated: false,
        message: selectError.message,
      };
    }

    if (!existingRow) {
      return {
        success: true,
        updated: false,
      };
    }

    const updatePayload: {
      payment_status: string;
      has_access: boolean;
      plan?: BillingPlanId;
    } = {
      payment_status: input.paymentStatus,
      has_access: input.hasAccess,
    };

    if (input.plan) {
      updatePayload.plan = input.plan;
    }

    const { error: updateError } = await supabase
      .from("billing_access")
      .update(updatePayload)
      .eq("user_id", existingRow.user_id);

    if (updateError) {
      return {
        success: false,
        updated: false,
        message: updateError.message,
      };
    }

    return {
      success: true,
      updated: true,
    };
  } catch (error) {
    return {
      success: false,
      updated: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncBillingAccessByEmail(input: BillingAccessSyncInput) {
  return updateBillingAccessByEmail({
    email: input.email,
    paymentStatus: input.paymentStatus ?? "pending",
    hasAccess: shouldGrantDashboardAccess(input.paymentStatus),
    plan: input.plan ?? undefined,
  });
}

export async function createCheckoutSessionForPlan(
  input: CreateCheckoutSessionInput,
): Promise<Stripe.Checkout.Session> {
  const stripe = createStripeServerClient();
  const customer = await getOrCreateStripeCustomer({
    email: input.email,
    userId: input.userId,
    fullName: input.fullName,
  });
  const priceId = getStripePriceId(input.plan);
  const siteUrl = getStableSiteUrl();
  const success_url = `${siteUrl}/checkout/success`;
  const cancel_url = `${siteUrl}/checkout/cancel`;

  console.log("[checkout] success_url:", success_url);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    client_reference_id: input.userId,
    allow_promotion_codes: true,
    success_url,
    cancel_url,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      selected_plan: input.plan,
      supabase_user_id: input.userId,
    },
    subscription_data: {
      trial_period_days: input.allowTrial === false ? undefined : TRIAL_PERIOD_DAYS,
      metadata: {
        selected_plan: input.plan,
        supabase_user_id: input.userId,
      },
    },
  });

  console.log("[checkout] Stripe checkout session created", {
    sessionId: session.id,
    urlPresent: Boolean(session.url),
  });

  return session;
}

export async function createBillingPortalSessionForEmail(
  email: string,
): Promise<CreateBillingPortalSessionResult> {
  try {
    const customer = await findStripeCustomerByEmail(email);

    if (!customer) {
      return {
        success: false,
        message: "No Stripe customer exists for this account yet.",
      };
    }

    const stripe = createStripeServerClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: buildAppUrl("/dashboard"),
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getStripeSubscriptionSummaryByEmail(
  email: string | null | undefined,
): Promise<StripeSubscriptionSummary | null> {
  const normalizedEmail = normalizeNullableEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  try {
    const customer = await findStripeCustomerByEmail(normalizedEmail);

    if (!customer) {
      return null;
    }

    const stripe = createStripeServerClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: Object.keys(BILLING_PLANS).length + 4,
      expand: ["data.items.data.price"],
    });

    const subscription = pickRelevantSubscription(subscriptions.data);

    if (!subscription) {
      return {
        customerId: customer.id,
        subscriptionId: null,
        plan: null,
        status: null,
        trialEndsAt: null,
        trialDaysRemaining: null,
        isTrialing: false,
      };
    }

    const status = normalizeSubscriptionStatus(subscription.status);

    return {
      customerId: customer.id,
      subscriptionId: subscription.id,
      plan: getPlanFromSubscription(subscription),
      status,
      trialEndsAt: toIsoDate(subscription.trial_end),
      trialDaysRemaining: status === "trialing" ? getTrialDaysRemaining(subscription.trial_end) : null,
      isTrialing: status === "trialing",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stripe billing] Failed to read Stripe subscription summary:", message);
    return null;
  }
}

export async function getBillingSnapshotFromSubscription(
  subscription: Stripe.Subscription,
): Promise<BillingAccessSyncInput | null> {
  const email = await resolveCustomerEmail(subscription.customer);

  if (!email) {
    return null;
  }

  return {
    email,
    paymentStatus: normalizeSubscriptionStatus(subscription.status),
    plan: getPlanFromSubscription(subscription),
  };
}

export async function getBillingSnapshotFromSubscriptionId(subscriptionId: string) {
  const subscription = await getSubscriptionById(subscriptionId);
  return getBillingSnapshotFromSubscription(subscription);
}
