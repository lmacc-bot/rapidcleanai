import type { Metadata } from "next";
import { GlowButton } from "@/components/glow-button";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { pricingFaqItems } from "@/lib/site";
import {
  BILLING_PLANS,
  getCheckoutStartHref,
  TRIAL_PERIOD_DAYS,
} from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose Starter, Pro, or Elite with a 14-day full-access trial.",
};

export default function PricingPage() {
  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing. Powerful results."
        description={`Start with ${TRIAL_PERIOD_DAYS} days of full Elite-level access, then keep the plan you picked or downgrade later in Stripe Billing Portal.`}
        align="center"
      />

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {(Object.entries(BILLING_PLANS) as [keyof typeof BILLING_PLANS, (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS]][]).map(
          ([planId, plan]) => (
            <Card
              key={planId}
              className={`surface-gradient premium-border ${planId === "pro" ? "glow-ring" : ""}`}
            >
              <CardContent className="space-y-6 p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{plan.badge}</p>
                    <h2 className="mt-3 font-display text-3xl text-white">{plan.name}</h2>
                  </div>
                  <div className="rounded-2xl border border-brand-neon/20 bg-brand-neon/10 px-4 py-3 text-right">
                    <div className="font-display text-3xl font-semibold text-brand-neon">
                      {TRIAL_PERIOD_DAYS} days
                    </div>
                    <div className="text-sm text-brand-muted">full access trial</div>
                  </div>
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
                <GlowButton href={getCheckoutStartHref(planId)}>Start {plan.name} Trial</GlowButton>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Full Elite access during trial",
          "Downgrade, upgrade, or cancel in Billing Portal",
          "Secure subscription checkout powered by Stripe",
          "No forced cancellation after trial",
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
        <GlowButton href={getCheckoutStartHref("pro")}>Start Pro Trial</GlowButton>
      </div>
    </div>
  );
}
