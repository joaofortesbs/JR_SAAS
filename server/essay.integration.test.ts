import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { essayParts, essays, getDb, studyBlocks, studySessions, users } from "./db";

const openId = `central-jr-essay-integration-${process.pid}`;
let userId: number | undefined;
let essayId: number | undefined;
let partId: number | undefined;
let blockId: number | undefined;

function createContext(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("essays tRPC integration", () => {
  it("persists rich text, parts and a Flow linked to the essay", async () => {
    const db = await getDb();
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    const [user] = await db.insert(users).values({ openId, name: "Essay Integration" }).$returningId();
    userId = user.id;
    const userRow = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!userRow) throw new Error("INTEGRATION_USER_NOT_FOUND");
    const caller = appRouter.createCaller(createContext(userRow));

    const created = await caller.essays.create({ title: "Redação de integração", theme: "Educação pública", bank: "ENEM", source: "editor" });
    essayId = created.id;
    const part = await caller.essays.createPart({ essayId, name: "Introdução", color: "blue" });
    partId = part.id;
    const html = `<p><span data-part-id="${partId}" style="color: #1f65bd">Uma tese clara</span> organiza o texto.</p>`;
    await caller.essays.autosave({ id: essayId, title: "Redação de integração", theme: "Educação pública", currentText: html });
    const saved = await caller.essays.save({ id: essayId, title: "Redação de integração", theme: "Educação pública", currentText: html, status: "draft" });
    expect(saved.versionNumber).toBe(1);
    const detail = await caller.essays.detail({ id: essayId });
    expect(detail.essay?.currentText).toContain(`data-part-id="${partId}"`);
    expect(detail.parts[0]?.name).toBe("Introdução");
    const applied = await caller.essays.applyPart({ essayId, partId, currentText: html });
    expect(applied.coverage).toBeGreaterThan(0);
    expect(await caller.essays.reorderParts({ essayId, partIds: [partId] })).toEqual({ success: true });
    await caller.essays.feedback({ essayId, origin: "professora", totalScore: 840, notes: "A tese está clara; aprofunde o repertório no desenvolvimento." });
    const withFeedback = await caller.essays.detail({ id: essayId });
    expect(withFeedback.feedback[0]?.totalScore).toBe(840);
    expect(withFeedback.feedback[0]?.notes).toContain("tese está clara");

    const flow = await caller.flows.createAdHoc({ essayId });
    blockId = flow.id;
    const dashboard = await caller.dashboard();
    expect(dashboard.blocks.find(block => block.id === blockId)?.essayId).toBe(essayId);
  });
});

afterAll(async () => {
  const db = await getDb();
  if (!db || !userId) return;
  if (blockId) {
    await db.delete(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.blockId, blockId)));
    await db.delete(studyBlocks).where(and(eq(studyBlocks.userId, userId), eq(studyBlocks.id, blockId)));
  }
  if (partId) await db.delete(essayParts).where(and(eq(essayParts.userId, userId), eq(essayParts.id, partId)));
  if (essayId) await db.delete(essays).where(and(eq(essays.userId, userId), eq(essays.id, essayId)));
  await db.delete(users).where(eq(users.id, userId));
});
