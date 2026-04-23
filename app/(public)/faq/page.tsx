import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { faqItems } from "@/lib/site";
import { STRIPE_LINK } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about RapidCleanAI.",
};

export default function FaqPage() {
  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow="FAQ"
        title="Answers for owners who want to launch fast and keep things simple."
        description="Everything below is shaped around the Phase 1 MVP you can start selling immediately."
        align="center"
      />
      <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2">
        {faqItems.map((item) => (
          <Card key={item.question} className="surface-gradient premium-border">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl text-white">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-brand-muted">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-14 flex justify-center">
        <GlowButton href={STRIPE_LINK}>Start Now</GlowButton>
      </div>
    </div>
  );
}
