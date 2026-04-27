import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { GlowButton } from "@/components/glow-button";
import { TrialCountdownBanner } from "@/components/trial-countdown-banner";
import { T, TFormat } from "@/components/translated-text";
import { Card, CardContent } from "@/components/ui/card";
import { getLatestClients } from "@/lib/clients";
import { getPendingFollowUps } from "@/lib/follow-ups";
import { getQuoteWorkspaceSnapshot } from "@/lib/quote-usage";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";
import {
  getStripeSubscriptionSummaryByEmail,
} from "@/lib/stripe-billing";
import {
  getBillingPlanLabel,
  MANAGE_BILLING_HREF,
  type BillingAiSpeed,
} from "@/lib/stripe";
import type { TranslationKey } from "@/lib/translations";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "RapidCleanAI protected dashboard.",
};

const CLIENT_REUSE_LIMIT = 25;

function buildDashboardLoginHref(errorCode?: string) {
  const searchParams = new URLSearchParams({
    redirect: "/dashboard",
  });

  if (errorCode) {
    searchParams.set("error", errorCode);
  }

  return `/login?${searchParams.toString()}`;
}

function formatPlan(plan: string | null) {
  return getBillingPlanLabel(plan);
}

function formatQuoteCapacity(limit: number | null) {
  return limit === null ? null : `${limit} / 24h`;
}

function getPaymentStatusKey(paymentStatus: string | null): TranslationKey {
  switch (paymentStatus) {
    case "active":
      return "dashboard_payment_active";
    case "trialing":
      return "dashboard_payment_trialing";
    case "no_trial":
      return "dashboard_payment_no_trial";
    case "past_due":
      return "dashboard_payment_past_due";
    case "incomplete":
      return "dashboard_payment_incomplete";
    case "unpaid":
      return "dashboard_payment_unpaid";
    case "canceled":
    case "cancelled":
      return "dashboard_payment_canceled";
    case "pending":
    case null:
    case undefined:
      return "dashboard_payment_pending";
    default:
      return "dashboard_payment_review";
  }
}

function getAiSpeedKey(speed: BillingAiSpeed): TranslationKey {
  switch (speed) {
    case "slower":
      return "ai_speed_slower";
    case "fast":
      return "ai_speed_fast";
    case "fastest":
      return "ai_speed_fastest";
  }
}

export default async function DashboardPage() {
  let supabase: Awaited<ReturnType<typeof getServerUser>>["supabase"] | null = null;
  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;

  try {
    ({ supabase, user } = await getServerUser());
  } catch {
    redirect(buildDashboardLoginHref("auth_unavailable"));
  }

  if (!user) {
    redirect(buildDashboardLoginHref());
  }

  if (!supabase) {
    redirect(buildDashboardLoginHref("auth_unavailable"));
  }

  const access = await getBillingAccessStatus(user.id);
  const stripeSummary = await getStripeSubscriptionSummaryByEmail(user.email ?? null);

  if (!access.hasAccess) {
    redirect("/access-pending");
  }

  const quoteWorkspace = await getQuoteWorkspaceSnapshot(user.id);
  const latestClients = await getLatestClients(user.id, CLIENT_REUSE_LIMIT);
  const pendingFollowUps = await getPendingFollowUps(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    profile?.full_name ||
    (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null) ||
    user.email?.split("@")[0] ||
    null;
  const isTrialing = access.paymentStatus === "trialing";
  const selectedPlan = stripeSummary?.plan ?? quoteWorkspace.usage.selectedPlan;

  return (
    <div className="space-y-8">
      {isTrialing ? (
        <TrialCountdownBanner
          trialEndsAt={stripeSummary?.trialEndsAt ?? null}
          trialStartedAt={access.createdAt}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="surface-gradient premium-border">
          <CardContent className="p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">
              <T k="dashboard_label" />
            </p>
            <h1 className="mt-3 font-display text-4xl text-white">
              <T k="dashboard_welcome" />, {fullName ?? <T k="dashboard_fallback_name" />}.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-brand-muted">
              <T k="dashboard_intro" />
            </p>
          </CardContent>
        </Card>
        <Card id="account" className="surface-gradient premium-border">
          <CardContent className="space-y-4 p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
              <T k="dashboard_account" />
            </p>
            <div>
              <p className="text-sm text-brand-muted">
                <T k="dashboard_profile_email" />
              </p>
              <p className="mt-1 text-white">{profile?.email ?? user.email}</p>
            </div>
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_plan" />
                </p>
                <p className="mt-2 text-white">{formatPlan(selectedPlan)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_payment" />
                </p>
                <p className="mt-2 text-white">
                  <T k={getPaymentStatusKey(stripeSummary?.status ?? access.paymentStatus)} />
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_access" />
                </p>
                <p className="mt-2 text-brand-neon">
                  {isTrialing ? <T k="dashboard_elite_trial" /> : formatPlan(selectedPlan)}
                </p>
              </div>
            </div>
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_quotes" />
                </p>
                <p className="mt-2 text-white">
                  {quoteWorkspace.usage.quotesUsed} <T k="dashboard_used" />
                  <span className="block text-xs text-brand-muted">
                    {formatQuoteCapacity(quoteWorkspace.usage.quoteLimit) ?? <T k="results_unlimited" />}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_saved_quotes" />
                </p>
                <p className="mt-2 text-white">
                  {quoteWorkspace.usage.savedQuotesLimit === null ? (
                    <TFormat
                      k="dashboard_saved_count"
                      values={{ count: quoteWorkspace.usage.savedQuotesVisible }}
                    />
                  ) : (
                    `${quoteWorkspace.usage.savedQuotesVisible} / ${quoteWorkspace.usage.savedQuotesLimit}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_history" />
                </p>
                <p className="mt-2 text-white">
                  {quoteWorkspace.usage.historyDays === null ? (
                    <T k="results_unlimited" />
                  ) : (
                    <TFormat
                      k="dashboard_history_days"
                      values={{ days: quoteWorkspace.usage.historyDays }}
                    />
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  <T k="dashboard_ai_speed" />
                </p>
                <p className="mt-2 text-white">
                  <T k={getAiSpeedKey(quoteWorkspace.usage.aiSpeed)} />
                </p>
              </div>
            </div>
            {isTrialing ? (
              <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
                <p className="text-sm font-semibold text-white">
                  <T k="dashboard_trial_notice" />
                </p>
                <p className="mt-2 text-sm text-brand-text">
                  <T k="dashboard_trial_manage" />
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-brand-muted">
                <T k="dashboard_billing" />
              </p>
              <p className="mt-1 text-white">
                <T k="dashboard_billing_description" />
              </p>
            </div>
            <div className="pt-2">
              <GlowButton href={MANAGE_BILLING_HREF} variant="secondary" trailingIcon={false}>
                <T k="dashboard_manage_billing" />
              </GlowButton>
            </div>
          </CardContent>
        </Card>
      </section>

      <DashboardShell
        initialUsage={quoteWorkspace.usage}
        initialRecentQuotes={quoteWorkspace.recentQuotes}
        initialClients={latestClients}
        initialFollowUps={pendingFollowUps}
      />
    </div>
  );
}
