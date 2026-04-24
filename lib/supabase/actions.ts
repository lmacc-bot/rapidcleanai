"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  DEFAULT_BILLING_PLAN,
  isBillingPlanId,
  normalizeBillingPlan,
} from "@/lib/stripe";
import { createPendingBillingAccess } from "@/lib/supabase/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  readFormField,
  validateLoginInput,
  validateSignupInput,
} from "@/lib/validation";

function withQuery(path: string, key: string, value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

function readSafeRedirect(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export async function signInAction(formData: FormData) {
  const parsed = validateLoginInput({
    email: readFormField(formData, "email"),
    password: readFormField(formData, "password"),
  });

  if (!parsed.success) {
    redirect(withQuery("/login", "error", parsed.code));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      redirect(withQuery("/login", "error", "invalid_credentials"));
    }
  } catch (error) {
    unstable_rethrow(error);
    redirect(withQuery("/login", "error", "auth_unavailable"));
  }

  revalidatePath("/", "layout");
  const redirectTo = readSafeRedirect(formData.get("redirectTo"));
  redirect(redirectTo ?? "/dashboard");
}

export async function signUpAction(formData: FormData) {
  const selectedPlanValue = formData.get("selectedPlan");
  const selectedPlan = normalizeBillingPlan(
    isBillingPlanId(selectedPlanValue) ? selectedPlanValue : DEFAULT_BILLING_PLAN,
  );

  const parsed = validateSignupInput({
    name: readFormField(formData, "name"),
    email: readFormField(formData, "email"),
    password: readFormField(formData, "password"),
  });

  if (!parsed.success) {
    redirect(withQuery("/signup", "error", parsed.code));
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.name,
        },
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        redirect(withQuery("/signup", "error", "email_taken"));
      }

      redirect(withQuery("/signup", "error", "signup_failed"));
    }

    const userId = data.user?.id;
    const signupEmail = data.user?.email ?? parsed.data.email;

    if (!userId) {
      console.error("[auth] Signup completed without a user id.");
      redirect(withQuery("/signup", "error", "signup_failed"));
    }

    const billingAccess = await createPendingBillingAccess({
      userId,
      email: signupEmail,
      plan: selectedPlan,
    });

    if (!billingAccess.success) {
      console.error("[auth] Failed to create billing access row after signup:", billingAccess.message);
      redirect(withQuery("/access-pending", "reason", "setup_issue"));
    }

    revalidatePath("/", "layout");

    if (!data.session) {
      redirect(withQuery("/login", "message", "signup_success_check_email"));
    }
  } catch (error) {
    unstable_rethrow(error);
    redirect(withQuery("/signup", "error", "auth_unavailable"));
  }

  redirect("/access-pending");
}

export async function signOutAction() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Sign-out failures should not expose implementation details to the user.
  }

  revalidatePath("/", "layout");
  redirect("/");
}
