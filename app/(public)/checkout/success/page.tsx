import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Checkout Success",
  description: "RapidCleanAI received your payment and is activating dashboard access.",
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
                Your payment was received successfully
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Thanks for choosing RapidCleanAI. Your dashboard access may take a moment to
                activate while Stripe and Supabase finish syncing.
              </p>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                If your access is still pending after a short wait, sign in again or contact
                support and we can check the activation status for you.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <GlowButton href="/dashboard" trailingIcon={false}>
                Go to dashboard
              </GlowButton>
              <GlowButton href="/" variant="secondary" trailingIcon={false}>
                Back to home
              </GlowButton>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Need help?</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-brand-muted">
              <p>
                This MVP unlocks access through a Stripe webhook, so there can be a short delay
                between payment confirmation and dashboard access.
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
