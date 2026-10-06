import { z } from "zod";
import { emptyStudyState, safeEssayHtml, type StudyState } from "./study-types";
import { elapsedSeconds, dailyFlowSeries } from "../../../server/flow";
import { addMinutesToTime, generateStudyPlan } from "../../../server/planning";

const id = z.number().int().positive();
const byId = z.object({ id });
const text = z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(180);
const note = z.string().max(10000).optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.");
const priority = z.enum(["principal", "alta", "media", "baixa"]);
const color = z.enum(["blue", "pink", "mint", "orange", "yellow"]);
const examInput = z.object({ name: text, institution: text, date, priority: priority.default("alta"), phase: text.default("Prova principal"), color: z.string().default("mint"), notes: note });
const topicInput = z.object({ name: text, subject: text, weight: z.number().int().min(1).max(5).default(3) });
const windowInput = z.object({ weekday: z.number().int().min(0).max(6), startTime: time, endTime: time, maxMinutes: z.number().int().min(15).max(600), preference: z.string().max(100).optional() });
const commitmentInput = z.object({ title: text, weekday: z.number().int().min(0).max(6), startTime: time, endTime: time, kind: z.string().max(40).default("commitment") });
const essayInput = z.object({ title: text, theme: note, bank: z.string().max(80).default("ENEM"), source: z.enum(["editor", "upload"]).default("editor"), examId: id.optional() });
const essaySave = z.object({ id, title: text, theme: note, currentText: z.string().max(1000000), status: z.enum(["draft", "submitted_for_review", "feedback_received", "revision_needed", "revised"]).optional() });
const resourceInput = z.object({ title: text, type: z.string().max(40).default("link"), url: z.string().max(4000).optional(), source: z.string().max(120).optional(), subject: z.string().max(100).optional(), durationMinutes: z.number().int().min(5).max(600).default(50) });
type Row<K extends keyof StudyState> = StudyState[K][number];
type Fields<K extends keyof StudyState> = Omit<Row<K>, "id" | "userId" | "createdAt">;
const minute = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

/** An isolated session workspace. No network, browser storage, or seed data. */
export class StudyStore {
  private state = emptyStudyState();
  private nextId = 1;
  private revision = 0;
  private listeners = new Set<() => void>();
  constructor(readonly ownerId: string) {}
  getSnapshot = () => this.state;
  getRevision = () => this.revision;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  clear = () => { this.state = emptyStudyState(); this.nextId = 1; this.publish(); };
  private publish() { this.revision++; this.listeners.forEach(listener => listener()); }
  private add<K extends keyof StudyState>(key: K, fields: Fields<K>): Row<K> {
    const row = { ...fields, id: this.nextId++, userId: this.ownerId, createdAt: new Date() } as Row<K>;
    this.state = { ...this.state, [key]: [...this.state[key], row] };
    this.publish();
    return row;
  }
  private find<K extends keyof StudyState>(key: K, recordId: number): Row<K> {
    const row = this.state[key].find(value => value.id === recordId);
    if (!row) throw new Error("Este item não existe nesta sessão temporária.");
    return row;
  }
  private update<K extends keyof StudyState>(key: K, recordId: number, patch: Partial<Fields<K>>) {
    this.find(key, recordId);
    this.state = { ...this.state, [key]: this.state[key].map(row =>
      row.id === recordId ? { ...row, ...patch, ...("updatedAt" in row ? { updatedAt: new Date() } : {}) } : row) };
    this.publish();
    return { success: true };
  }
  private remove<K extends keyof StudyState>(key: K, recordId: number) {
    this.find(key, recordId);
    this.state = { ...this.state, [key]: this.state[key].filter(row => row.id !== recordId) };
    this.publish();
    return { success: true };
  }
  private schedule(weekday: number, startTime: string, endTime: string, ignoreId?: number) {
    if (minute(endTime) <= minute(startTime)) throw new Error("O horário final precisa ser depois do inicial.");
    if ([...this.state.windows, ...this.state.commitments].some(row => row.id !== ignoreId &&
      row.weekday === weekday && minute(startTime) < minute(row.endTime) && minute(endTime) > minute(row.startTime))) {
      throw new Error("Este horário se sobrepõe a outro item da rotina.");
    }
  }
  private active() { return this.state.sessions.find(row => row.status === "running" || row.status === "paused"); }
  private ensureNoActive() { if (this.active()) throw new Error("ACTIVE_FLOW: finalize ou cancele seu Flow atual antes de começar outro."); }
  private saveEssay(input: z.input<typeof essaySave>, version: boolean) {
    const value = essaySave.parse(input);
    this.find("essays", value.id);
    const html = safeEssayHtml(value.currentText);
    this.update("essays", value.id, { title: value.title, theme: value.theme ?? null, currentText: html, ...(value.status ? { status: value.status } : {}) });
    if (!version) return { saved: true, versionNumber: 0 };
    const versionNumber = Math.max(0, ...this.state.versions.filter(row => row.essayId === value.id).map(row => row.versionNumber)) + 1;
    this.add("versions", { essayId: value.id, versionNumber, text: html, origin: "editor" });
    return { saved: true, versionNumber };
  }

