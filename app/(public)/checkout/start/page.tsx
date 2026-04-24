import { redirect } from "next/navigation";
import { createCheckoutSessionForPlan, getStripeSubscriptionSummaryByEmail } from "@/lib/stripe-billing";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";
import { getCheckoutStartHref, normalizeBillingPlan } from "@/lib/stripe";

type CheckoutStartPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const params = searchParams ? await searchParams : {};
  const rawPlan = typeof params.plan === "string" ? params.plan : undefined;
  const selectedPlan = normalizeBillingPlan(rawPlan);
  const redirectPath = getCheckoutStartHref(selectedPlan);

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
  });

  if (!checkoutSession.success) {
    console.error("[checkout] Failed to create Stripe checkout session:", checkoutSession.message);
    redirect("/access-pending?reason=checkout_unavailable");
  }

  redirect(checkoutSession.url);
}
