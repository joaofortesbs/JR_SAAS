import { expect, test, type Page } from "@playwright/test";
import { createStudyFixture, fixtureUserId } from "./study-fixture";

// Auth and tRPC are explicitly test-only fixtures. These tests exercise the
// browser integration and UI contract, not a real Supabase identity/database.
const fixtureUser = {
  id: fixtureUserId,
  aud: "authenticated", role: "authenticated",
  email: "navigation@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z",
  confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { name: "Teste de navegação" },
  identities: [], is_anonymous: false,
};

async function installAuthFixture(page: Page) {
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
    return route.fulfill({ status: 400, json: { message: "Unexpected test-only auth request" } });
  });
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(fixtureUser.email);
  await page.locator("#auth-password").fill("test-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
}

async function showSidebar(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  return page.getByRole("complementary", { name: "Navegação da Central JR" });
}

test("login, real study snapshot fixture, navigation and logout work on desktop and mobile", async ({ page, isMobile }) => {
  const fixture = createStudyFixture();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.name));
  await installAuthFixture(page);
  await fixture.install(page);
  await signIn(page);

  await expect(page.getByText("Leitura confirmada; realtime desconectado.", { exact: true })).toBeVisible();
  await expect(page.getByText("Armazenamento ainda não conectado", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(fixture.calls.some(call => call.type === "snapshot" && call.ownerId === fixtureUserId)).toBe(true);

  const sidebar = await showSidebar(page, isMobile);
  await sidebar.getByRole("button", { name: "Minha conta", exact: true }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("heading", { name: fixtureUser.user_metadata.name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Início Voltar ao Painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  const nav = await showSidebar(page, isMobile);
  await nav.getByRole("button", { name: "Provas Prazos e objetivos" }).click();
  await expect(page).toHaveURL(/\/provas$/);
  await expect(page.getByRole("heading", { name: "Provas", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nova prova" })).toBeEnabled();
  await page.getByRole("button", { name: "Nova prova" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  const backToPanel = await showSidebar(page, isMobile);
  await backToPanel.getByRole("button", { name: "Painel Visão geral" }).click();

  for (const [buttonName, path, heading] of [
    ["Abrir Flows.", "/flows", "Flows"],
    ["Abrir Redações.", "/redacoes", "Redações"],
    ["Abrir Rotina.", "/rotina", "Minha rotina"],
  ]) {
    await page.getByRole("button", { name: new RegExp(buttonName) }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    const returnNav = await showSidebar(page, isMobile);
    await returnNav.getByRole("button", { name: "Painel Visão geral" }).click();
  }

  await page.goto("/");
  await expect(page).toHaveURL(/\/painel$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
  expect(fixture.calls.filter(call => call.type === "snapshot").every(call => call.ownerId === fixtureUserId)).toBe(true);

  const navAgain = await showSidebar(page, isMobile);
  await navAgain.getByRole("button", { name: "Tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  if (isMobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeFocused();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const logoutNav = await showSidebar(page, isMobile);
  await logoutNav.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
  expect(fixture.calls.every(call => call.type !== "mutation" || call.ownerId === fixtureUserId)).toBe(true);
  expect(errors).toEqual([]);
});

test("exam create, read, update, delete and reload persist through the controlled RPC fixture", async ({ page }) => {
  const fixture = createStudyFixture();
  await installAuthFixture(page);
  await fixture.install(page);
  await signIn(page);
  await page.goto("/provas");

  await page.getByRole("button", { name: "Nova prova" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Nome da prova (ex.: ENEM 2026)").fill("UFPR 2027");
  await dialog.getByPlaceholder("Instituição (ex.: INEP)").fill("Universidade Federal do Paraná");
  await dialog.getByLabel("Prazo").fill("2027-11-20");
  await dialog.getByRole("button", { name: "Adicionar prova" }).click();
  await expect(page.getByRole("heading", { name: "UFPR 2027", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "UFPR 2027", exact: true })).toBeVisible();

  const createdCard = page.locator(".exam-grid-card").filter({ has: page.getByRole("heading", { name: "UFPR 2027", exact: true }) });
  await createdCard.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByPlaceholder("Nome da prova (ex.: ENEM 2026)").fill("UFPR 2027 — segunda fase");
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "UFPR 2027 — segunda fase", exact: true })).toBeVisible();

  const updatedCard = page.locator(".exam-grid-card").filter({ has: page.getByRole("heading", { name: "UFPR 2027 — segunda fase", exact: true }) });
  await updatedCard.getByRole("button", { name: "Excluir" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Excluir prova" }).click();
  await expect(page.getByRole("heading", { name: "UFPR 2027 — segunda fase", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "UFPR 2027 — segunda fase", exact: true })).toHaveCount(0);

  const examCalls = fixture.calls.filter(call => call.type === "mutation" && call.operation.startsWith("exams."));
  expect(examCalls.map(call => call.operation)).toEqual(["exams.create", "exams.update", "exams.delete"]);
  expect(examCalls.every(call => call.ownerId === fixtureUserId && Boolean(call.requestId))).toBe(true);
});

test("snapshot error is explicit and retry re-reads the account fixture", async ({ page }) => {
  const fixture = createStudyFixture();
  fixture.setSnapshotFailures(1);
  await installAuthFixture(page);
  await fixture.install(page);
  await signIn(page);
  await expect(page.getByRole("alert").filter({ hasText: "Estudos não sincronizados." })).toBeVisible();
  await expect(page.getByText("ENEM 2026", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tentar sincronizar" }).click();
  await expect(page.getByText("Leitura confirmada; realtime desconectado.", { exact: true })).toBeVisible();
  expect(fixture.calls.filter(call => call.type === "snapshot").length).toBeGreaterThanOrEqual(2);
});

test("dirty essay preserves its draft and the revision captured before a remote update", async ({ page, isMobile }) => {
  const fixture = createStudyFixture();
  await installAuthFixture(page);
  await fixture.install(page);
  await signIn(page);
  await page.goto("/redacoes/31");
  const editor = page.getByRole("textbox", { name: "Texto da redação" });
  await expect(editor).toContainText("Texto confirmado anteriormente.");
  await editor.fill("Rascunho local que precisa ser preservado.");
  fixture.setEssayRevision(31, 2, "<p>Uma edição mais recente em outro dispositivo.</p>");

  const nav = await showSidebar(page, isMobile);
  await nav.getByRole("button", { name: "Provas Prazos e objetivos" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "mudou em outro dispositivo" })).toBeVisible();
  await expect(editor).toContainText("Rascunho local que precisa ser preservado.");
  const autosave = fixture.calls.find(call => call.type === "mutation" && call.operation === "essays.autosave");
  expect(autosave?.ownerId).toBe(fixtureUserId);
  expect(autosave?.expectedRevision).toBe(1);
  expect(page.url()).toMatch(/\/redacoes\/31$/);
});

test("pausing a running Flow uses the server revision and freezes the confirmed timer", async ({ page }) => {
  const fixture = createStudyFixture();
  fixture.startRunningFlow();
  await installAuthFixture(page);
  await fixture.install(page);
  await signIn(page);
  await page.goto("/flows");
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  const timer = page.locator(".timer-display > span");
  await expect(timer).toContainText(/^00:03:/);
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByText("pausado nesta sessão", { exact: true })).toBeVisible();
  const pausedTime = await timer.textContent();
  await page.waitForTimeout(1100);
  await expect(timer).toHaveText(pausedTime ?? "");

  const pauseCall = fixture.calls.find(call => call.type === "mutation" && call.operation === "flows.pause");
  expect(pauseCall?.ownerId).toBe(fixtureUserId);
  expect(pauseCall?.expectedRevision).toBe(4);
  expect(fixture.state.sessions[0].status).toBe("paused");
  expect(fixture.state.sessions[0].actualMinutes).toBeNull();
  expect(fixture.state.periods[0].elapsedMs).toBeGreaterThan(0);
});
