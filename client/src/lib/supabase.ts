import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let pending: Promise<SupabaseClient> | undefined;
export function getSupabase(): Promise<SupabaseClient> {
  return pending ??= (async () => {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Autenticação indisponível. A configuração do Supabase precisa ser verificada.");
    const config = await response.json();
    return createClient(config.url, config.publishableKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  })().catch(error => { pending = undefined; throw error; });
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`;