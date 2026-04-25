import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { createBillingPortalSessionForEmail } from "@/lib/stripe-billing";
import { siteConfig } from "@/lib/site";
import { getServerUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Manage Billing",
  description: "Open the Stripe Billing Portal to manage your RapidCleanAI subscription.",
};

export default async function ManageBillingPage() {
  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;

  try {
    ({ user } = await getServerUser());
  } catch {
    redirect(`/login?redirect=${encodeURIComponent("/billing/manage")}`);
  }

  if (!user?.email) {
    redirect(`/login?redirect=${encodeURIComponent("/billing/manage")}`);
  }

  const billingPortal = await createBillingPortalSessionForEmail(user.email);

  if (billingPortal.success) {
    return (
      <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
        <Card className="surface-gradient premium-border mx-auto w-full max-w-3xl overflow-hidden">
          <CardContent className="space-y-7 p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan">Billing</p>
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Manage your RapidCleanAI plan
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Open Stripe Billing Portal to update payment details, switch plans, or manage your
                subscription.
              </p>
            </div>

            <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-5">
              <p className="font-display text-2xl font-semibold text-white">Not ready for Pro?</p>
              <p className="mt-3 text-sm leading-7 text-brand-text">
                You can downgrade to a lower plan and keep access without losing your data.
              </p>
              <div className="mt-5">
                <GlowButton href={billingPortal.url} trailingIcon={false}>
                  Change Plan
                </GlowButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <GlowButton href="/dashboard" variant="secondary" trailingIcon={false}>
                Back to dashboard
              </GlowButton>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.error("[billing portal] Failed to create Stripe Billing Portal session:", billingPortal.message);

  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <Card className="surface-gradient premium-border mx-auto w-full max-w-3xl overflow-hidden">
        <CardContent className="space-y-6 p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan">Billing unavailable</p>
          <div className="space-y-4">
            <h1 className="font-display text-4xl text-white sm:text-5xl">
              We could not open billing management right now
            </h1>
            <p className="max-w-2xl text-base leading-8 text-brand-muted">
              Stripe Billing Portal is the place to downgrade, upgrade, or cancel your subscription.
              Please try again in a moment or contact support if the issue keeps happening.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <GlowButton href="/dashboard" trailingIcon={false}>
              Back to dashboard
            </GlowButton>
            <GlowButton
              href={`mailto:${siteConfig.pageSupportEmail}`}
              variant="secondary"
              trailingIcon={false}
            >
              Contact support
            </GlowButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
