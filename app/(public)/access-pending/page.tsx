import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent } from "@/components/ui/card";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { siteConfig } from "@/lib/site";
import { getServerUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Access Pending",
  description: "RapidCleanAI account access is being prepared.",
};

type AccessPendingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSetupMessage(value: string | string[] | undefined) {
  return value === "setup_issue"
    ? "Your account was created, but we still need to finish access setup on our side. Please contact support if this does not update soon."
    : null;
}

export default async function AccessPendingPage({ searchParams }: AccessPendingPageProps) {
  try {
    const { user } = await getServerUser();

    if (user) {
      const access = await getBillingAccessStatus(user.id);

      if (access.hasAccess) {
        redirect("/dashboard");
      }
    }
  } catch {
    // Keep this page reachable even if auth is temporarily unavailable.
  }

  const params = searchParams ? await searchParams : {};
  const setupMessage = getSetupMessage(params.reason);

  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <Card className="surface-gradient premium-border mx-auto w-full max-w-4xl overflow-hidden">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-neon">Access status</p>
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Your access is being prepared
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                Your account was created successfully. Complete checkout to activate dashboard access.
              </p>
              <p className="max-w-2xl text-base leading-8 text-brand-muted">
                If you already completed payment, your access may still be processing.
              </p>
            </div>

            {setupMessage ? (
              <p className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm text-brand-text">
                {setupMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <GlowButton href="/" trailingIcon={false}>
                Back to home
              </GlowButton>
              <GlowButton
                href={`mailto:${siteConfig.pageSupportEmail}`}
                variant="secondary"
                trailingIcon={false}
              >
                Contact support
              </GlowButton>
            </div>

            <p className="text-sm text-brand-muted">
              Need help right away? Email{" "}
              <a
                href={`mailto:${siteConfig.pageSupportEmail}`}
                className="text-brand-cyan transition hover:text-white"
              >
                {siteConfig.pageSupportEmail}
              </a>
              .
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">What happens next</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-brand-muted">
              <p>We keep your account in a pending state until billing access is activated.</p>
              <p>
                Once your access is turned on, you can sign in and head straight into the protected
                dashboard.
              </p>
              <p>
                If you need a manual status check, reach out to {siteConfig.pageSupportEmail} and
                our team can review it with you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
