import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "@shared/auth";
import { authMessage } from "@shared/auth";
import { getSupabase } from "@/lib/supabase";

type AuthState = {
  user: Account | null; loading: boolean; error: string | null;
  recovery: boolean; callbackStatus: "idle" | "success" | "error";
  logout: () => Promise<void>; refresh: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<AuthState["callbackStatus"]>("idle");
  const identity = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const accept = (next: Session | null) => {
      if (!active) return;
      if (identity.current !== (next?.user.id ?? null)) {
        void cache.cancelQueries();
        cache.clear();
        setRecovery(false);
      }
      identity.current = next?.user.id ?? null;
      setSession(next);
    };
    void (async () => {
      const url = new URL(window.location.href);
      const callback = url.pathname === "/auth/callback";
      const code = url.searchParams.get("code");
      const flowId = url.searchParams.get("sb_flow_id");
      const tokenHash = url.searchParams.get("token_hash");
      const otpType = url.searchParams.get("type");
      const badLink = url.searchParams.has("error") || url.hash.includes("error=");
      // Remove all callback material before rendering, and never log it.
      if (callback) window.history.replaceState(null, "", "/auth/callback");
      try {
        const client = await getSupabase();
        const { data: subscription } = client.auth.onAuthStateChange((event, next) => {
          accept(next);
          if (event === "PASSWORD_RECOVERY" && active) setRecovery(true);
        });
        unsubscribe = () => subscription.subscription.unsubscribe();
        if (callback) {
          if (badLink || (!code && !tokenHash)) throw { code: "otp_expired" };
          // Token-hash templates support other browsers. PKCE remains the default.
          if (tokenHash && otpType !== "email" && otpType !== "signup" && otpType !== "recovery") throw { code: "otp_expired" };
          const { data, error: exchangeError } = tokenHash
            ? await client.auth.verifyOtp({ token_hash: tokenHash, type: otpType as "email" | "signup" | "recovery" })
            : await client.auth.exchangeCodeForSession(code!, flowId ? { flowId } : undefined);
          if (exchangeError || !data.session) throw exchangeError ?? { code: "otp_expired" };
          const { error: verifyError } = await client.auth.getUser(data.session.access_token);
          if (verifyError) throw verifyError;
          accept(data.session);
          if (active) {
            // PKCE recovery is emitted by the SDK from its stored verifier,
            // not from an untrusted query parameter.
            if (tokenHash) setRecovery(otpType === "recovery");
            setCallbackStatus("success");
          }
        } else {
          const { data, error: sessionError } = await client.auth.getSession();
          if (sessionError) throw sessionError;
          if (data.session) {
            const { data: verified, error: verifyError } = await client.auth.getUser(data.session.access_token);
            if (verifyError) throw verifyError;
            if (!verified.user?.email_confirmed_at || verified.user.is_anonymous) throw { code: "email_not_confirmed" };
          }
          accept(data.session);
        }
      } catch (e) {
        if (callback) {
          try { await (await getSupabase()).auth.signOut({ scope: "local" }); } catch {}
        }
        accept(null);
        if (active) {
          setError(e instanceof Error && e.message.startsWith("Autenticação indisponível") ? e.message : authMessage(e));
          if (callback) setCallbackStatus("error");
        }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, [cache]);
  const logout = async () => {
    const client = await getSupabase();
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null); setRecovery(false); cache.clear();
  };
  const refresh = async () => {
    const { data, error: refreshError } = await (await getSupabase()).auth.getSession();
    if (refreshError) throw refreshError;
    setSession(data.session);
  };
  const raw = session?.user;
  const user: Account | null = raw ? {
    id: raw.id, email: raw.email ?? null,
    name: typeof raw.user_metadata?.name === "string" ? raw.user_metadata.name : null,
    role: "user",
  } : null;
  return <Context.Provider value={{ user, loading, error, recovery, callbackStatus, logout, refresh }}>{children}</Context.Provider>;
}
export function useAuthContext() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}