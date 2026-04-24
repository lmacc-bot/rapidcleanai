import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DEFAULT_BILLING_PLAN, normalizeBillingPlan, type BillingPlanId } from "@/lib/stripe";

type BillingAccessRow = {
  has_access: boolean | null;
  payment_status: string | null;
  plan: string | null;
};

export type BillingAccessStatus = {
  hasAccess: boolean;
  paymentStatus: string | null;
  plan: string | null;
};

type CreatePendingBillingAccessInput = {
  userId: string;
  email: string;
  plan?: BillingPlanId;
};

type CreatePendingBillingAccessResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

const defaultBillingAccessStatus: BillingAccessStatus = {
  hasAccess: false,
  paymentStatus: null,
  plan: null,
};

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function getBillingAccessStatus(userId: string): Promise<BillingAccessStatus> {
  if (!userId) {
    return defaultBillingAccessStatus;
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("billing_access")
      .select("has_access, payment_status, plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[billing_access] Failed to read billing access row:", error.message);
      return defaultBillingAccessStatus;
    }

    const row = (data ?? null) as BillingAccessRow | null;

    if (!row) {
      return defaultBillingAccessStatus;
    }

    return {
      hasAccess: row.has_access === true,
      paymentStatus: normalizeNullableString(row.payment_status),
      plan: normalizeNullableString(row.plan),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[billing_access] Failed to initialize billing access client:", message);
    return defaultBillingAccessStatus;
  }
}

export async function createPendingBillingAccess(
  input: CreatePendingBillingAccessInput,
): Promise<CreatePendingBillingAccessResult> {
  try {
    const supabase = createAdminSupabaseClient();
    const selectedPlan = normalizeBillingPlan(input.plan ?? DEFAULT_BILLING_PLAN);
    const { error } = await supabase.from("billing_access").upsert(
      {
        user_id: input.userId,
        email: input.email,
        has_access: false,
        plan: selectedPlan,
        payment_status: "pending",
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
