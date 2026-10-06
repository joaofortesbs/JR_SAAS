import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { databaseError, decodeSnapshot, studyMutation, studySchemas, studySnapshot } from "./study";
import { appRouter } from "./routers";

const mocks = vi.hoisted(()=>({rpc:vi.fn(),create:vi.fn()}));
vi.mock("@supabase/supabase-js",()=>({createClient:(...args:unknown[])=>{mocks.create(...args);return {rpc:mocks.rpc};}}));
const ownerId="11111111-1111-4111-8111-111111111111";
const otherId="22222222-2222-4222-8222-222222222222";
const requestId="33333333-3333-4333-8333-333333333333";
const ctx:TrpcContext={
 user:{id:ownerId,email:"fixture@example.com",name:"Teste",role:"user"},
 req:{headers:{authorization:"Bearer test-only-jwt"}} as TrpcContext["req"],
 res:{} as TrpcContext["res"],
};
const rawSnapshot = () => ({
 serverNow:"2026-10-05T18:00:00.123+00:00",exams:[],topics:[],essays:[],parts:[],versions:[],feedback:[],blocks:[],sessions:[],periods:[],
});
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("SUPABASE_URL","https://fixture.supabase.co");
 vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_fixture");
 // Runtime must not consume this administrative credential.
 vi.stubEnv("SUPABASE_ACCESS_TOKEN","administration-must-never-reach-sdk");
 mocks.rpc.mockResolvedValue({data:rawSnapshot(),error:null});
});
describe("Supabase study runtime boundaries",()=>{
 it("forwards only the verified account JWT and publishable key",async()=>{
  const response=await studySnapshot(ctx,ownerId);
  expect(response.state.windows).toEqual([]);
  expect(mocks.create).toHaveBeenCalledWith("https://fixture.supabase.co","sb_publishable_fixture",expect.objectContaining({
   global:expect.objectContaining({headers:{Authorization:"Bearer test-only-jwt"}}),
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  }));
  expect(JSON.stringify(mocks.create.mock.calls)).not.toContain("administration-must");
 });
 it("prevents cross-account query cache and delayed mutation reuse",async()=>{
  await expect(studySnapshot(ctx,otherId)).rejects.toMatchObject({code:"FORBIDDEN"});
  await expect(studyMutation(ctx,{ownerId:otherId,operation:"exams.create",payload:{},requestId})).rejects.toMatchObject({code:"FORBIDDEN"});
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it("does not return a fallback success on network errors",async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{code:"FETCH_ERROR",message:"network failed"}});
  await expect(studySnapshot(ctx)).rejects.toMatchObject({code:"SERVICE_UNAVAILABLE"});
 });
 it("passes optimistic revision/idempotency and sanitizes HTML",async()=>{
  mocks.rpc.mockResolvedValue({data:{saved:true,id:9,revision:3,versionNumber:0},error:null});
  await studyMutation(ctx,{ownerId,operation:"essays.autosave",requestId,expectedRevision:2,payload:{id:9,title:"Ensaio",currentText:'<script>bad()</script><b onclick="bad()">Seguro</b>'}});
  expect(mocks.rpc).toHaveBeenCalledWith("jr_study_mutate",{
   operation:"essays.autosave",request_id:requestId,expected_revision:2,payload:{id:9,title:"Ensaio",currentText:"<b>Seguro</b>"},
  });
 });
 it("rejects fake client times and durations through a whitelist",async()=>{
  mocks.rpc.mockResolvedValue({data:{id:1,revision:1},error:null});
  await studyMutation(ctx,{ownerId,operation:"flows.start",requestId,payload:{blockId:2,startedAt:"2000-01-01",accumulatedMs:90000000}});
  expect(mocks.rpc.mock.calls[0][1].payload).toEqual({blockId:2});
 });
 it("requires correctly sized non-overlapping temporary planning inputs",async()=>{
  await expect(studyMutation(ctx,{ownerId,operation:"planning.generate",requestId,payload:{windows:[{weekday:1,startTime:"10:00",endTime:"10:20",maxMinutes:90}]}})).rejects.toMatchObject({code:"BAD_REQUEST"});
  await expect(studyMutation(ctx,{ownerId,operation:"planning.generate",requestId,payload:{windows:[{weekday:1,startTime:"10:00",endTime:"11:00",maxMinutes:60}],commitments:[{weekday:1,startTime:"10:30",endTime:"12:00"}]}})).rejects.toMatchObject({code:"BAD_REQUEST"});
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it("rejects unexpected private ownership in a snapshot",()=>{
  expect(()=>decodeSnapshot({...rawSnapshot(),essays:[{id:1,user_id:otherId}]},ownerId)).toThrow("Invalid ownership");
 });
 it("returns Dates and preserves millisecond precision",()=>{
  const snapshot=decodeSnapshot({...rawSnapshot(),sessions:[{id:1,user_id:ownerId,accumulated_ms:1234,started_at:"2026-10-05T18:00:00.001+00:00",last_resumed_at:null}]},ownerId);
  expect(snapshot.state.sessions[0].accumulatedSeconds).toBe(1.234);
  expect(snapshot.state.sessions[0].startedAt).toBeInstanceOf(Date);
  expect(snapshot.serverNow.getUTCMilliseconds()).toBe(123);
 });
 it("maps conflicts without leaking database details",()=>{
  expect(()=>databaseError({message:"REVISION_CONFLICT: private text"})).toThrow(/outro dispositivo/);
  expect(()=>databaseError({message:"private record details"})).toThrow(/confirmar/);
 });
 it("uses authenticated, account-bound router paths",async()=>{
  const caller=appRouter.createCaller(ctx);
  await expect(caller.study.snapshot({ownerId:otherId})).rejects.toMatchObject({code:"FORBIDDEN"});
  const anonymous=appRouter.createCaller({...ctx,user:null});
  await expect(anonymous.study.snapshot({ownerId})).rejects.toMatchObject({code:"UNAUTHORIZED"});
 });
 it("rejects impossible dates and obsolete fake completion states",()=>{
  expect(studySchemas["exams.create"].safeParse({name:"Teste",institution:"Instituição",priority:"alta",date:"2026-02-30"}).success).toBe(false);
  expect(studySchemas["planning.updateStatus"].safeParse({id:1,status:"completed"}).success).toBe(false);
 });
});
