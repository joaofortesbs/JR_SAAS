import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { exams, getDb, studyBlocks, studySessions, topics, users } from "./db";

const openId = `central-jr-flow-integration-${process.pid}`;
let userId: number | undefined;
let examId: number | undefined;
let blockId: number | undefined;
let topicId: number | undefined;

function createContext(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("flows tRPC integration", () => {
  it("persists the complete session lifecycle in the database", async () => {
    const db = await getDb();
    if (!db) throw new Error("DATABASE_UNAVAILABLE");

    const [user] = await db.insert(users).values({ openId, name: "Central JR Integration" }).$returningId();
    userId = user.id;
    const [exam] = await db.insert(exams).values({ userId, name: "Teste Central JR", institution: "Integração", date: "2030-01-01", phase: "Teste", priority: "alta", color: "mint" }).$returningId();
    examId = exam.id;
    const [block] = await db.insert(studyBlocks).values({ userId, examId, title: "Ciclo de integração", kind: "review", date: "2030-01-01", startTime: "09:00", endTime: "09:50", durationMinutes: 50, status: "planned" }).$returningId();
    blockId = block.id;

    const userRow = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!userRow) throw new Error("INTEGRATION_USER_NOT_FOUND");
    const caller = appRouter.createCaller(createContext(userRow));

    const createdTopic = await caller.exams.createTopic({ examId, name: "Funções", subject: "Matemática", weight: 3 });
    topicId = createdTopic.id;
    await caller.exams.updateTopic({ id: topicId, name: "Funções e gráficos", subject: "Matemática", weight: 5 });
    expect((await caller.dashboard()).topics.find(topic => topic.id === topicId)).toMatchObject({ name: "Funções e gráficos", subject: "Matemática", weight: 5 });

    const started = await caller.flows.start({ blockId });
    expect(started.id).toBeTypeOf("number");
    expect((await caller.flows.active())?.session.status).toBe("running");

    await caller.flows.pause({ id: started.id });
    expect((await caller.flows.active())?.session.status).toBe("paused");

    await caller.flows.resume({ id: started.id });
    expect((await caller.flows.active())?.session.status).toBe("running");

    const completed = await caller.flows.complete({ id: started.id });
    expect(completed.actualMinutes).toBeGreaterThanOrEqual(1);
    expect(await caller.flows.active()).toBeNull();
    expect((await caller.dashboard()).blocks.find(blockRow => blockRow.id === blockId)?.status).toBe("completed");
  });
});

afterAll(async () => {
  const db = await getDb();
  if (!db || !userId) return;
  if (blockId) await db.delete(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.blockId, blockId)));
  if (blockId) await db.delete(studyBlocks).where(and(eq(studyBlocks.userId, userId), eq(studyBlocks.id, blockId)));
  if (topicId) await db.delete(topics).where(and(eq(topics.userId, userId), eq(topics.id, topicId)));
  if (examId) await db.delete(exams).where(and(eq(exams.userId, userId), eq(exams.id, examId)));
  await db.delete(users).where(eq(users.id, userId));
});
