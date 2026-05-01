import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, DollarSign, MessageSquareText, ShieldCheck, Smartphone } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { GlowButton } from "@/components/glow-button";
import { SectionHeading } from "@/components/section-heading";
import { T } from "@/components/translated-text";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";
import type { TranslationKey } from "@/lib/translations";
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

const featureHighlights = [
  {
    title: "features_highlight_1_title",
    description: "features_highlight_1_description",
  },
  {
    title: "features_highlight_2_title",
    description: "features_highlight_2_description",
  },
  {
    title: "features_highlight_3_title",
    description: "features_highlight_3_description",
  },
  {
    title: "features_highlight_4_title",
    description: "features_highlight_4_description",
  },
  {
    title: "features_highlight_5_title",
    description: "features_highlight_5_description",
  },
] satisfies Array<{
  title: TranslationKey;
  description: TranslationKey;
}>;

const featureSupportItems = [
  {
    title: "features_support_1_title",
    description: "features_support_1_description",
  },
  {
    title: "features_support_2_title",
    description: "features_support_2_description",
  },
  {
    title: "features_support_3_title",
    description: "features_support_3_description",
  },
] satisfies Array<{
  title: TranslationKey;
  description: TranslationKey;
}>;

export default function FeaturesPage() {
  return (
    <div className="container pb-20 pt-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <SectionHeading
          eyebrow={<T k="features_eyebrow" />}
          title={<T k="features_title" />}
          description={<T k="features_description" />}
        />
        <Card className="surface-gradient premium-border">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
              <T k="features_launch_label" />
            </p>
            <p className="font-display text-3xl text-white">
              <T k="features_launch_title" />
            </p>
            <p className="text-sm leading-7 text-brand-muted">
              <T k="features_launch_description" />
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowButton href={BILLING_ENTRY_HREF}>
                <T k="nav_start_now" />
              </GlowButton>
              <Link href="/pricing" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-2xl")}>
                <T k="home_secondary_cta" />
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
            title={<T k={feature.title} />}
            description={<T k={feature.description} />}
          />
        ))}
      </div>

      <section className="mt-16 grid gap-5 lg:grid-cols-3">
        {featureSupportItems.map((item) => (
          <Card key={item.title} className="surface-gradient premium-border">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl text-white">
                <T k={item.title} />
              </h3>
              <p className="mt-3 text-sm leading-7 text-brand-muted">
                <T k={item.description} />
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