  queries = {
    dashboard: () => this.state,
    exams: {
      list: () => this.state.exams,
      detail: (input: { id: number }) => ({ exam: this.state.exams.find(row => row.id === input.id), topics: this.state.topics.filter(row => row.examId === input.id), blocks: this.state.blocks.filter(row => row.examId === input.id), essays: this.state.essays.filter(row => row.examId === input.id) }),
      topics: (input?: { examId?: number }) => this.state.topics.filter(row => input?.examId === undefined || row.examId === input.examId),
    },
    routine: { list: () => ({ windows: this.state.windows, commitments: this.state.commitments }) },
    planning: {
      list: () => this.state.blocks,
      detail: (input: { id: number }) => {
        const block = this.state.blocks.find(row => row.id === input.id);
        return { block, exam: this.state.exams.find(row => row.id === block?.examId), windows: this.state.windows };
      },
    },
    flows: {
      active: () => {
        const session = this.active();
        if (!session) return null;
        const block = this.state.blocks.find(row => row.id === session.blockId);
        return { session, block, exam: this.state.exams.find(row => row.id === block?.examId), elapsedSeconds: elapsedSeconds(session) };
      },
      series: (input?: { days?: number }) => dailyFlowSeries(this.state.sessions, Math.min(30, Math.max(2, input?.days ?? 7))),
    },
    resources: { list: () => this.state.resources },
    essays: {
      list: () => this.state.essays,
      detail: (input: { id: number }) => ({ essay: this.state.essays.find(row => row.id === input.id), parts: this.state.parts.filter(row => row.essayId === input.id).sort((a, b) => a.sortOrder - b.sortOrder), versions: this.state.versions.filter(row => row.essayId === input.id).sort((a, b) => b.versionNumber - a.versionNumber), feedback: this.state.feedback.filter(row => row.essayId === input.id) }),
    },
  };

