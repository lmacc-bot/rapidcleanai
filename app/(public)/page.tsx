import Link from "next/link";
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
import { PricingCard } from "@/components/pricing-card";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  benefitBullets,
  homeProblems,
  homeSolutions,
  homeSteps,
  operatorFeedback,
  pricingFeatures,
  trustBullets,
} from "@/lib/site";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="pb-20">
      <section className="container pt-10 sm:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-7">
            <Badge>Phase 1 MVP</Badge>
            <div className="space-y-5">
              <h1 className="font-display text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Quote Cleaning Jobs Faster. Price Them More Profitably.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-brand-muted sm:text-xl">
                RapidCleanAI helps cleaning business owners respond faster, price smarter, and protect their margins.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowButton href={BILLING_ENTRY_HREF} className="justify-center sm:justify-start">
                Start Now
              </GlowButton>
              <Link href="/pricing" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-2xl")}>
                View Pricing
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {trustBullets.map((bullet) => (
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

          <Card className="surface-gradient premium-border relative overflow-hidden">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Quote Snapshot</p>
                  <h2 className="mt-2 font-display text-2xl text-white">Fast quote guidance</h2>
                </div>
                <div className="rounded-2xl border border-brand-neon/20 bg-brand-neon/10 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Recommended</p>
                  <p className="font-display text-3xl text-brand-neon">$295</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Clock3 className="size-5 text-brand-cyan" />
                  <p className="mt-4 text-sm text-brand-muted">Reply faster while leads are still warm.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <DollarSign className="size-5 text-brand-neon" />
                  <p className="mt-4 text-sm text-brand-muted">Keep pricing disciplined and margin-aware.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <MessageSquareText className="size-5 text-brand-cyan" />
                  <p className="mt-4 text-sm text-brand-muted">Send a polished client message with less editing.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.66)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Example output</p>
                  <span className="rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-brand-cyan">
                    MVP stub
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-brand-muted">
                  <p>Range: $245 - $335</p>
                  <p>Margin note: Avoid discounting until the scope is confirmed.</p>
                  <p>Customer message: Clean, ready-to-send language in one click.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow="Problem"
          title="Most cleaning quotes are slow, inconsistent, and margin-draining."
          description="RapidCleanAI keeps the Phase 1 promise simple: reply faster, price with more confidence, and clean up the workflow."
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
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionHeading
            eyebrow="Solution"
            title="A faster quoting workflow without heavy setup."
            description="This MVP skips the complicated stuff and focuses on the core actions that help you launch and collect revenue now."
          />
          <div className="grid gap-5 md:grid-cols-2">
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
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow="How It Works"
          title="From lead request to polished quote in 3 simple steps."
          description="Keep the workflow focused so your team can start using it right away."
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
                <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Why it matters</p>
                <h3 className="mt-3 font-display text-3xl text-white">Simple enough to launch now</h3>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  Subscription checkout is ready, auth is protected, and the dashboard is already positioned for a real AI backend later.
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
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Monetization Ready</p>
              <p className="mt-3 text-3xl font-display text-white">Trial-first Stripe subscriptions are already wired.</p>
            </div>
            <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-6 cyan-glow">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Protected Access</p>
              <p className="mt-3 text-3xl font-display text-white">Supabase auth keeps the dashboard gated.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-24">
        <SectionHeading
          eyebrow="Testimonials"
          title="What cleaning operators keep asking for."
          description="These feedback themes reflect the quoting pain points owners describe most often during early conversations."
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
          eyebrow="Pricing"
          title="Start with a full-access trial, then keep the plan that fits."
          description="Let customers choose Starter, Pro, or Elite in Stripe, then retain them with upgrades and downgrades instead of forcing cancellation."
        />
        <div className="mt-10">
          <PricingCard
            title="Flexible Subscription Flow"
            features={pricingFeatures}
            ctaLabel="Compare Plans"
            description="Every new account starts with a 14-day full-access trial. After that, customers stay on the selected plan and can change it anytime in Billing Portal."
          />
        </div>
      </section>

      <section className="container mt-24">
        <Card className="surface-gradient premium-border overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Final CTA</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                Launch a cleaner quoting workflow and start collecting revenue now.
              </h2>
              <p className="mt-4 text-base leading-7 text-brand-muted">
                Keep Phase 1 focused on what matters: conversion, checkout, protected access, and a dashboard your customers can already use.
              </p>
            </div>
            <GlowButton href={BILLING_ENTRY_HREF} className="justify-center">
              Start Now
            </GlowButton>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
