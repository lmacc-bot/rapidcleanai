import "server-only";
import { createHash } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type HeaderReader = {
  get(name: string): string | null;
};

type TrialClaimInput = {
  userId: string | null;
  email: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  stripeCustomerId?: string | null;
};

type TrialClaimResult =
  | {
      success: true;
      created: boolean;
    }
  | {
      success: false;
      message: string;
    };

function normalizeEmailBase(email: string) {
  return email.trim().toLowerCase();
}

function maskEmailForLogs(email: string) {
  const normalizedEmail = normalizeEmailBase(email);
  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) {
    return "invalid-email";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function normalizeTrialEmail(email: string) {
  const normalizedEmail = normalizeEmailBase(email);
  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) {
    return normalizedEmail;
  }

  if (domain !== "gmail.com" && domain !== "googlemail.com") {
    return normalizedEmail;
  }

  const withoutPlusTag = localPart.split("+")[0] ?? localPart;
  return `${withoutPlusTag.replace(/\./g, "")}@gmail.com`;
}

export function hashTrialClaimValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  return createHash("sha256").update(normalizedValue).digest("hex");
}

export function getClientIpFromHeaders(headers: HeaderReader) {
  const forwardedFor = headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    forwardedIp ||
    headers.get("x-vercel-forwarded-for")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

export function getTrialClaimFingerprint(headers: HeaderReader) {
  return {
    ipHash: hashTrialClaimValue(getClientIpFromHeaders(headers)),
    userAgentHash: hashTrialClaimValue(headers.get("user-agent")),
  };
}

export async function hasTrialClaimForEmail(email: string) {
  const normalizedEmail = normalizeTrialEmail(email);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("trial_claims")
    .select("id")
    .eq("normalized_email", normalizedEmail)
    .limit(1);

  if (error) {
    console.error("[trial_claims] Failed to check trial claim:", error.message);
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function recordTrialClaim(input: TrialClaimInput): Promise<TrialClaimResult> {
  const normalizedEmail = normalizeTrialEmail(input.email);

  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("trial_claims").insert({
      user_id: input.userId,
      email: normalizeEmailBase(input.email),
      normalized_email: normalizedEmail,
      ip_hash: input.ipHash ?? null,
      user_agent_hash: input.userAgentHash ?? null,
      stripe_customer_id: input.stripeCustomerId ?? null,
    });

    if (error) {
      if (error.code === "23505") {
        console.log("[trial_claims] Trial claim already exists", {
          email: maskEmailForLogs(normalizedEmail),
        });

        return {
          success: true,
          created: false,
        };
      }

      console.error("[trial_claims] Failed to record trial claim:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }

    console.log("[trial_claims] Trial claim recorded", {
      email: maskEmailForLogs(normalizedEmail),
    });

    return {
      success: true,
      created: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown trial claim error";
    console.error("[trial_claims] Failed to initialize trial claim recording:", message);
    return {
      success: false,
      message,
    };
  }
}
