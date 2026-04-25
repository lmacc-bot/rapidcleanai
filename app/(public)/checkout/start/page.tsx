import { redirect } from "next/navigation";
import { createCheckoutSessionForPlan, getStripeSubscriptionSummaryByEmail } from "@/lib/stripe-billing";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";
import { getCheckoutStartHref, normalizeBillingPlan, type BillingPlanId } from "@/lib/stripe";
import { getStripePriceEnvPresence } from "@/lib/stripe-server";

type CheckoutStartPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readStripePriceIdForLogs(plan: BillingPlanId) {
  if (plan === "starter") {
    return process.env.STRIPE_STARTER_PRICE_ID?.trim() || null;
  }

  if (plan === "elite") {
    return process.env.STRIPE_ELITE_PRICE_ID?.trim() || null;
  }

  return process.env.STRIPE_PRO_PRICE_ID?.trim() || null;
}

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const params = searchParams ? await searchParams : {};
  const rawPlan = typeof params.plan === "string" ? params.plan : undefined;
  const selectedPlan = normalizeBillingPlan(rawPlan);
  const redirectPath = getCheckoutStartHref(selectedPlan);
  const priceEnvPresence = getStripePriceEnvPresence();
  const selectedPriceId = readStripePriceIdForLogs(selectedPlan);

  console.log("[checkout/start] Checkout plan requested", {
    rawPlan: rawPlan ?? "missing",
    selectedPlan,
    defaultedToPro: selectedPlan === "pro" && rawPlan !== "pro",
  });
  console.log("[checkout/start] Stripe price env presence", {
    STRIPE_STARTER_PRICE_ID: priceEnvPresence.starter,
    STRIPE_PRO_PRICE_ID: priceEnvPresence.pro,
    STRIPE_ELITE_PRICE_ID: priceEnvPresence.elite,
  });
  console.log("[checkout/start] Selected Stripe price ID", {
    selectedPlan,
    selectedPriceId: selectedPriceId ?? "missing",
  });

  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;

  try {
    ({ user } = await getServerUser());
  } catch {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  if (!user?.email) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const access = await getBillingAccessStatus(user.id);
  const stripeSummary = await getStripeSubscriptionSummaryByEmail(user.email);

  if (access.hasAccess || stripeSummary?.status === "trialing" || stripeSummary?.status === "active") {
    redirect("/billing/manage");
  }

  const checkoutSession = await createCheckoutSessionForPlan({
    email: user.email,
    userId: user.id,
    fullName:
      typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined,
    plan: selectedPlan,
    allowTrial: access.paymentStatus !== "no_trial",
  });

  if (!checkoutSession.success) {
    console.error("[checkout/start] Failed to create Stripe checkout session", {
      message: checkoutSession.message,
      sessionId: checkoutSession.id ?? null,
      urlPresent: checkoutSession.urlPresent ?? null,
    });
    redirect("/access-pending?reason=checkout_unavailable");
  }

  console.log("[checkout/start] Redirecting to Stripe checkout", {
    sessionId: checkoutSession.id,
    urlPresent: checkoutSession.urlPresent,
  });

  redirect(checkoutSession.url);
}
