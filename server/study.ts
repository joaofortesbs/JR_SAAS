import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TrpcContext } from "./_core/context";
import { publicAuthConfig } from "./_core/supabase";
import { emptyStudyState, safeEssayHtml, type StudyState } from "../shared/study";

const id = z.number().int().positive();
const title = z.string().trim().min(2, "Use pelo menos dois caracteres.").max(180);
const note = z.string().max(10000).optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
const topic = z.object({ name: title, subject: title, weight: z.number().int().min(1).max(5).default(3) });
const exam = z.object({ name: title, institution: title, date, phase: title.optional(), color: z.enum(["blue","pink","mint","orange","yellow"]).optional(), priority: z.enum(["principal","alta","media","baixa"]), notes: note });
const partColor = z.enum(["blue","pink","mint","orange","yellow"]);
const savedEssay = z.object({ id, title, theme: note, currentText: z.string().max(1000000), status: z.enum(["draft","submitted_for_review","feedback_received","revision_needed","revised"]).optional() });
const score = z.number().int().min(0).max(200).optional();
export const studySchemas = {
  "exams.create": exam,
  "exams.update": exam.extend({ id }),
  "exams.close": z.object({ id, status: z.enum(["completed","archived"]).default("completed") }),
  "exams.delete": z.object({ id }),
  "exams.createTopic": topic.extend({ examId: id }),
  "exams.updateTopic": topic.extend({ id, status: z.enum(["not_started","in_progress","review","needs_help","done"]).optional() }),
  "exams.deleteTopic": z.object({ id }),
  "essays.create": z.object({ title, theme: note, bank: z.string().trim().min(1).max(80).default("ENEM"), source: z.literal("editor").default("editor"), examId: id.optional() }),
  "essays.delete": z.object({ id }),
  "essays.save": savedEssay,
  "essays.autosave": savedEssay,
  "essays.restoreVersion": z.object({ id, versionId: id }),
  "essays.applyPart": z.object({ essayId: id, partId: id, currentText: z.string().max(1000000) }),
  "essays.createPart": z.object({ essayId: id, name: title.max(100), color: partColor.default("blue") }),
  "essays.updatePart": z.object({ id, name: title.max(100), color: partColor }),
  "essays.deletePart": z.object({ id }),
  "essays.reorderParts": z.object({ essayId: id, partIds: z.array(id).max(100).refine(values => new Set(values).size === values.length) }),
  "essays.feedback": z.object({ essayId: id, origin: title.max(40), totalScore: z.number().int().min(0).max(1000).optional(), competence1: score, competence2: score, competence3: score, competence4: score, competence5: score, notes: note }),
  "flows.createAdHoc": z.object({ examId: id.optional(), essayId: id.optional() }).refine(row => Boolean(row.examId) !== Boolean(row.essayId), "Escolha uma prova ou uma redação."),
  "flows.start": z.object({ blockId: id }),
  "flows.pause": z.object({ id }),
  "flows.resume": z.object({ id }),
  "flows.complete": z.object({ id }),
  "flows.cancel": z.object({ id }),
};
export const studyInput = z.object({
  ownerId: z.string().uuid(),
  operation: z.enum(Object.keys(studySchemas) as [keyof typeof studySchemas, ...(keyof typeof studySchemas)[]]),
  payload: z.record(z.string(), z.unknown()),
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().positive().optional(),
});
const resultSchema = z.object({ id: id.optional(), success: z.boolean().optional(), saved: z.boolean().optional(), versionNumber: z.number().int().nonnegative().optional(), revision: z.number().int().positive().optional(), actualMinutes: z.number().nonnegative().nullable().optional() });
const messages: Record<string, [ConstructorParameters<typeof TRPCError>[0]["code"], string]> = {
  REVISION_CONFLICT: ["CONFLICT","Este registro mudou em outro dispositivo. Seu rascunho foi preservado; confira a versão atual antes de tentar novamente."],
  ACTIVE_FLOW: ["CONFLICT","Finalize ou cancele seu Flow atual antes de realizar esta ação."],
  NOT_FOUND: ["NOT_FOUND","Este item não está disponível para esta conta."],
  INVALID_STATE: ["CONFLICT","O estado do Flow mudou. Atualize a tela e confira os controles."],
  INVALID_INPUT: ["BAD_REQUEST","Confira os dados informados."],
  INVALID_REQUEST: ["CONFLICT","Este comando já foi usado para outra ação."],
  UNAUTHORIZED: ["UNAUTHORIZED","Entre novamente na sua conta."],
};
export function databaseError(error: { code?: string; message?: string }): never {
  const found = Object.entries(messages).find(([key]) => error.message?.includes(key));
  if (found) throw new TRPCError({ code: found[1][0], message: found[1][1] });
  if (error.code === "23503") throw new TRPCError({ code:"BAD_REQUEST",message:"A referência escolhida não está disponível nesta conta." });
  if (error.code === "23505") throw new TRPCError({ code:"CONFLICT",message:"Esta ação já foi registrada. Atualize a tela." });
  if (["23514","22001","22P02"].includes(error.code ?? "")) throw new TRPCError({code:"BAD_REQUEST",message:"Confira os campos e limites informados."});
  if (error.code === "42501") throw new TRPCError({ code:"FORBIDDEN",message:"Esta ação não está autorizada." });
  // No raw database errors, private values, tokens or content in responses/logs.
  throw new TRPCError({ code:"SERVICE_UNAVAILABLE",message:"Não foi possível confirmar o acesso ao Supabase. Seus dados não foram apresentados como salvos." });
}
function clientFor(ctx: TrpcContext) {
  const config = publicAuthConfig();
  const bearer = ctx.req.headers?.authorization;
  if (!ctx.user || !config || !bearer) throw new TRPCError({code:"UNAUTHORIZED",message:"Entre na sua conta."});
  return createClient(config.url,config.publishableKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{Authorization:bearer}, fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})},
  });
}
const dates = new Set(["createdAt","updatedAt","startedAt","endedAt","lastResumedAt","deletedAt"]);
function mapRow(raw: unknown): Record<string,unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid record");
  const result: Record<string,unknown> = {};
  for (const [key,value] of Object.entries(raw)) {
    const name = key.replace(/_([a-z])/g,(_,char:string)=>char.toUpperCase());
    result[name] = dates.has(name) && value !== null ? new Date(String(value)) : value;
  }
  if (typeof result.currentText === "string") result.currentText = safeEssayHtml(result.currentText);
  if (typeof result.text === "string") result.text = safeEssayHtml(result.text);
  if (typeof result.accumulatedMs === "number") result.accumulatedSeconds = result.accumulatedMs / 1000;
  return result;
}
export function decodeSnapshot(raw: unknown, ownerId: string): { state: StudyState; serverNow: Date } {
  const outer = z.object({serverNow:z.string().datetime({offset:true})}).passthrough().parse(raw);
  const state = emptyStudyState();
  for (const key of ["exams","topics","essays","parts","versions","feedback","blocks","sessions","periods"] as const) {
    const rows = z.array(z.record(z.string(),z.unknown())).parse(outer[key]);
    const mapped = rows.map(mapRow);
    if (mapped.some(row => row.userId !== ownerId || typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id <= 0)) throw new Error("Invalid ownership response");
    // The SQL snapshot contract is fixed by the versioned migration; output is
    // additionally ownership-checked before returning any private record.
    (state[key] as unknown[]) = mapped;
  }
  return {state,serverNow:new Date(outer.serverNow)};
}
export async function studySnapshot(ctx: TrpcContext, ownerId = ctx.user?.id) {
  if (!ctx.user || ownerId !== ctx.user.id) throw new TRPCError({code:"FORBIDDEN",message:"A conta ativa mudou. Esta operação não foi aplicada."});
  const {data,error} = await clientFor(ctx).rpc("jr_study_snapshot");
  if (error) databaseError(error);
  try { return decodeSnapshot(data,ctx.user!.id); }
  catch { throw new TRPCError({code:"SERVICE_UNAVAILABLE",message:"O Supabase retornou dados fora do contrato esperado."}); }
}
export async function studyMutation(ctx: TrpcContext,input:z.infer<typeof studyInput>) {
  if (!ctx.user || input.ownerId !== ctx.user.id) throw new TRPCError({code:"FORBIDDEN",message:"A conta ativa mudou. Esta operação não foi aplicada."});
  const parsed = studySchemas[input.operation].safeParse(input.payload);
  if (!parsed.success) throw new TRPCError({code:"BAD_REQUEST",message:parsed.error.issues[0]?.message ?? "Confira os dados."});
  const payload: Record<string,unknown> = {...parsed.data};
  if (typeof payload.currentText === "string") payload.currentText = safeEssayHtml(payload.currentText);
  const {data,error}=await clientFor(ctx).rpc("jr_study_mutate",{
    operation:input.operation,payload,request_id:input.requestId,expected_revision:input.expectedRevision ?? null,
  });
  if (error) databaseError(error);
  const result=resultSchema.safeParse(data);
  if (!result.success) throw new TRPCError({code:"SERVICE_UNAVAILABLE",message:"Não foi possível confirmar a resposta de salvamento."});
  return result.data;
}
