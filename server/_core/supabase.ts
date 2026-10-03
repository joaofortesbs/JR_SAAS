import { createClient } from "@supabase/supabase-js";
import type { Account } from "../../shared/auth";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";

export function publicAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return { url: parsed.origin, publishableKey };
  } catch { return null; }
}

// A fresh stateless client for every request. Never accept legacy session cookies.
export async function authenticateRequest(req: Pick<Request, "headers">): Promise<Account | null> {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(header);
  if (!match || match[1].length > 8192) return null;
  const config = publicAuthConfig();
  if (!config) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "AUTH_UNAVAILABLE" });
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error) {
    if (error.status && error.status >= 500 || error.name === "AuthRetryableFetchError") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "AUTH_UNAVAILABLE" });
    }
    return null;
  }
  const user = data.user;
  if (!user || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) || !user.email_confirmed_at || user.is_anonymous) return null;
  return {
    id: user.id, email: user.email ?? null,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
    // No administrative permissions in this stage, regardless of editable metadata.
    role: "user",
  };
}