import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { siteConfig } from "@/lib/site";
import { getServerUser } from "@/lib/supabase/auth";
import {
  BILLING_PLANS,
  getBillingPlanLabel,
  getCheckoutStartHref,
  normalizeBillingPlan,
  TRIAL_PERIOD_DAYS,
} from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Access Pending",
  description: "RapidCleanAI account access is being prepared.",
};

type AccessPendingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSetupMessage(value: string | string[] | undefined) {
  return value === "setup_issue"
    ? "Your account was created, but we still need to finish access setup on our side. Please contact support if this does not update soon."
    : value === "checkout_unavailable"
      ? "We could not start Stripe checkout right now. Please try again in a moment."
    : value === "trial_already_used"
      ? "A free trial has already been used for this account. You can choose a paid plan to continue."
    : null;
}

export default async function AccessPendingPage({ searchParams }: AccessPendingPageProps) {
  const params = searchParams ? await searchParams : {};
  const trialAlreadyUsed = params.reason === "trial_already_used";
  let selectedPlan = normalizeBillingPlan(params.plan);

  try {
    const { user } = await getServerUser();

    if (user) {
      const access = await getBillingAccessStatus(user.id);
      selectedPlan = access.plan ? normalizeBillingPlan(access.plan) : selectedPlan;

      if (access.hasAccess) {
        redirect("/dashboard");
      }
    }
  } catch {
    // Keep this page reachable even if auth is temporarily unavailable.
  }

  const setupMessage = getSetupMessage(params.reason);
  const checkoutOptions = trialAlreadyUsed ? { trial: false } : undefined;
  const selectedPlanLabel = getBillingPlanLabel(selectedPlan);

  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <Card className="surface-gradient premium-border mx-auto w-full max-w-4xl overflow-hidden">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-neon">Access status</p>
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Your access is being prepared
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Your account was created successfully. Complete checkout to activate dashboard access.
              </p>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                {trialAlreadyUsed
                  ? "Choose the plan that fits your business and continue with full RapidCleanAI access."
                  : `Start a ${TRIAL_PERIOD_DAYS}-day full-access trial now. RapidCleanAI unlocks Elite-level access during the trial, then keeps you on the plan you selected unless you downgrade later.`}
              </p>
            </div>

            {setupMessage ? (
              <p className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm text-brand-text">
                {setupMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <GlowButton href={getCheckoutStartHref(selectedPlan, checkoutOptions)} trailingIcon={false}>
                {trialAlreadyUsed ? `Start ${selectedPlanLabel} Plan` : `Start ${selectedPlanLabel} Trial`}
              </GlowButton>
              <GlowButton
                href={`mailto:${siteConfig.pageSupportEmail}`}
                variant="secondary"
                trailingIcon={false}
              >
                Contact support
              </GlowButton>
            </div>

            <p className="text-sm text-brand-muted">
              Need help right away? Email{" "}
              <a
                href={`mailto:${siteConfig.pageSupportEmail}`}
                className="text-brand-cyan transition hover:text-white"
              >
                {siteConfig.pageSupportEmail}
              </a>
              .
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">What happens next</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-brand-muted">
              <p>
                {trialAlreadyUsed
                  ? "Pick a plan and continue to checkout without another free trial."
                  : "Pick a plan and start your Stripe subscription checkout to unlock the full-access trial."}
              </p>
              {!trialAlreadyUsed ? (
                <p>
                  During the trial, every account gets Elite-level dashboard access even if you
                  chose Starter or Pro for post-trial billing.
                </p>
              ) : null}
              <p>
                After checkout, you can downgrade, upgrade, or cancel later in Stripe Billing
                Portal without losing the option to stay subscribed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mx-auto mt-10 grid w-full max-w-6xl gap-5 lg:grid-cols-3">
        {(Object.entries(BILLING_PLANS) as [keyof typeof BILLING_PLANS, (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS]][]).map(
          ([planId, plan]) => {
            const isSelected = planId === selectedPlan;

            return (
              <Card
                key={planId}
                className={`surface-gradient premium-border ${isSelected ? "glow-ring" : ""}`}
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{plan.badge}</p>
                      <h2 className="mt-3 font-display text-3xl text-white">{plan.name}</h2>
                    </div>
                    {isSelected ? (
                      <span className="rounded-full border border-brand-neon/20 bg-brand-neon/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-brand-neon">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-7 text-brand-muted">{plan.description}</p>
                  <ul className="grid gap-3 text-sm text-brand-text">
                    {plan.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <GlowButton href={getCheckoutStartHref(planId, checkoutOptions)} trailingIcon={false}>
                    {trialAlreadyUsed ? `Start ${plan.name} Plan` : `Start ${plan.name} Trial`}
                  </GlowButton>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>
    </div>
  );
}
