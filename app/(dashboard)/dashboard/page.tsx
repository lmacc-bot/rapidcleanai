import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { GlowButton } from "@/components/glow-button";
import { TrialCountdownBanner } from "@/components/trial-countdown-banner";
import { Card, CardContent } from "@/components/ui/card";
import { getQuoteWorkspaceSnapshot } from "@/lib/quote-usage";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";
import {
  getStripeSubscriptionSummaryByEmail,
} from "@/lib/stripe-billing";
import {
  formatBillingAiSpeed,
  getBillingPlanLabel,
  MANAGE_BILLING_HREF,
} from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "RapidCleanAI protected dashboard.",
};

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

function formatPaymentStatus(paymentStatus: string | null) {
  if (!paymentStatus) {
    return "Pending";
  }

  return paymentStatus
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatHistoryWindow(historyDays: number | null) {
  return historyDays === null ? "Unlimited" : `${historyDays} days`;
}

function formatQuoteCapacity(limit: number | null) {
  return limit === null ? "Unlimited" : `${limit} / 24h`;
}

function formatSavedQuoteCapacity(visible: number, limit: number | null) {
  return limit === null ? `${visible} saved` : `${visible} / ${limit}`;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    profile?.full_name ||
    (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null) ||
    user.email?.split("@")[0] ||
    "there";
  const isTrialing = access.paymentStatus === "trialing";
  const selectedPlan = stripeSummary?.plan ?? quoteWorkspace.usage.selectedPlan;
  const effectiveAccessLabel = isTrialing ? "Elite Trial" : formatPlan(selectedPlan);

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
            <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Dashboard</p>
            <h1 className="mt-3 font-display text-4xl text-white">Welcome back, {fullName}.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-brand-muted">
              This protected MVP workspace lets you test the quote experience now while keeping the AI layer safely stubbed.
            </p>
          </CardContent>
        </Card>
        <Card id="account" className="surface-gradient premium-border">
          <CardContent className="space-y-4 p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Account</p>
            <div>
              <p className="text-sm text-brand-muted">Profile email</p>
              <p className="mt-1 text-white">{profile?.email ?? user.email}</p>
            </div>
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Plan</p>
                <p className="mt-2 text-white">{formatPlan(selectedPlan)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Payment</p>
                <p className="mt-2 text-white">
                  {formatPaymentStatus(stripeSummary?.status ?? access.paymentStatus)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Access</p>
                <p className="mt-2 text-brand-neon">{effectiveAccessLabel}</p>
              </div>
            </div>
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Quotes</p>
                <p className="mt-2 text-white">
                  {quoteWorkspace.usage.quotesUsed} used
                  <span className="block text-xs text-brand-muted">
                    {formatQuoteCapacity(quoteWorkspace.usage.quoteLimit)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Saved Quotes</p>
                <p className="mt-2 text-white">
                  {formatSavedQuoteCapacity(
                    quoteWorkspace.usage.savedQuotesVisible,
                    quoteWorkspace.usage.savedQuotesLimit,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">History</p>
                <p className="mt-2 text-white">{formatHistoryWindow(quoteWorkspace.usage.historyDays)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">AI Speed</p>
                <p className="mt-2 text-white">{formatBillingAiSpeed(quoteWorkspace.usage.aiSpeed)}</p>
              </div>
            </div>
            {isTrialing ? (
              <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-4">
                <p className="text-sm font-semibold text-white">
                  You are currently on a full-access trial. Choose your plan before the trial ends.
                </p>
                <p className="mt-2 text-sm text-brand-text">
                  Use Billing to manage or change your plan anytime.
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-brand-muted">Billing</p>
              <p className="mt-1 text-white">
                Stripe manages your subscription lifecycle now. Use Billing Portal to downgrade,
                upgrade, or cancel without interrupting the dashboard access flow.
              </p>
            </div>
            <div className="pt-2">
              <GlowButton href={MANAGE_BILLING_HREF} variant="secondary" trailingIcon={false}>
                Manage Billing
              </GlowButton>
            </div>
          </CardContent>
        </Card>
      </section>

      <DashboardShell initialUsage={quoteWorkspace.usage} initialRecentQuotes={quoteWorkspace.recentQuotes} />
    </div>
  );
}
