import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();

  // getUser revalidates the auth token on the server. Do not swap this for getSession.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}
