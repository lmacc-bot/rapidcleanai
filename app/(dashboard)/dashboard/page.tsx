import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { getServerUser } from "@/lib/supabase/auth";

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
  if (!plan) {
    return "Pro";
  }

  return plan.charAt(0).toUpperCase() + plan.slice(1);
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

  if (!access.hasAccess) {
    redirect("/access-pending");
  }

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

  return (
    <div className="space-y-8">
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
                <p className="mt-2 text-white">{formatPlan(access.plan)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Payment</p>
                <p className="mt-2 text-white">{formatPaymentStatus(access.paymentStatus)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Access</p>
                <p className="mt-2 text-brand-neon">Active</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-brand-muted">Billing</p>
              <p className="mt-1 text-white">
                Manual access gating is active for this MVP. Stripe webhooks can promote pending accounts automatically in a future billing pass.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <DashboardShell />
    </div>
  );
}