  mutations = {
    exams: {
      create: (input: z.input<typeof examInput>) => {
        const value = examInput.parse(input);
        return { id: this.add("exams", { ...value, notes: value.notes ?? null, status: "active", updatedAt: new Date() }).id };
      },
      update: (input: z.input<typeof examInput> & { id: number }) => {
        byId.parse(input);
        const { color: _color, phase: _phase, ...value } = examInput.parse(input);
        return this.update("exams", input.id, { ...value, notes: value.notes ?? null });
      },
      close: (input: { id: number; status?: "completed" | "archived" }) => {
        const value = byId.extend({ status: z.enum(["completed", "archived"]).default("completed") }).parse(input);
        if (this.state.blocks.some(row => row.examId === value.id && this.active()?.blockId === row.id)) throw new Error("Finalize o Flow desta prova antes de encerrá-la.");
        return this.update("exams", value.id, { status: value.status });
      },
      delete: (input: { id: number }) => {
        byId.parse(input); this.find("exams", input.id);
        if (this.state.blocks.some(row => row.examId === input.id && this.active()?.blockId === row.id)) throw new Error("Finalize o Flow antes de excluir esta prova.");
        const ids = new Set(this.state.blocks.filter(row => row.examId === input.id).map(row => row.id));
        this.state = { ...this.state, topics: this.state.topics.filter(row => row.examId !== input.id), blocks: this.state.blocks.filter(row => row.examId !== input.id), sessions: this.state.sessions.filter(row => !ids.has(row.blockId)), essays: this.state.essays.map(row => row.examId === input.id ? { ...row, examId: null } : row) };
        return this.remove("exams", input.id);
      },
      createTopic: (input: z.input<typeof topicInput> & { examId: number }) => {
        const value = topicInput.extend({ examId: id }).parse(input); this.find("exams", value.examId);
        return { id: this.add("topics", { ...value, status: "not_started" }).id };
      },
      updateTopic: (input: z.input<typeof topicInput> & { id: number; status?: Row<"topics">["status"] }) => {
        const value = topicInput.extend({ id, status: z.enum(["not_started", "in_progress", "review", "needs_help", "done"]).optional() }).parse(input);
        const { id: recordId, ...patch } = value;
        return this.update("topics", recordId, patch);
      },
      deleteTopic: (input: { id: number }) => {
        byId.parse(input);
        this.state = { ...this.state, blocks: this.state.blocks.map(row => row.topicId === input.id ? { ...row, topicId: null } : row) };
        return this.remove("topics", input.id);
      },
    },
    routine: {
      addWindow: (input: z.input<typeof windowInput>) => {
        const value = windowInput.parse(input); this.schedule(value.weekday, value.startTime, value.endTime);
        if (value.maxMinutes > minute(value.endTime) - minute(value.startTime)) throw new Error("A capacidade excede o tempo disponível.");
        return { id: this.add("windows", { ...value, preference: value.preference ?? null, isActive: 1 }).id };
      },
      updateWindow: (input: z.input<typeof windowInput> & { id: number }) => {
        byId.parse(input); const value = windowInput.parse(input);
        this.schedule(value.weekday, value.startTime, value.endTime, input.id);
        if (value.maxMinutes > minute(value.endTime) - minute(value.startTime)) throw new Error("A capacidade excede o tempo disponível.");
        return this.update("windows", input.id, { ...value, preference: value.preference ?? null });
      },
      deleteWindow: (input: { id: number }) => this.remove("windows", byId.parse(input).id),
      addCommitment: (input: z.input<typeof commitmentInput>) => {
        const value = commitmentInput.parse(input); this.schedule(value.weekday, value.startTime, value.endTime);
        return { id: this.add("commitments", value).id };
      },
      updateCommitment: (input: z.input<typeof commitmentInput> & { id: number }) => {
        byId.parse(input); const value = commitmentInput.parse(input);
        this.schedule(value.weekday, value.startTime, value.endTime, input.id);
        return this.update("commitments", input.id, value);
      },
      deleteCommitment: (input: { id: number }) => this.remove("commitments", byId.parse(input).id),
    },
    planning: {
      generate: (input?: { weekStart?: string }) => {
        if (input?.weekStart) date.parse(input.weekStart);
        const exams = this.state.exams.filter(row => row.status === "active");
        if (!exams.length || !this.state.windows.length) throw new Error("Cadastre uma prova e um horário disponível na rotina antes de gerar o plano.");
        const suggestions = generateStudyPlan({ weekStart: input?.weekStart, exams, topics: this.state.topics, windows: this.state.windows });
        const existing = new Set(this.state.blocks.map(row => `${row.date}:${row.startTime}`));
        const ids = suggestions.filter(row => !existing.has(`${row.date}:${row.startTime}`)).map(row =>
          this.add("blocks", { ...row, topicId: row.topicId ?? null, examId: row.examId, essayId: null, resourceId: null, status: "planned", updatedAt: new Date() }).id);
        return { ids, created: ids.length };
      },
      updateStatus: (input: { id: number; status: Row<"blocks">["status"] }) => {
        const value = byId.extend({ status: z.enum(["planned", "accepted", "in_progress", "completed", "partially_completed", "postponed", "cancelled"]) }).parse(input);
        if (this.active()?.blockId === value.id) throw new Error("Use os controles do Flow para alterar uma sessão ativa.");
        return this.update("blocks", value.id, { status: value.status });
      },
    },
    flows: {
      createAdHoc: (input: { examId?: number; essayId?: number }) => {
        const value = z.object({ examId: id.optional(), essayId: id.optional() }).refine(row => Boolean(row.examId) !== Boolean(row.essayId), "Escolha uma prova ou uma redação.").parse(input);
        this.ensureNoActive();
        const context = value.examId ? this.find("exams", value.examId) : this.find("essays", value.essayId!);
        if ("status" in context && context.status === "archived") throw new Error("Esta prova está arquivada.");
        const now = new Date();
        const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return { id: this.add("blocks", { examId: value.examId ?? null, essayId: value.essayId ?? null, topicId: null, resourceId: null, title: `Flow · ${"name" in context ? context.name : context.title}`, kind: "flow", date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, startTime, endTime: addMinutesToTime(startTime, 50), durationMinutes: 50, status: "planned", reason: "Sessão temporária iniciada a partir deste objetivo.", minimumVersion: "Use o tempo que você tem disponível.", updatedAt: now }).id };
      },
      start: (input: { blockId: number }) => {
        const value = z.object({ blockId: id }).parse(input);
        this.ensureNoActive();
        const block = this.find("blocks", value.blockId);
        if (!["planned", "accepted", "in_progress", "postponed", "partially_completed"].includes(block.status)) throw new Error("Este bloco já foi encerrado.");
        const now = new Date();
        const session = this.add("sessions", { blockId: block.id, startedAt: now, endedAt: null, status: "running", accumulatedSeconds: 0, lastResumedAt: now, actualMinutes: null, confidence: null, objectiveReached: null, difficulty: null, nextStep: null, evidence: null });
        this.update("blocks", block.id, { status: "in_progress" });
        return { id: session.id };
      },
      pause: (input: { id: number }) => {
        const session = this.find("sessions", byId.parse(input).id);
        if (session.status !== "running") throw new Error("Este Flow não está em execução.");
        return this.update("sessions", session.id, { status: "paused", accumulatedSeconds: elapsedSeconds(session), lastResumedAt: null });
      },
      resume: (input: { id: number }) => {
        const session = this.find("sessions", byId.parse(input).id);
        if (session.status !== "paused") throw new Error("Este Flow não está pausado.");
        return this.update("sessions", session.id, { status: "running", lastResumedAt: new Date() });
      },
      complete: (input: { id: number }) => this.endFlow(input, false),
      cancel: (input: { id: number }) => this.endFlow(input, true),
    },
    resources: {
      create: (input: z.input<typeof resourceInput>) => {
        const value = resourceInput.parse(input);
        if (value.url && !/^https?:\/\//i.test(value.url)) throw new Error("Use um endereço http ou https.");
        return { id: this.add("resources", { ...value, url: value.url ?? null, source: value.source ?? null, subject: value.subject ?? null, fileKey: null, status: "available" }).id };
      },
      update: (input: z.input<typeof resourceInput> & { id: number }) => {
        byId.parse(input); const value = resourceInput.parse(input);
        if (value.url && !/^https?:\/\//i.test(value.url)) throw new Error("Use um endereço http ou https.");
        return this.update("resources", input.id, { ...value, url: value.url ?? null, source: value.source ?? null, subject: value.subject ?? null });
      },
      delete: (input: { id: number }) => this.remove("resources", byId.parse(input).id),
    },
    essays: {
      create: (input: z.input<typeof essayInput>) => {
        const value = essayInput.parse(input);
        if (value.examId) this.find("exams", value.examId);
        return { id: this.add("essays", { ...value, examId: value.examId ?? null, theme: value.theme ?? null, status: "draft", currentText: "", fileKey: null, totalScore: null, updatedAt: new Date() }).id };
      },
      save: (input: z.input<typeof essaySave>) => this.saveEssay(input, true),
      autosave: (input: z.input<typeof essaySave>) => this.saveEssay(input, false),
      delete: (input: { id: number }) => {
        const value = byId.parse(input); this.find("essays", value.id);
        const blocks = new Set(this.state.blocks.filter(row => row.essayId === value.id).map(row => row.id));
        if (blocks.has(this.active()?.blockId ?? -1)) throw new Error("Finalize o Flow antes de excluir esta redação.");
        this.state = { ...this.state, parts: this.state.parts.filter(row => row.essayId !== value.id), versions: this.state.versions.filter(row => row.essayId !== value.id), feedback: this.state.feedback.filter(row => row.essayId !== value.id), blocks: this.state.blocks.filter(row => row.essayId !== value.id), sessions: this.state.sessions.filter(row => !blocks.has(row.blockId)) };
        return this.remove("essays", value.id);
      },
      createPart: (input: { essayId: number; name: string; color?: z.infer<typeof color> }) => {
        const value = z.object({ essayId: id, name: text.max(100), color: color.default("blue") }).parse(input);
        this.find("essays", value.essayId);
        return { id: this.add("parts", { ...value, sortOrder: this.state.parts.filter(row => row.essayId === value.essayId).length, updatedAt: new Date() }).id };
      },
      updatePart: (input: { id: number; name: string; color: z.infer<typeof color> }) => {
        const value = byId.extend({ name: text.max(100), color }).parse(input);
        return this.update("parts", value.id, { name: value.name, color: value.color });
      },
      deletePart: (input: { id: number }) => {
        const part = this.find("parts", byId.parse(input).id);
        const essay = this.find("essays", part.essayId);
        this.update("essays", essay.id, { currentText: (essay.currentText ?? "").replace(new RegExp(` data-part-id="${part.id}"`, "g"), "") });
        return this.remove("parts", part.id);
      },
      reorderParts: (input: { essayId: number; partIds: number[] }) => {
        const value = z.object({ essayId: id, partIds: z.array(id) }).parse(input); this.find("essays", value.essayId);
        const owned = this.state.parts.filter(row => row.essayId === value.essayId);
        if (value.partIds.length !== owned.length || new Set(value.partIds).size !== owned.length || owned.some(row => !value.partIds.includes(row.id))) throw new Error("A ordem das partes é inválida.");
        this.state = { ...this.state, parts: this.state.parts.map(row => row.essayId === value.essayId ? { ...row, sortOrder: value.partIds.indexOf(row.id) } : row) };
        this.publish(); return { success: true };
      },
      applyPart: (input: { essayId: number; partId: number; currentText: string }) => {
        const value = z.object({ essayId: id, partId: id, currentText: z.string().max(1000000) }).parse(input);
        const part = this.find("parts", value.partId);
        if (part.essayId !== value.essayId) throw new Error("Esta parte pertence a outra redação.");
        this.update("essays", value.essayId, { currentText: safeEssayHtml(value.currentText) });
        return { saved: true, coverage: 0 };
      },
      feedback: (input: { essayId: number; origin: string; totalScore?: number; notes?: string; competence1?: number; competence2?: number; competence3?: number; competence4?: number; competence5?: number }) => {
        const score = z.number().int().min(0).max(1000).optional();
        const value = z.object({ essayId: id, origin: text.max(40), totalScore: score, notes: note, competence1: score, competence2: score, competence3: score, competence4: score, competence5: score }).parse(input);
        this.find("essays", value.essayId);
        this.add("feedback", { ...value, notes: value.notes ?? null, totalScore: value.totalScore ?? null, competence1: value.competence1 ?? null, competence2: value.competence2 ?? null, competence3: value.competence3 ?? null, competence4: value.competence4 ?? null, competence5: value.competence5 ?? null });
        this.update("essays", value.essayId, { status: "feedback_received", totalScore: value.totalScore ?? null });
        return { success: true };
      },
    },
    sessions: {
      create: (input: { blockId: number; startedAt: Date; endedAt?: Date; actualMinutes?: number; confidence?: number; objectiveReached?: number; difficulty?: string; nextStep?: string; evidence?: string }) => {
        const value = z.object({ blockId: id, startedAt: z.date(), endedAt: z.date().optional(), actualMinutes: z.number().min(0).max(1440).optional(), confidence: z.number().int().min(1).max(5).optional(), objectiveReached: z.number().int().min(0).max(1).optional(), difficulty: note, nextStep: note, evidence: note }).parse(input);
        this.find("blocks", value.blockId); this.ensureNoActive();
        const minutes = value.actualMinutes ?? Math.round(((value.endedAt ?? new Date()).getTime() - value.startedAt.getTime()) / 60000);
        if (minutes < 0) throw new Error("A duração da sessão é inválida.");
        const row = this.add("sessions", { ...value, endedAt: value.endedAt ?? new Date(), status: "completed", accumulatedSeconds: minutes * 60, lastResumedAt: null, actualMinutes: minutes, confidence: value.confidence ?? null, objectiveReached: value.objectiveReached ?? null, difficulty: value.difficulty ?? null, nextStep: value.nextStep ?? null, evidence: value.evidence ?? null });
        this.update("blocks", value.blockId, { status: "completed" });
        return { id: row.id };
      },
    },
  };
  private endFlow(input: { id: number }, cancelled: boolean) {
    const session = this.find("sessions", byId.parse(input).id);
    if (!["running", "paused"].includes(session.status)) throw new Error("Este Flow já foi encerrado.");
    const seconds = elapsedSeconds(session);
    this.update("sessions", session.id, { status: cancelled ? "cancelled" : "completed", accumulatedSeconds: seconds, lastResumedAt: null, actualMinutes: Math.round(seconds / 60), endedAt: new Date() });
    this.update("blocks", session.blockId, { status: cancelled ? "postponed" : "completed" });
    return { success: true, actualMinutes: Math.round(seconds / 60) };
  }
}
