"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { GlowButton } from "@/components/glow-button";
import { useT } from "@/components/language-provider";
import { PricingCard } from "@/components/pricing-card";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const t = useT();
  const localizedTrustBullets = [
    t("home_trust_businesses"),
    t("home_trust_fast"),
    t("home_trust_margins"),
  ];
  const homeProblems = [
    {
      title: t("home_problem_1_title"),
      description: t("home_problem_1_description"),
    },
    {
      title: t("home_problem_2_title"),
      description: t("home_problem_2_description"),
    },
    {
      title: t("home_problem_3_title"),
      description: t("home_problem_3_description"),
    },
  ];
  const homeSolutions = [
    {
      title: t("home_solution_1_title"),
      description: t("home_solution_1_description"),
    },
    {
      title: t("home_solution_2_title"),
      description: t("home_solution_2_description"),
    },
    {
      title: t("home_solution_3_title"),
      description: t("home_solution_3_description"),
    },
  ];
  const homeSteps = [
    {
      step: "01",
      title: t("home_step_1_title"),
      description: t("home_step_1_description"),
    },
    {
      step: "02",
      title: t("home_step_2_title"),
      description: t("home_step_2_description"),
    },
    {
      step: "03",
      title: t("home_step_3_title"),
      description: t("home_step_3_description"),
    },
  ];
  const benefitBullets = [
    t("home_benefit_1"),
    t("home_benefit_2"),
    t("home_benefit_3"),
    t("home_benefit_4"),
  ];
  const operatorFeedback = [
    {
      quote: t("home_testimonial_1_quote"),
      role: t("home_testimonial_1_role"),
    },
    {
      quote: t("home_testimonial_2_quote"),
      role: t("home_testimonial_2_role"),
    },
    {
      quote: t("home_testimonial_3_quote"),
      role: t("home_testimonial_3_role"),
    },
  ];
  const pricingFeatures = [
    t("pricing_feature_unlimited"),
    t("pricing_feature_guidance"),
    t("pricing_feature_messages"),
    t("pricing_feature_assistant"),
    t("pricing_feature_dashboard"),
    t("pricing_feature_support"),
  ];

  return (
    <div className="pb-20">
      <section className="container pt-10 sm:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-7">
            <Badge>{t("home_badge")}</Badge>
            <div className="space-y-5">
              <h1 className="font-display text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("home_headline")}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-brand-muted sm:text-xl">
                {t("home_subheadline")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowButton href={BILLING_ENTRY_HREF} className="justify-center sm:justify-start">
                {t("home_primary_cta")}
              </GlowButton>
              <Link href="#example-quote" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-2xl")}>
                {t("home_hero_secondary_cta")}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {localizedTrustBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted"
                >
                  <CheckCircle2 className="mb-2 size-4 text-brand-neon" />
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 lg:items-end">
            <Image
              src="/logo.png"
              alt={t("home_hero_logo_alt")}
              width={420}
              height={420}
              priority
              sizes="(min-width: 1280px) 420px, (min-width: 1024px) 390px, (min-width: 640px) 280px, 72vw"
              className="h-auto w-[min(72vw,260px)] sm:w-[280px] lg:w-[390px] xl:w-[420px]"
            />

            <Card id="example-quote" className="surface-gradient premium-border relative w-full scroll-mt-24 overflow-hidden">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">{t("home_snapshot_label")}</p>
                    <h2 className="mt-2 font-display text-2xl text-white">{t("home_snapshot_title")}</h2>
                  </div>
                  <div className="rounded-2xl border border-brand-neon/20 bg-brand-neon/10 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">{t("home_snapshot_recommended")}</p>
                    <p className="font-display text-3xl text-brand-neon">$295</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Clock3 className="size-5 text-brand-cyan" />
                    <p className="mt-4 text-sm text-brand-muted">{t("home_snapshot_reply")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <DollarSign className="size-5 text-brand-neon" />
                    <p className="mt-4 text-sm text-brand-muted">{t("home_snapshot_margin")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <MessageSquareText className="size-5 text-brand-cyan" />
                    <p className="mt-4 text-sm text-brand-muted">{t("home_snapshot_message")}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.66)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{t("home_example_output")}</p>
                    <span className="rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-brand-cyan">
                      {t("home_guidance_label")}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-brand-muted">
                    <p>{t("home_example_range")}</p>
                    <p>{t("home_example_margin")}</p>
                    <p>{t("home_example_customer")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow={t("home_problem_eyebrow")}
          title={t("home_problem_title")}
          description={t("home_problem_description")}
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {homeProblems.map((problem) => (
            <FeatureCard
              key={problem.title}
              icon={<ArrowUpRight className="size-5" />}
              title={problem.title}
              description={problem.description}
            />
          ))}
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow={t("home_solution_eyebrow")}
          title={t("home_solution_title")}
          description={t("home_solution_description")}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {homeSolutions.map((solution, index) => (
            <FeatureCard
              key={solution.title}
              icon={
                index === 0 ? (
                  <ShieldCheck className="size-5" />
                ) : index === 1 ? (
                  <Clock3 className="size-5" />
                ) : (
                  <Smartphone className="size-5" />
                )
              }
              title={solution.title}
              description={solution.description}
            />
          ))}
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow={t("home_steps_eyebrow")}
          title={t("home_steps_title")}
          description={t("home_steps_description")}
          align="center"
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {homeSteps.map((item) => (
            <Card key={item.step} className="surface-gradient premium-border">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-brand-neon">{item.step}</div>
                <h3 className="mt-4 font-display text-2xl text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-brand-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mt-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <Card className="surface-gradient premium-border overflow-hidden">
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">{t("home_benefit_label")}</p>
                <h3 className="mt-3 font-display text-3xl text-white">{t("home_benefit_title")}</h3>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  {t("home_benefit_description")}
                </p>
              </div>
              <div className="space-y-3">
                {benefitBullets.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(11,15,20,0.55)] px-4 py-3 text-sm text-brand-text"
                  >
                    <Sparkles className="size-4 text-brand-neon" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-5">
            <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-6 glow-ring">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">{t("home_monetization_label")}</p>
              <p className="mt-3 text-3xl font-display text-white">{t("home_monetization_text")}</p>
            </div>
            <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-6 cyan-glow">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">{t("home_access_label")}</p>
              <p className="mt-3 text-3xl font-display text-white">{t("home_access_text")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow={t("home_testimonials_eyebrow")}
          title={t("home_testimonials_title")}
          description={t("home_testimonials_description")}
          align="center"
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {operatorFeedback.map((item) => (
            <Card key={item.role} className="surface-gradient premium-border">
              <CardContent className="p-6">
                <p className="text-sm leading-8 text-brand-text">“{item.quote}”</p>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-brand-muted">{item.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow={t("home_pricing_eyebrow")}
          title={t("home_pricing_title")}
          description={t("home_pricing_description")}
        />
        <div className="mt-10">
          <PricingCard
            title={t("home_pricing_card_title")}
            price={t("home_pricing_card_price")}
            priceCaption={t("home_pricing_card_price_caption")}
            features={pricingFeatures}
            ctaLabel={t("home_pricing_card_cta")}
            badgeLabel={t("home_pricing_card_badge")}
            description={t("home_pricing_card_description")}
            footerText={t("home_pricing_card_footer")}
          />
        </div>
      </section>

      <section className="container mt-24">
        <Card className="surface-gradient premium-border overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">{t("home_final_eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                {t("home_final_title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-brand-muted">
                {t("home_final_description")}
              </p>
            </div>
            <GlowButton href={BILLING_ENTRY_HREF} className="justify-center">
              {t("home_primary_cta")}
            </GlowButton>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
