"use client";

import { useEffect, useState } from "react";
import { GlowButton } from "@/components/glow-button";
import { MANAGE_BILLING_HREF, TRIAL_PERIOD_DAYS } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

type TrialCountdownBannerProps = {
  trialEndsAt: string | null;
  trialStartedAt: string | null;
};

function parseDateMs(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getTrialEndMs(trialEndsAt: string | null, trialStartedAt: string | null) {
  const explicitTrialEnd = parseDateMs(trialEndsAt);

  if (explicitTrialEnd !== null) {
    return explicitTrialEnd;
  }

  const storedTrialStart = parseDateMs(trialStartedAt);
  return storedTrialStart === null ? null : storedTrialStart + TRIAL_PERIOD_DAYS * DAY_MS;
}

function getDaysRemaining(trialEndMs: number | null, nowMs: number) {
  if (trialEndMs === null) {
    return null;
  }

  return Math.max(Math.ceil((trialEndMs - nowMs) / DAY_MS), 0);
}

function formatDayCount(days: number) {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function TrialCountdownBanner({
  trialEndsAt,
  trialStartedAt,
}: TrialCountdownBannerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const trialEndMs = getTrialEndMs(trialEndsAt, trialStartedAt);
  const daysRemaining = getDaysRemaining(trialEndMs, nowMs);
  const isEndingSoon = typeof daysRemaining === "number" && daysRemaining <= 3;
  const message =
    typeof daysRemaining === "number"
      ? isEndingSoon
        ? `Your trial ends in ${formatDayCount(daysRemaining)}. Choose a plan to keep access.`
        : `You're on a full-access trial. ${formatDayCount(daysRemaining)} remaining.`
      : "You're on a full-access trial. Choose a plan to keep access.";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-3xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        isEndingSoon
          ? "border-amber-400/25 bg-amber-400/10 text-amber-50"
          : "border-brand-neon/20 bg-brand-neon/10 text-white",
      )}
      aria-live="polite"
    >
      <div>
        <p className="text-sm font-semibold">{message}</p>
        <p className={cn("mt-1 text-sm", isEndingSoon ? "text-amber-100" : "text-brand-text")}>
          Keep your quote workflow moving without interruption.
        </p>
      </div>
      <div className="shrink-0">
        <GlowButton href={MANAGE_BILLING_HREF} variant="secondary" trailingIcon={false}>
          Manage Plan
        </GlowButton>
      </div>
    </div>
  );
}
