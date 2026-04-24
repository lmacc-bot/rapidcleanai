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
    redirect(billingPortal.url);
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
