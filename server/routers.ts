import { z } from "zod";
import { publicProcedure, protectedProcedure, unavailableProcedure, unavailable, router } from "./_core/trpc";
import { studyInput, studyMutation, studySnapshot } from "./study";

// Preserve the old endpoint names without importing or executing the MySQL handlers.
// Authentication is checked before resource availability, including malformed inputs.
const query = unavailableProcedure.input(z.unknown().optional()).query(unavailable);
const mutation = unavailableProcedure.input(z.unknown().optional()).mutation(unavailable);
export const appRouter = router({
  system: router({
    health: publicProcedure.input(z.unknown().optional()).query(() => ({ ok: true })),
    notifyOwner: mutation,
  }),
  auth: router({ me: protectedProcedure.query(({ ctx }) => ctx.user) }),
  study: router({
    snapshot: protectedProcedure.input(z.object({ownerId:z.string().uuid()})).query(({ctx,input})=>studySnapshot(ctx,input.ownerId)),
    mutate: protectedProcedure.input(studyInput).mutation(({ctx,input})=>studyMutation(ctx,input)),
  }),
  dashboard: query,
  exams: router({ list: query, detail: query, topics: query, create: mutation, update: mutation, close: mutation, createTopic: mutation, updateTopic: mutation }),
  routine: router({ list: query, addWindow: mutation, addCommitment: mutation }),
  flows: router({ active: query, series: query, createAdHoc: mutation, start: mutation, pause: mutation, resume: mutation, complete: mutation, cancel: mutation }),
  sessions: router({ create: mutation }),
  essays: router({ list: query, detail: query, create: mutation, save: mutation, autosave: mutation, createPart: mutation, updatePart: mutation, reorderParts: mutation, deletePart: mutation, applyPart: mutation, feedback: mutation }),
});
export type AppRouter = typeof appRouter;