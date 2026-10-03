import { expect, test } from "@playwright/test";

// TEST-ONLY network fixtures verify routing with the real browser SDK.
// This is NOT evidence of successful authentication against external Supabase.
const fixtureUser = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated", role: "authenticated",
  email: "navigation@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z",
  confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { name: "Teste de navegação" },
  identities: [], is_anonymous: false,
};
test("login enters Painel; sidebar and account navigation work; logout protects routes", async ({ page, isMobile }) => {
  const forbidden: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.name));
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/trpc/")) forbidden.push(new URL(request.url()).pathname);
  });
  await page.route("**/api/auth/config", route => route.fulfill({
    json: { url: "https://auth-navigation.example.invalid", publishableKey: "sb_publishable_navigation_test" },
  }));
  const timestamp = Math.floor(Date.now() / 1000);
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: fixtureUser.id, iat: timestamp, exp: timestamp + 3600, aud: "authenticated" })).toString("base64url"),
    "test-only-not-a-real-signature",
  ].join(".");
  await page.route("https://auth-navigation.example.invalid/auth/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/token")) return route.fulfill({ json: {
      access_token: token, refresh_token: "test-only-refresh", expires_in: 3600,
      expires_at: timestamp + 3600, token_type: "bearer", user: fixtureUser,
    } });
    if (path.endsWith("/user")) return route.fulfill({ json: fixtureUser });
    if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
    return route.fulfill({ status: 400, json: { message: "Unexpected test-only request" } });
  });
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(fixtureUser.email);
  await page.locator("#auth-password").fill("test-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Armazenamento ainda não conectado", { exact: true })).toBeVisible();
  await expect(page.locator(".account-profile-card")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/platform-${isMobile ? "mobile" : "desktop"}.png`, fullPage: true, animations: "disabled" });
  const sidebar = page.getByRole("complementary", { name: "Navegação da Central JR" });
  const openMenu = async () => {
    if (isMobile) await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  };
  await openMenu();
  await sidebar.getByRole("button", { name: "Minha conta", exact: true }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("heading", { name: fixtureUser.user_metadata.name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Início Voltar ao Painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await openMenu();
  await sidebar.getByRole("button", { name: "Provas Prazos e objetivos" }).click();
  await expect(page).toHaveURL(/\/provas$/);
  await expect(page.getByRole("heading", { name: "Provas", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar prova" })).toBeDisabled();
  await page.getByRole("link", { name: "Voltar ao Painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  for (const [buttonName, path, heading] of [
    ["Abrir Flows.", "/flows", "Flows"],
    ["Abrir Redações.", "/redacoes", "Redações"],
    ["Abrir Rotina.", "/rotina", "Minha rotina"],
  ]) {
    await page.getByRole("button", { name: new RegExp(buttonName) }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao Painel" }).click();
  }
  await page.goto("/");
  await expect(page).toHaveURL(/\/painel$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
  await openMenu();
  await sidebar.getByRole("button", { name: "Tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  if (isMobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeFocused();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await openMenu();
  await sidebar.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
  expect(forbidden).toEqual([]);
  expect(errors).toEqual([]);
});