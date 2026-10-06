import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { StudyStore } from "./study-store";

const Context = createContext<StudyStore | null>(null);

export function StudyProvider({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const [store] = useState(() => new StudyStore(ownerId));
  useEffect(() => () => store.clear(), [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("O espaço temporário precisa de uma conta autenticada.");
  return store;
}
export function useStudySnapshot() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function query<I, O>(read: (store: StudyStore, input: I) => O) {
  return {
    useQuery(input?: I, options?: { enabled?: boolean; [key: string]: unknown }) {
      const store = useStore();
      const revision = useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
      const inputKey = JSON.stringify(input);
      const data = useMemo(() => read(store, input as I), [store, revision, inputKey]);
      return {
        data, isLoading: false, isFetching: false, error: null as Error | null,
        refetch: async () => ({ data: read(store, input as I) }),
      };
    },
  };
}
type MutationOptions<I, O> = {
  onSuccess?: (result: O, input: I) => void | Promise<unknown>;
  onError?: (error: Error, input: I) => void | Promise<unknown>;
};
function mutation<I, O>(execute: (store: StudyStore, input: I) => O) {
  return {
    useMutation(options: MutationOptions<I, O> = {}) {
      const store = useStore();
      const [isPending, setPending] = useState(false);
      const [error, setError] = useState<Error | null>(null);
      const mutateAsync = async (input: I): Promise<O> => {
        setPending(true); setError(null);
        try {
          const result = execute(store, input);
          await options.onSuccess?.(result, input);
          return result;
        } catch (cause) {
          // Validation errors are deliberately human-readable and session-local.
          const problem = cause instanceof Error ? cause : new Error("Não foi possível concluir esta ação temporária.");
          setError(problem);
          await options.onError?.(problem, input);
          throw problem;
        } finally { setPending(false); }
      };
      return {
        isPending, error, mutateAsync,
        mutate: (input: I) => { void mutateAsync(input).catch(() => {}); },
        reset: () => { setError(null); setPending(false); },
      };
    },
  };
}
const invalidate = { invalidate: async (_input?: unknown) => {} };
// This compatibility surface belongs to the TEMPORARY workspace only. It does
// not replace or mock the authenticated network client, or return fake saves.
export const study = {
  useUtils: () => ({
    dashboard: invalidate, exams: { list: invalidate, detail: invalidate, topics: invalidate },
    essays: { list: invalidate, detail: invalidate }, routine: { list: invalidate },
    flows: { active: invalidate, series: invalidate }, planning: { list: invalidate, detail: invalidate },
    resources: { list: invalidate },
  }),
  dashboard: query(s => s.queries.dashboard()),
  exams: {
    list: query(s => s.queries.exams.list()),
    detail: query((s, i: Parameters<StudyStore["queries"]["exams"]["detail"]>[0]) => s.queries.exams.detail(i)),
    topics: query((s, i: Parameters<StudyStore["queries"]["exams"]["topics"]>[0]) => s.queries.exams.topics(i)),
    create: mutation((s, i: Parameters<StudyStore["mutations"]["exams"]["create"]>[0]) => s.mutations.exams.create(i)),
    update: mutation((s, i: Parameters<StudyStore["mutations"]["exams"]["update"]>[0]) => s.mutations.exams.update(i)),
    close: mutation((s, i: Parameters<StudyStore["mutations"]["exams"]["close"]>[0]) => s.mutations.exams.close(i)),
    delete: mutation((s, i: { id: number }) => s.mutations.exams.delete(i)),
    createTopic: mutation((s, i: Parameters<StudyStore["mutations"]["exams"]["createTopic"]>[0]) => s.mutations.exams.createTopic(i)),
    updateTopic: mutation((s, i: Parameters<StudyStore["mutations"]["exams"]["updateTopic"]>[0]) => s.mutations.exams.updateTopic(i)),
    deleteTopic: mutation((s, i: { id: number }) => s.mutations.exams.deleteTopic(i)),
  },
  routine: {
    list: query(s => s.queries.routine.list()),
    addWindow: mutation((s, i: Parameters<StudyStore["mutations"]["routine"]["addWindow"]>[0]) => s.mutations.routine.addWindow(i)),
    updateWindow: mutation((s, i: Parameters<StudyStore["mutations"]["routine"]["updateWindow"]>[0]) => s.mutations.routine.updateWindow(i)),
    deleteWindow: mutation((s, i: { id: number }) => s.mutations.routine.deleteWindow(i)),
    addCommitment: mutation((s, i: Parameters<StudyStore["mutations"]["routine"]["addCommitment"]>[0]) => s.mutations.routine.addCommitment(i)),
    updateCommitment: mutation((s, i: Parameters<StudyStore["mutations"]["routine"]["updateCommitment"]>[0]) => s.mutations.routine.updateCommitment(i)),
    deleteCommitment: mutation((s, i: { id: number }) => s.mutations.routine.deleteCommitment(i)),
  },
  planning: {
    list: query(s => s.queries.planning.list()),
    detail: query((s, i: { id: number }) => s.queries.planning.detail(i)),
    generate: mutation((s, i: { weekStart?: string } | undefined) => s.mutations.planning.generate(i)),
    updateStatus: mutation((s, i: Parameters<StudyStore["mutations"]["planning"]["updateStatus"]>[0]) => s.mutations.planning.updateStatus(i)),
  },
  flows: {
    active: query(s => s.queries.flows.active()),
    series: query((s, i: { days?: number } | undefined) => s.queries.flows.series(i)),
    createAdHoc: mutation((s, i: { examId?: number; essayId?: number }) => s.mutations.flows.createAdHoc(i)),
    start: mutation((s, i: { blockId: number }) => s.mutations.flows.start(i)),
    pause: mutation((s, i: { id: number }) => s.mutations.flows.pause(i)),
    resume: mutation((s, i: { id: number }) => s.mutations.flows.resume(i)),
    complete: mutation((s, i: { id: number }) => s.mutations.flows.complete(i)),
    cancel: mutation((s, i: { id: number }) => s.mutations.flows.cancel(i)),
  },
  resources: {
    list: query(s => s.queries.resources.list()),
    create: mutation((s, i: Parameters<StudyStore["mutations"]["resources"]["create"]>[0]) => s.mutations.resources.create(i)),
    update: mutation((s, i: Parameters<StudyStore["mutations"]["resources"]["update"]>[0]) => s.mutations.resources.update(i)),
    delete: mutation((s, i: { id: number }) => s.mutations.resources.delete(i)),
  },
  essays: {
    list: query(s => s.queries.essays.list()),
    detail: query((s, i: { id: number }) => s.queries.essays.detail(i)),
    create: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["create"]>[0]) => s.mutations.essays.create(i)),
    save: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["save"]>[0]) => s.mutations.essays.save(i)),
    autosave: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["autosave"]>[0]) => s.mutations.essays.autosave(i)),
    delete: mutation((s, i: { id: number }) => s.mutations.essays.delete(i)),
    createPart: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["createPart"]>[0]) => s.mutations.essays.createPart(i)),
    updatePart: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["updatePart"]>[0]) => s.mutations.essays.updatePart(i)),
    deletePart: mutation((s, i: { id: number }) => s.mutations.essays.deletePart(i)),
    reorderParts: mutation((s, i: { essayId: number; partIds: number[] }) => s.mutations.essays.reorderParts(i)),
    applyPart: mutation((s, i: { essayId: number; partId: number; currentText: string }) => s.mutations.essays.applyPart(i)),
    feedback: mutation((s, i: Parameters<StudyStore["mutations"]["essays"]["feedback"]>[0]) => s.mutations.essays.feedback(i)),
  },
  sessions: {
    create: mutation((s, i: Parameters<StudyStore["mutations"]["sessions"]["create"]>[0]) => s.mutations.sessions.create(i)),
  },
};
