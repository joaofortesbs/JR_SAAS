import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { authenticateRequest, publicAuthConfig } from "./_core/supabase";
import { authMessage, validateAccess } from "../shared/auth";
import type { TrpcContext } from "./_core/context";

const getUser = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn(() => ({ auth: { getUser } })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
const account = { id: "11111111-1111-4111-8111-111111111111", email: "test@example.com", name: "Estudante", role: "user" as const };
const ctx = (user: TrpcContext["user"]): TrpcContext => ({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  getUser.mockResolvedValue({ data: { user: { ...account, email_confirmed_at: "2026-01-01", user_metadata: { name: "Estudante", role: "admin" } } }, error: null });
});
describe("Auth-only API boundaries", () => {
  it("rejects absent, malformed and legacy cookie tokens without contacting Supabase", async () => {
    for (const headers of [{}, { cookie: "app_session_id=old" }, { authorization: "Basic abc" }, { authorization: "Bearer bad token" }]) {
      expect(await authenticateRequest({ headers })).toBeNull();
    }
    expect(createClient).not.toHaveBeenCalled();
  });
  it("verifies the token remotely and keeps UUID and least privilege", async () => {
    expect(await authenticateRequest({ headers: { authorization: "Bearer opaque.jwt.token" } })).toEqual(account);
    expect(getUser).toHaveBeenCalledWith("opaque.jwt.token");
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_test", expect.objectContaining({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }));
  });
  it.each(["expired", "tampered", "invalid"])("rejects %s tokens", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect(await authenticateRequest({ headers: { authorization: "Bearer rejected.jwt" } })).toBeNull();
  });
  it("isolates concurrent account validations", async () => {
    getUser.mockImplementation(async (token: string) => ({
      data: { user: { id: token === "a" ? account.id : "22222222-2222-4222-8222-222222222222", email_confirmed_at: "2026-01-01" } }, error: null,
    }));
    const [a, b] = await Promise.all(["a", "b"].map(token => authenticateRequest({ headers: { authorization: `Bearer ${token}` } })));
    expect(a?.id).not.toBe(b?.id);
    expect(createClient).toHaveBeenCalledTimes(2);
  });
  it("distinguishes auth network failures from invalid credentials", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
    await expect(authenticateRequest({ headers: { authorization: "Bearer a" } })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
  it("requires confirmed nonanonymous UUID accounts", async () => {
    for (const user of [{ id: "1", email_confirmed_at: "yes" }, { id: account.id }, { id: account.id, email_confirmed_at: "yes", is_anonymous: true }]) {
      getUser.mockResolvedValue({ data: { user }, error: null });
      expect(await authenticateRequest({ headers: { authorization: "Bearer a" } })).toBeNull();
    }
  });
  it("rejects every domain endpoint unauthenticated, and explicitly gates authenticated calls", async () => {
    // All registered queries/mutations including uploads' old tRPC names.
    for (const [path, procedure] of Object.entries(appRouter._def.procedures)) {
      if (path === "system.health") continue;
      const invoke = (user: TrpcContext["user"]) => procedure({
        ctx: ctx(user), path, type: procedure._def.type, getRawInput: async () => undefined,
        signal: undefined, batchIndex: 0,
      });
      await expect(invoke(null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      if (path !== "auth.me") await expect(invoke(account)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "STUDY_PERSISTENCE_UNAVAILABLE" });
    }
    expect(await appRouter.createCaller(ctx(account)).auth.me()).toEqual(account);
  });
});
describe("Public configuration and field messages", () => {
  it("only exposes the two validated public settings", () => {
    expect(publicAuthConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", SESSION_SECRET: "never-return" })).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_test" });
    for (const key of ["sb_secret_test", "eyJservice_role", ""]) expect(publicAuthConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
    for (const url of ["http://example.supabase.co", "https://user:password@example.com", "https://example.com/?token=bad", "not-url"]) expect(publicAuthConfig({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" })).toBeNull();
  });
  it("validates fields without accepting account creation as authorization", () => {
    expect(validateAccess({ name: "A", email: "invalid", password: "short", confirmation: "other" }, "register")).toHaveProperty("confirmation");
    expect(validateAccess({ name: "Ana", email: "a@example.com", password: "strong-password", confirmation: "strong-password" }, "register")).toEqual({});
    expect(validateAccess({ email: "a@example.com", password: "" }, "login")).toHaveProperty("password");
  });
  it("maps safe actionable error messages without leaking raw payloads", () => {
    for (const error of [{ code: "invalid_credentials" }, { code: "email_not_confirmed" }, { status: 429 }, { code: "otp_expired" }, new TypeError("secret-password")]) {
      expect(authMessage(error)).not.toContain("secret-password");
    }
    expect(authMessage({ code: "email_not_confirmed" })).toContain("Confirme");
    expect(authMessage({ status: 429 })).toContain("Aguarde");
  });
});