import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { getMysqlDatabaseUrl } from "./_core/databaseConfig";
import {
  users, exams, topics, studyWindows, fixedCommitments,
  resources, studyBlocks, studySessions, essays, essayParts, essayVersions, essayFeedback,
  auditEvents,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    _db = drizzle(getMysqlDatabaseUrl());
  }
  return _db;
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
  const db = await getDb(); if (!db) return { essay: undefined, parts: [], versions: [], feedback: [] };
  const [essayRows, parts, versions, feedback] = await Promise.all([
    db.select().from(essays).where(and(eq(essays.userId, userId), eq(essays.id, essayId))).limit(1),
    db.select().from(essayParts).where(and(eq(essayParts.userId, userId), eq(essayParts.essayId, essayId))).orderBy(essayParts.sortOrder, essayParts.createdAt),
    db.select().from(essayVersions).where(and(eq(essayVersions.userId, userId), eq(essayVersions.essayId, essayId))).orderBy(desc(essayVersions.versionNumber)),
    db.select().from(essayFeedback).where(and(eq(essayFeedback.userId, userId), eq(essayFeedback.essayId, essayId))).orderBy(desc(essayFeedback.createdAt)),
  ]);
  return { essay: essayRows[0], parts, versions, feedback };
}

export { users, exams, topics, studyWindows, fixedCommitments, resources, studyBlocks, studySessions, essays, essayParts, essayVersions, essayFeedback, auditEvents };
