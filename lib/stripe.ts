export const TRIAL_PERIOD_DAYS = 14;
export const BILLING_ENTRY_HREF = "/pricing";
export const MANAGE_BILLING_HREF = "/billing/manage";
export const DEFAULT_BILLING_PLAN = "pro";

export type BillingAiSpeed = "slower" | "fast" | "fastest";

export const BILLING_PLANS = {
  starter: {
    name: "Starter",
    badge: "Lower Cost",
    description:
      "Choose Starter after your full-access trial if you want the easiest path to stay subscribed at a lighter monthly tier.",
    highlights: [
      "14-day full-access trial starts at checkout",
      "Good fit for solo operators and lean teams",
      "Change plans anytime in Stripe Billing Portal",
    ],
  },
  pro: {
    name: "Pro",
    badge: "Most Popular",
    description:
      "Pick Pro if you want the balanced post-trial plan for faster quoting, strong margins, and a cleaner day-to-day workflow.",
    highlights: [
      "14-day full-access trial starts at checkout",
      "Balanced option for growing cleaning businesses",
      "Downgrade, upgrade, or cancel without calling support",
    ],
  },
  elite: {
    name: "Elite",
    badge: "Highest Tier",
    description:
      "Select Elite if you already know you want the top subscription tier once your trial ends and billing begins.",
    highlights: [
      "14-day full-access trial starts at checkout",
      "Best fit for teams that want the most headroom",
      "Keep full control through Stripe Billing Portal",
    ],
  },
} as const;

export type BillingPlanId = keyof typeof BILLING_PLANS;

export const BILLING_PLAN_LIMITS: Record<
  BillingPlanId,
  {
    quotesPerDay: number | null;
    savedQuotes: number | null;
    historyDays: number | null;
    exportEnabled: boolean;
    templatesEnabled: boolean;
    aiSpeed: BillingAiSpeed;
    mockResponseDelayMs: number;
  }
> = {
  starter: {
    quotesPerDay: 5,
    savedQuotes: 10,
    historyDays: 7,
    exportEnabled: false,
    templatesEnabled: false,
    aiSpeed: "slower",
    mockResponseDelayMs: 1200,
  },
  pro: {
    quotesPerDay: 50,
    savedQuotes: 200,
    historyDays: 30,
    exportEnabled: true,
    templatesEnabled: false,
    aiSpeed: "fast",
    mockResponseDelayMs: 450,
  },
  elite: {
    quotesPerDay: null,
    savedQuotes: null,
    historyDays: null,
    exportEnabled: true,
    templatesEnabled: true,
    aiSpeed: "fastest",
    mockResponseDelayMs: 150,
  },
} as const;

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return typeof value === "string" && value in BILLING_PLANS;
}

export function normalizeBillingPlan(value: unknown): BillingPlanId {
  return isBillingPlanId(value) ? value : DEFAULT_BILLING_PLAN;
}

export function getBillingPlanLabel(plan: string | null | undefined) {
  return BILLING_PLANS[normalizeBillingPlan(plan)].name;
}

export function getBillingPlanLimits(plan: BillingPlanId | string | null | undefined) {
  return BILLING_PLAN_LIMITS[normalizeBillingPlan(plan)];
}

export function getBillingPlanUpgradeTarget(
  plan: BillingPlanId | string | null | undefined,
): BillingPlanId | null {
  const normalizedPlan = normalizeBillingPlan(plan);

  if (normalizedPlan === "starter") {
    return "pro";
  }

  if (normalizedPlan === "pro") {
    return "elite";
  }

  return null;
}

export function formatBillingAiSpeed(speed: BillingAiSpeed) {
  return speed.charAt(0).toUpperCase() + speed.slice(1);
}

export function getCheckoutStartHref(plan: BillingPlanId) {
  return `/checkout/start?plan=${plan}`;
}
