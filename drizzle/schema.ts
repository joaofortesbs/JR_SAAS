import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  institution: varchar("institution", { length: 120 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  phase: varchar("phase", { length: 80 }).default("Prova principal").notNull(),
  priority: mysqlEnum("priority", ["principal", "alta", "media", "baixa"]).default("alta").notNull(),
  color: varchar("color", { length: 20 }).default("mint").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  examId: int("examId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "review", "needs_help", "done"]).default("not_started").notNull(),
  weight: int("weight").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fixedCommitments = mysqlTable("fixedCommitments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  weekday: int("weekday").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  kind: varchar("kind", { length: 40 }).default("commitment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyWindows = mysqlTable("studyWindows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekday: int("weekday").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  maxMinutes: int("maxMinutes").default(120).notNull(),
  preference: varchar("preference", { length: 100 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 40 }).default("link").notNull(),
  url: text("url"),
  fileKey: text("fileKey"),
  source: varchar("source", { length: 120 }),
  subject: varchar("subject", { length: 100 }),
  durationMinutes: int("durationMinutes").default(50).notNull(),
  status: mysqlEnum("status", ["added", "available", "linked", "archived", "unavailable"]).default("added").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyBlocks = mysqlTable("studyBlocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  examId: int("examId"),
  topicId: int("topicId"),
  resourceId: int("resourceId"),
  title: varchar("title", { length: 180 }).notNull(),
  kind: varchar("kind", { length: 40 }).default("review").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  durationMinutes: int("durationMinutes").default(50).notNull(),
  status: mysqlEnum("status", ["planned", "accepted", "in_progress", "completed", "partially_completed", "postponed", "cancelled"]).default("planned").notNull(),
  reason: text("reason"),
  minimumVersion: text("minimumVersion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const studySessions = mysqlTable("studySessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  blockId: int("blockId").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  actualMinutes: int("actualMinutes"),
  confidence: int("confidence"),
  objectiveReached: int("objectiveReached"),
  difficulty: varchar("difficulty", { length: 160 }),
  nextStep: text("nextStep"),
  evidence: text("evidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const essays = mysqlTable("essays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  examId: int("examId"),
  title: varchar("title", { length: 180 }).notNull(),
  theme: text("theme"),
  bank: varchar("bank", { length: 80 }).default("ENEM").notNull(),
  status: mysqlEnum("status", ["draft", "submitted_for_review", "feedback_received", "revision_needed", "revised"]).default("draft").notNull(),
  currentText: text("currentText"),
  source: varchar("source", { length: 30 }).default("editor").notNull(),
  fileKey: text("fileKey"),
  totalScore: int("totalScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const essayVersions = mysqlTable("essayVersions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  essayId: int("essayId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  text: text("text"),
  origin: varchar("origin", { length: 30 }).default("editor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const essayFeedback = mysqlTable("essayFeedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  essayId: int("essayId").notNull(),
  origin: varchar("origin", { length: 40 }).notNull(),
  totalScore: int("totalScore"),
  competence1: int("competence1"),
  competence2: int("competence2"),
  competence3: int("competence3"),
  competence4: int("competence4"),
  competence5: int("competence5"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  payload: text("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type StudyWindow = typeof studyWindows.$inferSelect;
export type FixedCommitment = typeof fixedCommitments.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type StudyBlock = typeof studyBlocks.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Essay = typeof essays.$inferSelect;
export type EssayVersion = typeof essayVersions.$inferSelect;
export type EssayFeedback = typeof essayFeedback.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
