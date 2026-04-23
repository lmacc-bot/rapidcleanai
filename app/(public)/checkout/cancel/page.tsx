import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Checkout Canceled",
  description: "RapidCleanAI checkout was canceled before payment completed.",
};

export default function CheckoutCancelPage() {
  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <Card className="surface-gradient premium-border mx-auto w-full max-w-3xl overflow-hidden">
        <CardContent className="space-y-6 p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan">Checkout canceled</p>
          <div className="space-y-4">
            <h1 className="font-display text-4xl text-white sm:text-5xl">
              Your checkout was canceled
            </h1>
            <p className="max-w-2xl text-base leading-8 text-brand-muted">
              No payment was completed, and your dashboard access will stay pending until checkout
              is finished successfully.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <GlowButton href="/pricing" trailingIcon={false}>
              Return to pricing
            </GlowButton>
            <GlowButton href="/" variant="secondary" trailingIcon={false}>
              Back to home
            </GlowButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
