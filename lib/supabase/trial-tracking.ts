import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const TRIAL_IP_LOOKBACK_DAYS = 7;
const TRIAL_IP_LOOKBACK_MS = TRIAL_IP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

type TrackTrialSignupInput = {
  email: string;
  ipAddress: string | null;
  userAgent?: string | null;
};

type TrackTrialSignupResult = {
  success: boolean;
  trialEligible: boolean;
  message?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIpAddress(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  const normalized = ipAddress.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return null;
  }

  const normalized = userAgent.trim();
  return normalized.length > 0 ? normalized.slice(0, 500) : null;
}

export async function trackTrialSignup(
  input: TrackTrialSignupInput,
): Promise<TrackTrialSignupResult> {
  const ipAddress = normalizeIpAddress(input.ipAddress);
  const userAgent = normalizeUserAgent(input.userAgent);

  if (!ipAddress) {
    return {
      success: true,
      trialEligible: true,
    };
  }

  try {
    const supabase = createAdminSupabaseClient();
    const lookbackIso = new Date(Date.now() - TRIAL_IP_LOOKBACK_MS).toISOString();
    const { data: recentTrials, error: selectError } = await supabase
      .from("trial_tracking")
      .select("id")
      .eq("ip_address", ipAddress)
      .gte("created_at", lookbackIso)
      .limit(1);

    if (selectError) {
      return {
        success: false,
        trialEligible: true,
        message: selectError.message,
      };
    }

    const trialEligible = (recentTrials ?? []).length === 0;
    const { error: insertError } = await supabase.from("trial_tracking").insert({
      email: normalizeEmail(input.email),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (insertError) {
      return {
        success: false,
        trialEligible,
        message: insertError.message,
      };
    }

    return {
      success: true,
      trialEligible,
    };
  } catch (error) {
    return {
      success: false,
      trialEligible: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
