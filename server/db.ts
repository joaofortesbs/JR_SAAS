import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  InsertUser, User, users, exams, topics, studyWindows, fixedCommitments,
  resources, studyBlocks, studySessions, essays, essayVersions, essayFeedback,
  auditEvents,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getDashboard(userId: number) {
  const db = await getDb();
  if (!db) return { exams: [], topics: [], blocks: [], windows: [], commitments: [], resources: [], essays: [], sessions: [] };
  const [examRows, topicRows, blockRows, windowRows, commitmentRows, resourceRows, essayRows, sessionRows] = await Promise.all([
    db.select().from(exams).where(eq(exams.userId, userId)).orderBy(exams.date),
    db.select().from(topics).where(eq(topics.userId, userId)).orderBy(desc(topics.weight), topics.subject),
    db.select().from(studyBlocks).where(eq(studyBlocks.userId, userId)).orderBy(studyBlocks.date, studyBlocks.startTime),
    db.select().from(studyWindows).where(eq(studyWindows.userId, userId)).orderBy(studyWindows.weekday, studyWindows.startTime),
    db.select().from(fixedCommitments).where(eq(fixedCommitments.userId, userId)).orderBy(fixedCommitments.weekday, fixedCommitments.startTime),
    db.select().from(resources).where(eq(resources.userId, userId)).orderBy(desc(resources.createdAt)),
    db.select().from(essays).where(eq(essays.userId, userId)).orderBy(desc(essays.updatedAt)),
    db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(desc(studySessions.createdAt)),
  ]);
  return { exams: examRows, topics: topicRows, blocks: blockRows, windows: windowRows, commitments: commitmentRows, resources: resourceRows, essays: essayRows, sessions: sessionRows };
}

export async function listTopics(userId: number, examId?: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(topics).where(examId ? and(eq(topics.userId, userId), eq(topics.examId, examId)) : eq(topics.userId, userId));
}

export async function listEssayDetail(userId: number, essayId: number) {
  const db = await getDb(); if (!db) return { essay: undefined, versions: [], feedback: [] };
  const [essayRows, versions, feedback] = await Promise.all([
    db.select().from(essays).where(and(eq(essays.userId, userId), eq(essays.id, essayId))).limit(1),
    db.select().from(essayVersions).where(and(eq(essayVersions.userId, userId), eq(essayVersions.essayId, essayId))).orderBy(desc(essayVersions.versionNumber)),
    db.select().from(essayFeedback).where(and(eq(essayFeedback.userId, userId), eq(essayFeedback.essayId, essayId))).orderBy(desc(essayFeedback.createdAt)),
  ]);
  return { essay: essayRows[0], versions, feedback };
}

export { users, exams, topics, studyWindows, fixedCommitments, resources, studyBlocks, studySessions, essays, essayVersions, essayFeedback, auditEvents };
