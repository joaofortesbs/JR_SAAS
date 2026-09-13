import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDashboard, getDb, listEssayDetail, listTopics, exams, topics, studyWindows, fixedCommitments, resources, studyBlocks, studySessions, essays, essayVersions, essayFeedback, auditEvents } from "./db";
import { generateStudyPlan } from "./planning";

const priority = z.enum(["principal", "alta", "media", "baixa"]);
const blockStatus = z.enum(["planned", "accepted", "in_progress", "completed", "partially_completed", "postponed", "cancelled"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  exams: router({
    list: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id).then(data => data.exams)),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const data = await getDashboard(ctx.user.id);
      return { exam: data.exams.find(exam => exam.id === input.id), topics: data.topics.filter(topic => topic.examId === input.id) };
    }),
    topics: protectedProcedure.input(z.object({ examId: z.number().optional() }).optional()).query(({ ctx, input }) => listTopics(ctx.user.id, input?.examId)),
    create: protectedProcedure.input(z.object({ name: z.string().min(2), institution: z.string().min(2), date: z.string(), phase: z.string().default("Prova principal"), priority: priority.default("alta"), color: z.string().default("mint"), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const [created] = await db.insert(exams).values({ ...input, userId: ctx.user.id }).$returningId();
      return { id: created.id };
    }),
    createTopic: protectedProcedure.input(z.object({ examId: z.number(), name: z.string().min(2), subject: z.string().min(2), weight: z.number().min(1).max(5).default(3) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const exam = (await getDashboard(ctx.user.id)).exams.find(candidate => candidate.id === input.examId);
      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "EXAM_NOT_FOUND" });
      const [created] = await db.insert(topics).values({ ...input, userId: ctx.user.id });
      return { id: created.insertId };
    }),
  }),
  routine: router({
    list: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id).then(data => ({ windows: data.windows, commitments: data.commitments }))),
    addWindow: protectedProcedure.input(z.object({ weekday: z.number().min(0).max(6), startTime: z.string(), endTime: z.string(), maxMinutes: z.number().min(15).max(600), preference: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const [created] = await db.insert(studyWindows).values({ ...input, userId: ctx.user.id });
      return { id: created.insertId };
    }),
    addCommitment: protectedProcedure.input(z.object({ title: z.string().min(2), weekday: z.number().min(0).max(6), startTime: z.string(), endTime: z.string(), kind: z.string().default("commitment") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const [created] = await db.insert(fixedCommitments).values({ ...input, userId: ctx.user.id });
      return { id: created.insertId };
    }),
  }),
  planning: router({
    list: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id).then(data => data.blocks)),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const data = await getDashboard(ctx.user.id);
      const block = data.blocks.find(candidate => candidate.id === input.id);
      return { block, exam: block?.examId ? data.exams.find(exam => exam.id === block.examId) : undefined, windows: data.windows };
    }),
    generate: protectedProcedure.input(z.object({ weekStart: z.string().optional() }).optional()).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const data = await getDashboard(ctx.user.id);
      if (!data.windows.length || !data.exams.length) throw new Error("INSUFFICIENT_DATA");
      const suggestions = generateStudyPlan({ weekStart: input?.weekStart, exams: data.exams, topics: data.topics, windows: data.windows });
      const existingKeys = new Set(data.blocks.map(block => `${block.date}:${block.startTime}`));
      const freshSuggestions = suggestions.filter(suggestion => !existingKeys.has(`${suggestion.date}:${suggestion.startTime}`));
      if (!freshSuggestions.length) return { ids: [], created: 0 };
      const created = await db.insert(studyBlocks).values(freshSuggestions.map(suggestion => ({ ...suggestion, userId: ctx.user.id, status: "planned" as const }))).$returningId();
      return { ids: created.map(row => row.id), created: created.length };
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: blockStatus })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      await db.update(studyBlocks).set({ status: input.status }).where(and(eq(studyBlocks.id, input.id), eq(studyBlocks.userId, ctx.user.id)));
      await db.insert(auditEvents).values({ userId: ctx.user.id, entityType: "studyBlock", entityId: input.id, action: `status_${input.status}`, payload: JSON.stringify(input) });
      return { success: true };
    }),
  }),
  resources: router({
    list: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id).then(data => data.resources)),
    create: protectedProcedure.input(z.object({ title: z.string().min(2), type: z.string().default("link"), url: z.string().optional(), source: z.string().optional(), subject: z.string().optional(), durationMinutes: z.number().min(5).max(600).default(50) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const [created] = await db.insert(resources).values({ ...input, userId: ctx.user.id });
      return { id: created.insertId };
    }),
  }),
  sessions: router({
    create: protectedProcedure.input(z.object({ blockId: z.number(), startedAt: z.date(), endedAt: z.date().optional(), actualMinutes: z.number().optional(), confidence: z.number().min(1).max(5).optional(), objectiveReached: z.number().min(0).max(1).optional(), difficulty: z.string().optional(), nextStep: z.string().optional(), evidence: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const block = (await getDashboard(ctx.user.id)).blocks.find(candidate => candidate.id === input.blockId);
      if (!block) throw new TRPCError({ code: "NOT_FOUND", message: "STUDY_BLOCK_NOT_FOUND" });
      const [created] = await db.insert(studySessions).values({ ...input, userId: ctx.user.id });
      await db.update(studyBlocks).set({ status: "completed" }).where(and(eq(studyBlocks.id, input.blockId), eq(studyBlocks.userId, ctx.user.id)));
      return { id: created.insertId };
    }),
  }),
  essays: router({
    list: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id).then(data => data.essays)),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listEssayDetail(ctx.user.id, input.id)),
    create: protectedProcedure.input(z.object({ title: z.string().min(2), theme: z.string().optional(), bank: z.string().default("ENEM"), source: z.enum(["editor", "upload"]).default("editor"), examId: z.number().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const [created] = await db.insert(essays).values({ ...input, userId: ctx.user.id, currentText: "" });
      return { id: created.insertId };
    }),
    save: protectedProcedure.input(z.object({ id: z.number(), title: z.string().min(2), theme: z.string().optional(), currentText: z.string(), status: z.enum(["draft", "submitted_for_review", "feedback_received", "revision_needed", "revised"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const existing = await listEssayDetail(ctx.user.id, input.id);
      if (!existing.essay) throw new TRPCError({ code: "NOT_FOUND", message: "ESSAY_NOT_FOUND" });
      const nextVersion = (existing.versions[0]?.versionNumber ?? 0) + 1;
      await db.update(essays).set({ title: input.title, theme: input.theme, currentText: input.currentText, status: input.status ?? "draft" }).where(and(eq(essays.id, input.id), eq(essays.userId, ctx.user.id)));
      await db.insert(essayVersions).values({ userId: ctx.user.id, essayId: input.id, versionNumber: nextVersion, text: input.currentText, origin: "editor" });
      return { versionNumber: nextVersion };
    }),
    feedback: protectedProcedure.input(z.object({ essayId: z.number(), origin: z.string(), totalScore: z.number().optional(), competence1: z.number().optional(), competence2: z.number().optional(), competence3: z.number().optional(), competence4: z.number().optional(), competence5: z.number().optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
      const existing = await listEssayDetail(ctx.user.id, input.essayId);
      if (!existing.essay) throw new TRPCError({ code: "NOT_FOUND", message: "ESSAY_NOT_FOUND" });
      const [created] = await db.insert(essayFeedback).values({ ...input, userId: ctx.user.id });
      await db.update(essays).set({ status: "feedback_received", totalScore: input.totalScore }).where(and(eq(essays.id, input.essayId), eq(essays.userId, ctx.user.id)));
      return { id: created.insertId };
    }),
  }),
});

export type AppRouter = typeof appRouter;
