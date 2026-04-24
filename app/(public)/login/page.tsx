import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GlowButton } from "@/components/glow-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInfoMessage, getLoginErrorMessage } from "@/lib/feedback";
import { getServerUser } from "@/lib/supabase/auth";
import { signInAction } from "@/lib/supabase/actions";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to RapidCleanAI.",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;
  let fallbackError: string | null = null;

  try {
    ({ user } = await getServerUser());
  } catch {
    fallbackError = getLoginErrorMessage("auth_unavailable");
  }

  if (user) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : {};
  const error = getLoginErrorMessage(params.error) ?? fallbackError;
  const message = getInfoMessage(params.message);
  const redirectTo = typeof params.redirect === "string" && params.redirect.startsWith("/")
    ? params.redirect
    : null;
  const signupHref = (() => {
    if (!redirectTo) {
      return "/signup";
    }

    const redirectUrl = new URL(redirectTo, "http://localhost");
    const selectedPlan = redirectUrl.pathname === "/checkout/start" ? redirectUrl.searchParams.get("plan") : null;
    return typeof selectedPlan === "string" ? `/signup?plan=${encodeURIComponent(selectedPlan)}` : "/signup";
  })();

  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="surface-gradient premium-border">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Login</p>
            <CardTitle className="text-3xl text-white">Welcome back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {message ? (
              <p className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm text-brand-text">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
            <form action={signInAction} className="space-y-5">
              {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
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
                  placeholder="********"
                  autoComplete="current-password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-neon px-5 py-3 text-sm font-semibold text-brand-bg shadow-glow transition hover:-translate-y-0.5"
              >
                Login
              </button>
            </form>
            <p className="text-sm text-brand-muted">
              Don't have an account?{" "}
              <Link href={signupHref} className="text-brand-cyan transition hover:text-white">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="surface-gradient premium-border overflow-hidden">
          <CardContent className="space-y-6 p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Fast launch path</p>
            <h2 className="font-display text-4xl text-white">
              Protected dashboard access for subscribed operators.
            </h2>
            <p className="text-base leading-8 text-brand-muted">
              Sign in to access the quote workspace, mock AI results, and the Phase 1 dashboard built for speed.
            </p>
            <GlowButton href={BILLING_ENTRY_HREF}>Start Now</GlowButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
