import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { MANAGE_BILLING_HREF, TRIAL_PERIOD_DAYS } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Checkout Success",
  description: "RapidCleanAI started your full-access trial.",
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
                You&apos;re all set 🎉
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Your {TRIAL_PERIOD_DAYS}-day free trial is active and you now have full access to
                RapidCleanAI.
              </p>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Start generating quotes and close more jobs faster.
              </p>
              <p className="max-w-2xl text-sm leading-7 text-brand-text">
                You can manage or change your plan anytime in Billing.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <GlowButton href="/dashboard" trailingIcon={false}>
                Go to Dashboard
              </GlowButton>
              <GlowButton href={MANAGE_BILLING_HREF} variant="secondary" trailingIcon={false}>
                Manage Billing
              </GlowButton>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">What&apos;s next</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-brand-muted">
              <p>
                Head to your dashboard, enter a few job details, and RapidCleanAI will help shape a
                customer-ready quote.
              </p>
              <p className="text-brand-text">
                If access takes a few seconds to activate, just refresh.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
