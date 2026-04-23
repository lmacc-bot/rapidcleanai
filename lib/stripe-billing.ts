import "server-only";
import { isValidEmail } from "@/lib/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type UpdateBillingAccessByEmailInput = {
  email: string;
  paymentStatus: string;
  hasAccess: boolean;
  plan?: string;
};

type UpdateBillingAccessByEmailResult =
  | {
      success: true;
      updated: boolean;
    }
  | {
      success: false;
      updated: false;
      message: string;
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function maskEmailForLogs(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) {
    return "invalid-email";
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - visibleLocal.length, 1))}@${domain}`;
}

export async function updateBillingAccessByEmail(
  input: UpdateBillingAccessByEmailInput,
): Promise<UpdateBillingAccessByEmailResult> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      updated: false,
      message: "Invalid billing email.",
    };
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: existingRow, error: selectError } = await supabase
      .from("billing_access")
      .select("user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (selectError) {
      return {
        success: false,
        updated: false,
        message: selectError.message,
      };
    }

    if (!existingRow) {
      return {
        success: true,
        updated: false,
      };
    }

    const updatePayload: {
      payment_status: string;
      has_access: boolean;
      plan?: string;
    } = {
      payment_status: input.paymentStatus,
      has_access: input.hasAccess,
    };

    if (input.plan) {
      updatePayload.plan = input.plan;
    }

    const { error: updateError } = await supabase
      .from("billing_access")
      .update(updatePayload)
      .eq("user_id", existingRow.user_id);

    if (updateError) {
      return {
        success: false,
        updated: false,
        message: updateError.message,
      };
    }

    return {
      success: true,
      updated: true,
    };
  } catch (error) {
    return {
      success: false,
      updated: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
