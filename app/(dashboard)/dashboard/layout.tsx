import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getBillingAccessStatus } from "@/lib/supabase/access";
import { signOutAction } from "@/lib/supabase/actions";
import { getServerUser } from "@/lib/supabase/auth";

function buildDashboardLoginHref(errorCode?: string) {
  const searchParams = new URLSearchParams({
    redirect: "/dashboard",
  });

  if (errorCode) {
    searchParams.set("error", errorCode);
  }

  return `/login?${searchParams.toString()}`;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let user: Awaited<ReturnType<typeof getServerUser>>["user"] = null;

  try {
    ({ user } = await getServerUser());
  } catch {
    redirect(buildDashboardLoginHref("auth_unavailable"));
  }

  if (!user) {
    redirect(buildDashboardLoginHref());
  }

  const access = await getBillingAccessStatus(user.id);

  if (!access.hasAccess) {
    redirect("/access-pending");
  }

  const displayName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : user.email;

  return (
    <div className="min-h-screen pb-16">
      <Navbar
        variant="dashboard"
        userName={displayName}
        userEmail={user.email}
        logoutAction={signOutAction}
      />
      <main className="container pt-10">{children}</main>
    </div>
  );
}
