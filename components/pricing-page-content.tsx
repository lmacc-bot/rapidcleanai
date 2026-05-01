"use client";

import { GlowButton } from "@/components/glow-button";
import { useT } from "@/components/language-provider";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import {
  BILLING_PLANS,
  type BillingPlanId,
  getCheckoutStartHref,
  TRIAL_PERIOD_DAYS,
} from "@/lib/stripe";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

const pricingPositioning = {
  starter: {
    label: "pricing_starter_label",
    description: "pricing_starter_description",
    cta: "pricing_start_starter",
    note: "pricing_starter_plan_note",
  },
  pro: {
    label: "pricing_pro_label",
    description: "pricing_pro_description",
    cta: "pricing_start_pro",
    note: "pricing_pro_plan_note",
  },
  elite: {
    label: "pricing_elite_label",
    description: "pricing_elite_description",
    cta: "pricing_start_elite",
    note: "pricing_elite_plan_note",
  },
} satisfies Record<
  BillingPlanId,
  {
    label: TranslationKey;
    description: TranslationKey;
    cta: TranslationKey;
    note: TranslationKey;
  }
>;

const pricingDisplayPrices = {
  starter: "$19",
  pro: "$49",
  elite: "$79",
} satisfies Record<BillingPlanId, string>;

const pricingTrustItems = [
  "pricing_full_trial",
  "pricing_change_plan",
  "pricing_secure_checkout",
  "pricing_no_forced_cancel",
] satisfies TranslationKey[];

const pricingPlanHighlights = {
  starter: [
    "pricing_plan_highlight_trial",
    "pricing_starter_highlight_fit",
    "pricing_starter_highlight_change",
  ],
  pro: [
    "pricing_plan_highlight_trial",
    "pricing_pro_highlight_fit",
    "pricing_pro_highlight_change",
  ],
  elite: [
    "pricing_plan_highlight_trial",
    "pricing_elite_highlight_fit",
    "pricing_elite_highlight_change",
  ],
} satisfies Record<BillingPlanId, TranslationKey[]>;

const pricingFaqItems = [
  {
    question: "pricing_faq_1_question",
    answer: "pricing_faq_1_answer",
  },
  {
    question: "pricing_faq_2_question",
    answer: "pricing_faq_2_answer",
  },
  {
    question: "pricing_faq_3_question",
    answer: "pricing_faq_3_answer",
  },
] satisfies Array<{
  question: TranslationKey;
  answer: TranslationKey;
}>;

export function PricingPageContent() {
  const t = useT();

  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow={t("pricing_eyebrow")}
        title={t("pricing_title")}
        description={t("pricing_description")}
        align="center"
      />

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {(Object.entries(BILLING_PLANS) as [BillingPlanId, (typeof BILLING_PLANS)[BillingPlanId]][]).map(
          ([planId, plan]) => {
            const isPro = planId === "pro";
            const positioning = pricingPositioning[planId];

            return (
              <Card
                key={planId}
                className={cn(
                  "surface-gradient premium-border",
                  isPro
                    ? "glow-ring border-brand-neon/60 shadow-[0_28px_110px_rgba(34,255,136,0.24)] lg:-mt-5 lg:scale-[1.05]"
                    : planId === "elite"
                      ? "border-brand-cyan/25"
                      : "border-white/10 opacity-95",
                )}
              >
                <CardContent className={cn("space-y-6 p-7", isPro ? "lg:p-8" : null)}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={cn(
                          "text-xs uppercase tracking-[0.18em]",
                          isPro ? "text-brand-neon" : "text-brand-cyan",
                        )}
                      >
                        {t(positioning.label)}
                      </p>
                      <h2 className="mt-3 font-display text-3xl text-white">{plan.name}</h2>
                      {isPro ? (
                        <span className="mt-3 inline-flex rounded-full border border-brand-neon/40 bg-brand-neon/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-neon shadow-glow">
                          {t("pricing_best_value")}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-right",
                        isPro
                          ? "border-brand-neon/30 bg-brand-neon/15"
                          : "border-brand-neon/20 bg-brand-neon/10",
                      )}
                    >
                      <div className={cn("font-display font-semibold text-brand-neon", isPro ? "text-5xl" : "text-4xl")}>
                        {pricingDisplayPrices[planId]}
                        <span className="ml-1 text-base font-medium text-brand-muted">{t("pricing_monthly_period")}</span>
                      </div>
                      <div className="text-sm text-brand-muted">
                        {t("pricing_trial_price_caption").replace("{days}", String(TRIAL_PERIOD_DAYS))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-brand-muted">{t(positioning.description)}</p>
                  <p
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm leading-6",
                      isPro
                        ? "border-brand-neon/25 bg-brand-neon/10 text-brand-text"
                        : planId === "elite"
                          ? "border-brand-cyan/20 bg-brand-cyan/10 text-brand-text"
                          : "border-white/10 bg-white/5 text-brand-muted",
                    )}
                  >
                    {t(positioning.note)}
                  </p>
                  <ul className="grid gap-3 text-sm text-brand-text">
                    {pricingPlanHighlights[planId].map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                      >
                        {t(highlight)}
                      </li>
                    ))}
                  </ul>
                  <GlowButton
                    href={getCheckoutStartHref(planId)}
                    variant={isPro ? "primary" : "secondary"}
                    className={cn(
                      "w-full",
                      isPro ? "py-4 text-base shadow-[0_22px_65px_rgba(34,255,136,0.32)]" : null,
                    )}
                  >
                    {t(positioning.cta)}
                  </GlowButton>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pricingTrustItems.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-brand-muted"
          >
            {t(item)}
          </div>
        ))}
      </div>

      <section className="mx-auto mt-16 max-w-5xl">
        <SectionHeading
          eyebrow={t("pricing_faq_eyebrow")}
          title={t("pricing_faq_title")}
          description={t("pricing_faq_description")}
        />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pricingFaqItems.map((item) => (
            <Card key={item.question} className="surface-gradient premium-border">
              <CardContent className="p-6">
                <h3 className="font-display text-xl text-white">{t(item.question)}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{t(item.answer)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-14 flex justify-center">
        <GlowButton href={getCheckoutStartHref("pro")}>{t("pricing_start_pro")}</GlowButton>
      </div>
    </div>
  );
}
