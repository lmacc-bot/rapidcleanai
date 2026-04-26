"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { GlowButton } from "@/components/glow-button";
import { LanguageToggle, useT } from "@/components/language-provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { publicNavItems } from "@/lib/site";
import { BILLING_ENTRY_HREF, MANAGE_BILLING_HREF } from "@/lib/stripe";
import { cn } from "@/lib/utils";

type LogoutAction = (formData: FormData) => void | Promise<void>;

type NavbarProps =
  | {
      variant?: "public";
      className?: string;
    }
  | {
      variant: "dashboard";
      className?: string;
      userName?: string | null;
      userEmail?: string | null;
      logoutAction: LogoutAction;
    };

function getPublicNavLabel(href: string, fallback: string, t: ReturnType<typeof useT>) {
  if (href === "/features") {
    return t("nav_features");
  }

  if (href === "/pricing") {
    return t("nav_pricing");
  }

  if (href === "/faq") {
    return t("nav_faq");
  }

  if (href === "/contact") {
    return t("nav_contact");
  }

  return fallback;
}

export function Navbar(props: NavbarProps) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const variant = props.variant ?? "public";
  const dashboardUserLabel =
    props.variant === "dashboard"
      ? props.userName ?? props.userEmail ?? "Account"
      : "Account";
  const logoutAction = props.variant === "dashboard" ? props.logoutAction : undefined;

  return (
    <header className={cn("sticky top-0 z-50 px-3 pt-3 sm:px-6", props.className)}>
      <div className="container">
        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.78)] px-4 py-3 backdrop-blur-xl shadow-[0_16px_48px_rgba(11,15,20,0.35)] sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Logo href={variant === "dashboard" ? "/dashboard" : "/"} />

            <nav className="hidden items-center gap-7 text-sm text-brand-muted lg:flex">
              {variant === "public" ? (
                <>
                  {publicNavItems.map((item) => (
                    <Link key={item.href} href={item.href} className="transition hover:text-white">
                      {getPublicNavLabel(item.href, item.label, t)}
                    </Link>
                  ))}
                  <Link href="/login" className="transition hover:text-white">
                    {t("nav_login")}
                  </Link>
                  <GlowButton href={BILLING_ENTRY_HREF} className="px-4 py-2.5">
                    {t("nav_start_now")}
                  </GlowButton>
                  <LanguageToggle />
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="transition hover:text-white">
                    {t("nav_dashboard")}
                  </Link>
                  <Link href={MANAGE_BILLING_HREF} className="transition hover:text-white">
                    {t("nav_billing")}
                  </Link>
                  <a href="#account" className="transition hover:text-white">
                    {t("nav_account")}
                  </a>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-brand-muted">
                    {dashboardUserLabel}
                  </span>
                  <form action={logoutAction}>
                    <Button type="submit" variant="secondary" size="sm">
                      {t("nav_logout")}
                    </Button>
                  </form>
                  <LanguageToggle />
                </>
              )}
            </nav>

            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-text transition hover:border-brand-neon/40 hover:text-white lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          {open ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 lg:hidden">
              <div className="flex flex-col gap-3 text-sm text-brand-muted">
                {variant === "public" ? (
                  <>
                    {publicNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-white"
                        onClick={() => setOpen(false)}
                      >
                        {getPublicNavLabel(item.href, item.label, t)}
                      </Link>
                    ))}
                    <Link
                      href="/login"
                      className="rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      {t("nav_login")}
                    </Link>
                    <GlowButton href={BILLING_ENTRY_HREF} className="w-full justify-center" onClick={() => setOpen(false)}>
                      {t("nav_start_now")}
                    </GlowButton>
                    <LanguageToggle className="w-fit" />
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      {t("nav_dashboard")}
                    </Link>
                    <Link
                      href={MANAGE_BILLING_HREF}
                      className="rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      {t("nav_billing")}
                    </Link>
                    <a
                      href="#account"
                      className="rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      {t("nav_account")}
                    </a>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em]">
                      {dashboardUserLabel}
                    </div>
                    <form action={logoutAction}>
                      <Button type="submit" variant="secondary" className="w-full">
                        {t("nav_logout")}
                      </Button>
                    </form>
                    <LanguageToggle className="w-fit" />
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
