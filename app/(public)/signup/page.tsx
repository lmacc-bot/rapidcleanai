import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSignupErrorMessage } from "@/lib/feedback";
import { getServerUser } from "@/lib/supabase/auth";
import { signUpAction } from "@/lib/supabase/actions";
import { BILLING_ENTRY_HREF, normalizeBillingPlan } from "@/lib/stripe";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_SIGNUP_PASSWORD_LENGTH,
} from "@/lib/validation";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your RapidCleanAI account.",
};

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;
  let fallbackError: string | null = null;

  try {
    ({ user } = await getServerUser());
  } catch {
    fallbackError = getSignupErrorMessage("auth_unavailable");
  }

  if (user) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : {};
  const error = getSignupErrorMessage(params.error) ?? fallbackError;
  const selectedPlan = normalizeBillingPlan(typeof params.plan === "string" ? params.plan : undefined);

  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <Card className="surface-gradient premium-border">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Signup</p>
            <CardTitle className="text-3xl text-white">Create your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
            <form action={signUpAction} className="space-y-5">
              <input type="hidden" name="selectedPlan" value={selectedPlan} />
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={MAX_NAME_LENGTH}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={MIN_SIGNUP_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-neon px-5 py-3 text-sm font-semibold text-brand-bg shadow-glow transition hover:-translate-y-0.5"
              >
                Sign up
              </button>
            </form>
            <p className="text-sm text-brand-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-cyan transition hover:text-white">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="surface-gradient premium-border">
          <CardContent className="space-y-6 p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Why sign up now</p>
            <h2 className="font-display text-4xl text-white">Start with one clean SaaS workflow.</h2>
            <p className="text-base leading-8 text-brand-muted">
              Create an account, store your plan choice, and start a full-access Stripe trial without forcing a cancellation decision upfront.
            </p>
            <GlowButton href={BILLING_ENTRY_HREF}>View Plans</GlowButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
