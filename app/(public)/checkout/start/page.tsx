import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { trackEvent } from "@/lib/events";
import { createCheckoutSessionForPlan, getStripeSubscriptionSummaryByEmail } from "@/lib/stripe-billing";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";
import { getCheckoutStartHref, normalizeBillingPlan } from "@/lib/stripe";
import { getTrialClaimFingerprint, hasTrialClaimForEmail } from "@/lib/trial-claims";

type CheckoutStartPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isPaidCheckoutRequested(value: string | string[] | undefined) {
  return value === "false" || value === "0" || value === "no";
}

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const params = searchParams ? await searchParams : {};
  const rawPlan = typeof params.plan === "string" ? params.plan : undefined;
  const selectedPlan = normalizeBillingPlan(rawPlan);
  const redirectPath = getCheckoutStartHref(selectedPlan);
  const paidCheckoutRequested = isPaidCheckoutRequested(params.trial);
  const requestHeaders = await headers();
  const trialFingerprint = getTrialClaimFingerprint(requestHeaders);

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

  let allowTrial = access.paymentStatus !== "no_trial" && !paidCheckoutRequested;

  if (allowTrial) {
    let trialAlreadyClaimed = false;

    try {
      trialAlreadyClaimed = await hasTrialClaimForEmail(user.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown trial claim check error";
      console.error("[checkout/start] Trial claim check failed; starting paid checkout without trial", {
        message,
        selectedPlan,
      });
      allowTrial = false;
    }

    if (trialAlreadyClaimed) {
      console.warn("[checkout/start] Trial checkout blocked because a trial claim already exists", {
        selectedPlan,
      });
      redirect(`/access-pending?reason=trial_already_used&plan=${selectedPlan}`);
    }
  }

  let checkoutSession: Awaited<ReturnType<typeof createCheckoutSessionForPlan>>;

  try {
    checkoutSession = await createCheckoutSessionForPlan({
      email: user.email,
      userId: user.id,
      fullName:
        typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined,
      plan: selectedPlan,
      allowTrial,
      trialIpHash: trialFingerprint.ipHash,
      trialUserAgentHash: trialFingerprint.userAgentHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown checkout error";
    console.error("[checkout/start] Failed to create Stripe checkout session", {
      message,
    });
    redirect("/access-pending?reason=checkout_unavailable");
  }

  if (!checkoutSession.url) {
    console.error("[checkout] Missing session.url", checkoutSession);
    throw new Error("Missing Stripe checkout URL");
  }

  trackEvent(
    "subscription_started",
    {
      plan: selectedPlan,
      allow_trial: allowTrial,
      paid_checkout_requested: paidCheckoutRequested,
      stripe_session_id: checkoutSession.id,
    },
    user.id,
  );
  redirect(checkoutSession.url);
}
