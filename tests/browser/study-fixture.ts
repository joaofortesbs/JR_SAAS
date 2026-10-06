import type { Page, Route } from "@playwright/test";
import superjson from "superjson";

export const fixtureUserId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-10-06T12:00:00.000Z");

function emptyState() {
  return {
    exams: [], topics: [], windows: [], commitments: [], blocks: [],
    sessions: [], essays: [], parts: [], versions: [], feedback: [], periods: [],
  };
}

export function createStudyFixture() {
  const state: any = emptyState();
  state.exams.push({
    id: 11, userId: fixtureUserId, name: "ENEM 2026", institution: "INEP",
    date: "2026-11-08", priority: "principal", status: "active", phase: "Prova principal",
    color: "mint", notes: "", revision: 1, createdAt: now, updatedAt: now,
  });
  state.essays.push({
    id: 31, userId: fixtureUserId, title: "Mobilidade urbana", theme: "Desafios no Brasil",
    currentText: "<p>Texto confirmado anteriormente.</p>", status: "draft", bank: "ENEM",
    source: "editor", examId: null, totalScore: null, revision: 1, createdAt: now, updatedAt: now,
  });
  state.versions.push({
    id: 41, userId: fixtureUserId, essayId: 31, versionNumber: 1,
    text: "<p>Texto confirmado anteriormente.</p>", snapshot: {}, origin: "editor", createdAt: now,
  });

  const calls: Array<Record<string, any>> = [];
  const idempotentResults = new Map<string, unknown>();
  let nextExamId = 12;
  let nextEssayId = 32;
  let nextVersionId = 42;
  let nextBlockId = 51;
  let nextSessionId = 61;
  let nextPeriodId = 71;
  let snapshotFailures = 0;

  const serverError = (path: string, code: string, message: string, status: number) => ({
    status,
    body: {
      error: {
        json: {
          message,
          code: code === "CONFLICT" ? -32009 : code === "FORBIDDEN" ? -32003 : -32603,
          data: { code, httpStatus: status, path },
        },
      },
    },
  });

  const parseInput = (raw: any, index: number) => {
    const wrapped = raw?.[String(index)] ?? raw;
    if (wrapped && typeof wrapped === "object" && "json" in wrapped) {
      try { return superjson.deserialize(wrapped); } catch { return wrapped.json; }
    }
    return wrapped;
  };

  const applyMutation = (input: any) => {
    if (!input || input.ownerId !== fixtureUserId) return serverError("study.mutate", "FORBIDDEN", "A conta ativa mudou.", 403);
    calls.push({ type: "mutation", ...input });
    if (idempotentResults.has(input.requestId)) return { status: 200, value: idempotentResults.get(input.requestId) };
    const p = input.payload ?? {};
    let result: any = { success: true };
    switch (input.operation) {
      case "planning.generate":
      case "planning.updateStatus":
      case "resources.create":
      case "resources.update":
      case "resources.delete":
        return serverError("study.mutate", "NOT_FOUND", "Este módulo foi removido.", 404);
      case "exams.create": {
        const id = nextExamId++;
        state.exams.push({ id, userId: fixtureUserId, ...p, status: "active", revision: 1, createdAt: new Date(), updatedAt: new Date() });
        result = { id, revision: 1 };
        break;
      }
      case "exams.update": {
        const row = state.exams.find((item: any) => item.id === p.id);
        if (row) Object.assign(row, p, { revision: row.revision + 1, updatedAt: new Date() });
        result = { id: p.id, revision: row?.revision };
        break;
      }
      case "exams.close": {
        const row = state.exams.find((item: any) => item.id === p.id);
        if (row) Object.assign(row, { status: p.status ?? "completed", revision: row.revision + 1 });
        result = { id: p.id, revision: row?.revision };
        break;
      }
      case "exams.delete":
        state.exams = state.exams.filter((row: any) => row.id !== p.id);
        result = { success: true, id: p.id };
        break;
      case "essays.create": {
        const id = nextEssayId++;
        state.essays.push({ id, userId: fixtureUserId, ...p, currentText: "", status: "draft", revision: 1, createdAt: new Date(), updatedAt: new Date() });
        result = { id, revision: 1 };
        break;
      }
      case "essays.autosave":
      case "essays.save": {
        const essay = state.essays.find((row: any) => row.id === p.id);
        if (!essay) return serverError("study.mutate", "NOT_FOUND", "Redação não encontrada.", 404);
        if (input.expectedRevision !== essay.revision) return serverError("study.mutate", "CONFLICT", "Este registro mudou em outro dispositivo. Seu rascunho foi preservado.", 409);
        Object.assign(essay, p, { revision: essay.revision + 1, updatedAt: new Date() });
        let versionNumber = 0;
        if (input.operation === "essays.save") {
          versionNumber = state.versions.filter((row: any) => row.essayId === essay.id).length + 1;
          state.versions.push({
            id: nextVersionId++, userId: fixtureUserId, essayId: essay.id, versionNumber,
            text: essay.currentText, snapshot: { essay: { ...essay }, parts: state.parts.filter((row: any) => row.essayId === essay.id) },
            origin: "editor", createdAt: new Date(),
          });
        }
        result = { id: essay.id, saved: true, revision: essay.revision, versionNumber };
        break;
      }
      case "essays.restoreVersion": {
        const essay = state.essays.find((row: any) => row.id === p.id);
        if (!essay || input.expectedRevision !== essay.revision) return serverError("study.mutate", "CONFLICT", "Este registro mudou em outro dispositivo.", 409);
        const version = state.versions.find((row: any) => row.id === p.versionId && row.essayId === essay.id);
        if (version) essay.currentText = version.text;
        essay.revision += 1;
        result = { id: essay.id, saved: true, revision: essay.revision };
        break;
      }
      case "flows.pause": {
        const session = state.sessions.find((row: any) => row.id === p.id);
        if (!session || input.expectedRevision !== session.revision) return serverError("study.mutate", "CONFLICT", "O Flow mudou em outro dispositivo.", 409);
        const endedAt = new Date();
        const startedAt = new Date(session.lastResumedAt);
        const elapsedMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
        session.accumulatedSeconds = (session.accumulatedSeconds ?? 0) + elapsedMs / 1000;
        session.actualMinutes = null;
        session.status = "paused";
        session.lastResumedAt = null;
        session.revision += 1;
        const period = state.periods.find((row: any) => row.sessionId === session.id && row.endedAt === null);
        if (period) { period.endedAt = endedAt; period.elapsedMs = elapsedMs; }
        result = { id: session.id, revision: session.revision, actualMinutes: null };
        break;
      }
      default:
        result = { success: true, id: p.id };
    }
    idempotentResults.set(input.requestId, result);
    return { status: 200, value: result };
  };

  const install = async (page: Page) => {
    await page.route("**/api/trpc/**", async (route: Route) => {
      const url = new URL(route.request().url());
      const paths = url.pathname.replace(/^.*\/api\/trpc\//, "").split(",");
      let raw: any = {};
      try {
        const value = route.request().method() === "GET" ? url.searchParams.get("input") : route.request().postData();
        raw = value ? JSON.parse(value) : {};
      } catch { raw = {}; }
      const responses = paths.map((path, index) => {
        const input = parseInput(raw, index);
        if (path === "study.snapshot") {
          calls.push({ type: "snapshot", ...(input ?? {}) });
          if (!input || input.ownerId !== fixtureUserId) return serverError(path, "FORBIDDEN", "A conta ativa mudou.", 403);
          if (snapshotFailures > 0) {
            snapshotFailures -= 1;
            return serverError(path, "SERVICE_UNAVAILABLE", "Supabase indisponível no fixture.", 503);
          }
          return { status: 200, value: { state, serverNow: new Date() } };
        }
        if (path === "study.mutate") return applyMutation(input);
        return serverError(path, "NOT_FOUND", `RPC inesperado no fixture: ${path}`, 404);
      });
      const status = Math.max(...responses.map(response => response.status));
      const body = responses.map(response => "body" in response
        ? response.body
        : { result: { data: superjson.serialize(response.value) } });
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    });
  };

  return {
    state,
    calls,
    install,
    setSnapshotFailures: (count: number) => { snapshotFailures = count; },
    setEssayRevision: (id: number, revision: number, text?: string) => {
      const essay = state.essays.find((row: any) => row.id === id);
      if (essay) { essay.revision = revision; if (text) essay.currentText = text; }
    },
    startRunningFlow: () => {
      const startedAt = new Date(Date.now() - 65_000);
      state.blocks.push({
        id: nextBlockId, userId: fixtureUserId, examId: 11, essayId: null, title: "Revisar conteúdos",
        kind: "exam", date: "2026-10-06", startTime: "08:00", endTime: "09:00", durationMinutes: 60,
        reason: "Revisão", minimumVersion: "25 minutos", status: "in_progress", revision: 1,
        createdAt: now, updatedAt: now,
      });
      state.sessions.push({
        id: nextSessionId, userId: fixtureUserId, blockId: nextBlockId, status: "running",
        startedAt, lastResumedAt: startedAt, accumulatedSeconds: 120, actualMinutes: null,
        revision: 4, createdAt: startedAt, updatedAt: startedAt,
      });
      state.periods.push({
        id: nextPeriodId++, userId: fixtureUserId, sessionId: nextSessionId,
        startedAt, endedAt: null, elapsedMs: null, createdAt: startedAt,
      });
    },
  };
}

