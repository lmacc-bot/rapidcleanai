import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { PricingCard } from "@/components/pricing-card";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { pricingFaqItems, pricingFeatures } from "@/lib/site";
import { STRIPE_LINK } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for RapidCleanAI. One Pro Plan at $49 per month.",
};

export default function PricingPage() {
  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing. Powerful results."
        description="One plan, one hosted checkout link, and one clear path to launch."
        align="center"
      />

      <div className="mx-auto mt-10 max-w-5xl">
        <PricingCard features={pricingFeatures} />
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Cancel anytime",
          "No contracts",
          "Secure checkout powered by Stripe",
          "More plans coming soon",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-brand-muted"
          >
            {item}
          </div>
        ))}
      </div>

      <section className="mx-auto mt-16 max-w-5xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers before you subscribe"
          description="Everything customers usually want to confirm before they buy."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pricingFaqItems.map((item) => (
            <Card key={item.question} className="surface-gradient premium-border">
              <CardContent className="p-6">
                <h3 className="font-display text-xl text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-14 flex justify-center">
        <GlowButton href={STRIPE_LINK}>Start Now</GlowButton>
      </div>
    </div>
  );
}
