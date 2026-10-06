import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("static SPA Supabase initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "https://auth-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("initializes a singleton with public build variables and no config request", async () => {
    const { supabase, getSupabase } = await import("./supabase");
    expect(supabase).not.toBeNull();
    expect(await getSupabase()).toBe(supabase);
    expect(await getSupabase()).toBe(supabase);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"])("reports missing %s without crashing the module", async name => {
    vi.stubEnv(name, " ");
    const { supabase, getSupabase, SupabaseConfigurationError } = await import("./supabase");
    expect(supabase).toBeNull();
    await expect(getSupabase()).rejects.toBeInstanceOf(SupabaseConfigurationError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("supports the legacy public anon-key variable", async () => {
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-test-anon-key");
    const { getSupabase, supabaseKey } = await import("./supabase");
    expect(supabaseKey).toBe("public-test-anon-key");
    expect(await getSupabase()).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports an invalid URL as a configuration error instead of crashing the SPA", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "invalid-url");
    const { getSupabase, SupabaseConfigurationError } = await import("./supabase");
    await expect(getSupabase()).rejects.toBeInstanceOf(SupabaseConfigurationError);
  });
});
