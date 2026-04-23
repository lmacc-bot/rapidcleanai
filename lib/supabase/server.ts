import { cookies } from "next/headers";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";

type CookieToSet = Parameters<NonNullable<SetAllCookies>>[0][number];

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publicKey } = getSupabaseEnv();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes from server components can be ignored safely here.
        }
      },
    },
  });
}
