import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

export class SupabaseConfigurationError extends Error {}
let configurationError: SupabaseConfigurationError | undefined;

function initializeSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    configurationError = new SupabaseConfigurationError(
      "Autenticação indisponível. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) no build."
    );
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  } catch {
    configurationError = new SupabaseConfigurationError(
      "Autenticação indisponível. Verifique VITE_SUPABASE_URL e a chave pública do Supabase."
    );
    return null;
  }
}

export const supabase = initializeSupabase();

// Preserve existing async callers without any configuration HTTP request.
export async function getSupabase(): Promise<SupabaseClient> {
  if (!supabase) throw configurationError;
  return supabase;
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`;