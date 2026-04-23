import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const { url, publicKey } = getSupabaseEnv();

  // This browser client must only ever use the public publishable/anon key.
  return createBrowserClient(url, publicKey);
}
