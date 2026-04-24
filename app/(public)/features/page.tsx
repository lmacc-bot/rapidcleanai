import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, DollarSign, MessageSquareText, ShieldCheck, Smartphone } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { GlowButton } from "@/components/glow-button";
import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { featureHighlights } from "@/lib/site";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore the core RapidCleanAI MVP features for faster quote turnaround and cleaner pricing.",
};

const icons = [
  <DollarSign className="size-5" key="price" />,
  <MessageSquareText className="size-5" key="message" />,
  <Clock3 className="size-5" key="clock" />,
  <ShieldCheck className="size-5" key="shield" />,
  <Smartphone className="size-5" key="mobile" />,
];

export default function FeaturesPage() {
  return (
    <div className="container pb-20 pt-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <SectionHeading
          eyebrow="Features"
          title="Built to help cleaning businesses quote faster without losing pricing discipline."
          description="This Phase 1 MVP stays focused on the features that support conversion, quoting speed, and subscription revenue."
        />
        <Card className="surface-gradient premium-border">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Launch-ready MVP</p>
            <p className="font-display text-3xl text-white">Clean UI, protected dashboard, trial-first subscriptions.</p>
            <p className="text-sm leading-7 text-brand-muted">
              Start with the simplest stack that gets customers into the product and into Stripe right away.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowButton href={BILLING_ENTRY_HREF}>Start Now</GlowButton>
              <Link href="/pricing" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-2xl")}>
                View Pricing
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {featureHighlights.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            icon={icons[index]}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>

      <section className="mt-16 grid gap-5 lg:grid-cols-3">
        {[
          {
            title: "Smart pricing guidance",
            description:
              "Use guided inputs and structured quote output to keep every response cleaner and more consistent.",
          },
          {
            title: "Customer-ready messages",
            description:
              "Take the friction out of follow-up by generating a clear, polished response you can quickly send.",
          },
          {
            title: "Mobile-friendly dashboard",
            description:
              "The app keeps the layout usable in the field so quotes are not trapped at a desktop.",
          },
        ].map((item) => (
          <Card key={item.title} className="surface-gradient premium-border">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-brand-muted">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
