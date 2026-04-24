import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";
import { MANAGE_BILLING_HREF, TRIAL_PERIOD_DAYS } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Checkout Success",
  description: "RapidCleanAI started your full-access trial and is activating dashboard access.",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <Card className="surface-gradient premium-border mx-auto w-full max-w-4xl overflow-hidden">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:p-10">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-neon">Payment received</p>
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Your full-access trial is active
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Stripe finished checkout successfully. RapidCleanAI can take a brief moment to
                unlock the dashboard while the webhook syncs your {TRIAL_PERIOD_DAYS}-day trial.
              </p>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                During the trial you get Elite-level access, and your selected paid plan will take
                over after the trial unless you change it in Billing Portal.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <GlowButton href="/dashboard" trailingIcon={false}>
                Go to dashboard
              </GlowButton>
              <GlowButton href={MANAGE_BILLING_HREF} variant="secondary" trailingIcon={false}>
                Manage Billing
              </GlowButton>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Need help?</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-brand-muted">
              <p>
                Need to change plans before the trial ends? Use Billing Portal to downgrade,
                upgrade, or cancel without leaving the Stripe-managed flow.
              </p>
              <p>
                Support:{" "}
                <a
                  href={`mailto:${siteConfig.pageSupportEmail}`}
                  className="text-brand-cyan transition hover:text-white"
                >
                  {siteConfig.pageSupportEmail}
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
