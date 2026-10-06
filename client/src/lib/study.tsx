import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { StudyStore } from "./study-store";
import type { StudyState } from "../../../shared/study";
import { trpc } from "./trpc";
import { getSupabase } from "./supabase";
import { dailyFlowSeries } from "../../../server/flow";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Snapshot = { state: StudyState; serverNow: Date };
type PersistenceStatus = { isLoading: boolean; error: Error | null; isFetching: boolean; isConnected: boolean; lastConfirmedAt: Date | null; refresh: () => Promise<unknown> };
type StoreContextValue = {
  ownerId: string;
  store: StudyStore;
  state: StudyState | undefined;
  status: PersistenceStatus;
  serverNow: Date | undefined;
  clockSampleAt: number;
};
const Context = createContext<StoreContextValue | null>(null);
const persistedTables = ["jr_exams", "jr_topics", "jr_essays", "jr_parts", "jr_versions", "jr_feedback", "jr_blocks", "jr_sessions", "jr_periods"] as const;
const essayWriteQueues = new Map<string, Promise<unknown>>();
const confirmedRevisions = new Map<string, number>();
let flushDraftHandler: (() => Promise<boolean>) | null = null;
const essayRevisionLocks = new Map<string, { get: () => number | undefined; set: (revision: number) => void }>();
export function registerStudyDraftFlush(handler: () => Promise<boolean>) {
  flushDraftHandler = handler;
  return () => { if (flushDraftHandler === handler) flushDraftHandler = null; };
}
export async function flushPendingStudyDraft() {
  return flushDraftHandler ? flushDraftHandler() : true;
}
export function registerEssayRevisionLock(ownerId: string, essayId: number, lock: { get: () => number | undefined; set: (revision: number) => void }) {
  const key = `${ownerId}:${essayId}`;
  essayRevisionLocks.set(key, lock);
  return () => { if (essayRevisionLocks.get(key) === lock) essayRevisionLocks.delete(key); };
}

export function StudyProvider({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const [store] = useState(() => new StudyStore(ownerId));
  const temporaryRevision = useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
  const [isConnected, setConnected] = useState(false);
  const [lastConfirmedAt, setLastConfirmedAt] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const snapshotInput = useMemo(() => ({ ownerId }), [ownerId]);
  const snapshotKey = useMemo(() => getQueryKey(trpc.study.snapshot, snapshotInput, "query"), [snapshotInput]);
  const query = trpc.study.snapshot.useQuery(snapshotInput, { refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false });
  const queryUtils = trpc.useUtils();
  const clockSampleAtRef = useRef({ snapshot: query.data, at: typeof performance === "undefined" ? 0 : performance.now() });
  if (clockSampleAtRef.current.snapshot !== query.data) {
    clockSampleAtRef.current = { snapshot: query.data, at: typeof performance === "undefined" ? 0 : performance.now() };
  }
  const state = useMemo(() => {
    if (!query.data?.state) return undefined;
    const temporary = store.getSnapshot();
    return { ...query.data.state, windows: temporary.windows, commitments: temporary.commitments, resources: temporary.resources };
  }, [query.data, store, temporaryRevision]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const refresh = useCallback(async () => query.refetch(), [query.refetch]);
  useEffect(() => {
    if (query.data) setLastConfirmedAt(new Date());
  }, [query.data]);
  useEffect(() => {
    let channels: RealtimeChannel[] = [];
    const channelsRef = { current: channels };
    const connectionStatuses = new Map<string, boolean>();
    let disposed = false;
    const connect = async () => {
      try {
        const supabase = await getSupabase();
        if (disposed) return;
        const subscriptions = persistedTables.map(table => supabase.channel(`study:${ownerId}:${table}:${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${ownerId}` }, payload => {
            // Deletes can contain only the primary key. Always reconcile from the
            // authorized snapshot rather than treating a partial event as a row.
            if (payload.eventType === "DELETE" || payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              void queryUtils.study.snapshot.invalidate(snapshotInput);
            }
          })
          .subscribe(status => {
            connectionStatuses.set(table, status === "SUBSCRIBED");
            setConnected(connectionStatuses.size === persistedTables.length && Array.from(connectionStatuses.values()).every(Boolean));
          }));
        channels = subscriptions;
        channelsRef.current = channels;
      } catch {
        if (!disposed) setConnected(false);
      }
    };
    void connect();
    const reconcile = () => { if (document.visibilityState === "visible") void queryUtils.study.snapshot.invalidate(snapshotInput); };
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    return () => {
      disposed = true;
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      setConnected(false);
      for (const item of channelsRef.current) void item.unsubscribe();
      void queryClient.cancelQueries({ queryKey: snapshotKey });
      queryClient.removeQueries({ queryKey: snapshotKey });
      for (const key of Array.from(confirmedRevisions.keys())) if (key.startsWith(`${ownerId}:`)) confirmedRevisions.delete(key);
      for (const key of Array.from(essayRevisionLocks.keys())) if (key.startsWith(`${ownerId}:`)) essayRevisionLocks.delete(key);
      for (const key of Array.from(essayWriteQueues.keys())) if (key.startsWith(`${ownerId}:`)) essayWriteQueues.delete(key);
      store.clear();
    };
  }, [ownerId, queryClient, queryUtils, snapshotInput, snapshotKey, store]);
  const value = useMemo<StoreContextValue>(() => ({
    ownerId, store, state, serverNow: query.data?.serverNow, clockSampleAt: clockSampleAtRef.current.at,
    status: { isLoading: query.isLoading, error: query.error as Error | null, isFetching: query.isFetching, isConnected, lastConfirmedAt, refresh },
  }), [ownerId, store, state, query.data?.serverNow, query.isLoading, query.error, query.isFetching, isConnected, lastConfirmedAt, refresh, clockSampleAtRef.current.at]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function useContextValue() {
  const value = useContext(Context);
  if (!value) throw new Error("Os dados de estudo exigem uma conta autenticada.");
  return value;
}
export function useStudySnapshot() {
  const { state } = useContextValue();
  return state;
}
export function useStudyOwnerId() {
  return useContextValue().ownerId;
}
export function useStudyPersistenceStatus(): PersistenceStatus {
  return useContextValue().status;
}
function useTemporaryRevision() {
  const { store } = useContextValue();
  return useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
}
function query<I, O>(select: (state: StudyState, input: I | undefined, serverNow?: Date, clockSampleAt?: number) => O) {
  return {
    useQuery(input?: I, _options?: { enabled?: boolean; [key: string]: unknown }) {
      const { state, status, serverNow, clockSampleAt } = useContextValue();
      return {
        data: state ? select(state, input, serverNow, clockSampleAt) : undefined,
        isLoading: status.isLoading,
        isFetching: status.isFetching,
        error: status.error,
        refetch: async () => {
          const result = await status.refresh() as { data?: Snapshot };
          return { data: result.data?.state ? select(result.data.state, input, result.data.serverNow, typeof performance === "undefined" ? 0 : performance.now()) : undefined };
        },
      };
    },
  };
}

type MutationOptions<I, O> = {
  onSuccess?: (result: O, input: I) => void | Promise<unknown>;
  onError?: (error: Error, input: I) => void | Promise<unknown>;
};
type OperationResult = { id?: number; success?: boolean; saved?: boolean; versionNumber?: number; actualMinutes?: number | null; revision?: number; created?: number; ids?: number[] };
type StudyOperation =
  | "exams.create" | "exams.update" | "exams.close" | "exams.delete" | "exams.createTopic" | "exams.updateTopic" | "exams.deleteTopic"
  | "essays.create" | "essays.delete" | "essays.save" | "essays.autosave" | "essays.restoreVersion" | "essays.applyPart"
  | "essays.createPart" | "essays.updatePart" | "essays.deletePart" | "essays.reorderParts" | "essays.feedback"
  | "planning.generate" | "planning.updateStatus" | "flows.createAdHoc" | "flows.start" | "flows.pause" | "flows.resume" | "flows.complete" | "flows.cancel";
function makeOperation<I>(operation: StudyOperation, revisionFor?: (state: StudyState | undefined, input: I) => number | undefined) {
  return {
    useMutation(options: MutationOptions<I, OperationResult> = {}) {
      const { state, store, ownerId, status } = useContextValue();
      const refresh = status.refresh;
      const stateRef = useRef(state);
      stateRef.current = state;
      const requestIds = useRef(new Map<string, string>());
      const mutation = trpc.study.mutate.useMutation();
      const mutationRef = useRef(mutation.mutateAsync);
      mutationRef.current = mutation.mutateAsync;
      const successRef = useRef(options.onSuccess);
      successRef.current = options.onSuccess;
      const errorRef = useRef(options.onError);
      errorRef.current = options.onError;
      const mutateAsync = useCallback(async (input: I): Promise<OperationResult> => {
        const key = `${operation}:${JSON.stringify(input)}`;
        let requestId = requestIds.current.get(key);
        if (!requestId) {
          requestId = typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
          requestIds.current.set(key, requestId);
        }
        const perform = async () => {
          const inputRevision = input && typeof input === "object" && typeof (input as { revision?: unknown }).revision === "number"
            ? (input as unknown as { revision: number }).revision
            : undefined;
          const rawId = input && typeof input === "object"
            ? Number((input as { id?: number; essayId?: number }).id ?? (input as { essayId?: number }).essayId)
            : NaN;
          const partEssayId = operation.includes("Part") && Number.isFinite(rawId) ? stateRef.current?.parts.find(part => part.id === rawId)?.essayId : undefined;
          const recordId = operation.startsWith("essays.") ? Number((input as { essayId?: number }).essayId ?? partEssayId ?? (input as { id?: number }).id) : rawId;
          const revisionKey = `${ownerId}:${operation.startsWith("essays.") ? "essays" : operation.startsWith("flows.") ? "sessions" : operation}:${recordId}`;
          const essayLock = operation.startsWith("essays.") && Number.isFinite(recordId) ? essayRevisionLocks.get(`${ownerId}:${recordId}`) : undefined;
          const lockedRevision = essayLock?.get();
          const expectedRevision = operation === "essays.autosave"
            ? lockedRevision ?? inputRevision ?? confirmedRevisions.get(revisionKey) ?? revisionFor?.(stateRef.current, input)
            : inputRevision ?? lockedRevision ?? confirmedRevisions.get(revisionKey) ?? revisionFor?.(stateRef.current, input);
          try {
            const payload: Record<string, unknown> = operation === "planning.generate"
              ? { ...(input as object), windows: store.getSnapshot().windows, commitments: store.getSnapshot().commitments }
              : { ...(input as Record<string, unknown>) };
            delete payload.revision;
            const result = await mutationRef.current({
              ownerId,
              operation,
              payload: payload as Record<string, unknown>,
              requestId: requestId!,
              ...(expectedRevision === undefined ? {} : { expectedRevision }),
            });
            requestIds.current.delete(key);
            if (result.revision !== undefined && Number.isFinite(recordId)) {
              confirmedRevisions.set(revisionKey, result.revision);
              essayLock?.set(result.revision);
            }
            try { await refresh(); } catch { /* The mutation response remains authoritative; query status reports reconciliation failure. */ }
            await successRef.current?.(result, input);
            return result;
          } catch (cause) {
            const error = cause instanceof Error ? cause : new Error("Não foi possível confirmar esta alteração no Supabase.");
            await errorRef.current?.(error, input);
            throw error;
          }
        };
        if (!operation.startsWith("essays.autosave")) return perform();
        const queueKey = `${ownerId}:essay:${Number((input as { id: number }).id)}`;
        const previous = essayWriteQueues.get(queueKey);
        const queued = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(perform);
        essayWriteQueues.set(queueKey, queued);
        try { return await queued as OperationResult; }
        finally { if (essayWriteQueues.get(queueKey) === queued) essayWriteQueues.delete(queueKey); }
      }, [operation, ownerId, refresh, revisionFor, store]);
      return {
        isPending: mutation.isPending,
        error: mutation.error as Error | null,
        mutateAsync,
        mutate: (input: I) => { void mutateAsync(input).catch(() => {}); },
        reset: mutation.reset,
      };
    },
  };
}
const rowRevision = (state: StudyState | undefined, collection: keyof StudyState, id: number | undefined) => {
  if (!state || id === undefined) return undefined;
  const row = (state[collection] as Array<{ id: number; revision?: number }>).find(item => item.id === id);
  return row?.revision;
};
const byIdRevision = (collection: keyof StudyState) => (state: StudyState | undefined, input: { id: number }) => rowRevision(state, collection, input.id);
const essayRevision = (state: StudyState | undefined, input: { id?: number; essayId?: number }) => rowRevision(state, "essays", input.id ?? input.essayId);

const temporaryMutation = <I, O>(run: (store: StudyStore, input: I) => O) => ({
  useMutation(options: MutationOptions<I, O> = {}) {
    const { store } = useContextValue();
    useTemporaryRevision();
    const [isPending, setPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const mutateAsync = async (input: I): Promise<O> => {
      setPending(true); setError(null);
      try {
        const result = run(store, input);
        await optionsRef.current.onSuccess?.(result, input);
        return result;
      } catch (cause) {
        const problem = cause instanceof Error ? cause : new Error("Não foi possível atualizar este dado temporário.");
        setError(problem);
        await optionsRef.current.onError?.(problem, input);
        throw problem;
      } finally { setPending(false); }
    };
    return { isPending, error, mutateAsync, mutate: (input: I) => { void mutateAsync(input).catch(() => {}); }, reset: () => setError(null) };
  },
});
const localQuery = <I, O>(read: (store: StudyStore, input?: I) => O) => ({
  useQuery(input?: I) {
    const { store } = useContextValue();
    const revision = useTemporaryRevision();
    const data = useMemo(() => read(store, input), [store, revision, JSON.stringify(input)]);
    return { data, isLoading: false, isFetching: false, error: null as Error | null, refetch: async () => ({ data: read(store, input) }) };
  },
});
export const study = {
  useUtils: () => {
    const utils = trpc.useUtils();
    const { ownerId } = useContextValue();
    const invalidate = { invalidate: async (_input?: unknown) => utils.study.snapshot.invalidate({ ownerId }) };
    return {
      dashboard: invalidate, exams: { list: invalidate, detail: invalidate, topics: invalidate },
      essays: { list: invalidate, detail: invalidate }, routine: { list: invalidate },
      flows: { active: invalidate, series: invalidate }, planning: { list: invalidate, detail: invalidate },
      resources: { list: invalidate },
      study: { snapshot: invalidate },
    };
  },
  dashboard: query((state) => state),
  exams: {
    list: query(state => state.exams),
    detail: query((state, input?: { id: number }) => {
      const id = input?.id;
      return { exam: state.exams.find(row => row.id === id), topics: state.topics.filter(row => row.examId === id), blocks: state.blocks.filter(row => row.examId === id), essays: state.essays.filter(row => row.examId === id) };
    }),
    topics: query((state, input?: { examId?: number }) => state.topics.filter(row => input?.examId === undefined || row.examId === input.examId)),
    create: makeOperation<any>("exams.create"),
    update: makeOperation<any>("exams.update", (s, i) => rowRevision(s, "exams", i.id)),
    close: makeOperation<any>("exams.close", byIdRevision("exams")),
    delete: makeOperation<{ id: number }>("exams.delete", byIdRevision("exams")),
    createTopic: makeOperation<any>("exams.createTopic"),
    updateTopic: makeOperation<any>("exams.updateTopic", byIdRevision("topics")),
    deleteTopic: makeOperation<{ id: number }>("exams.deleteTopic", byIdRevision("topics")),
  },
  routine: {
    list: localQuery(store => store.queries.routine.list()),
    addWindow: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["routine"]["addWindow"]>[0]) => s.mutations.routine.addWindow(i)),
    updateWindow: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["routine"]["updateWindow"]>[0]) => s.mutations.routine.updateWindow(i)),
    deleteWindow: temporaryMutation((s, i: { id: number }) => s.mutations.routine.deleteWindow(i)),
    addCommitment: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["routine"]["addCommitment"]>[0]) => s.mutations.routine.addCommitment(i)),
    updateCommitment: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["routine"]["updateCommitment"]>[0]) => s.mutations.routine.updateCommitment(i)),
    deleteCommitment: temporaryMutation((s, i: { id: number }) => s.mutations.routine.deleteCommitment(i)),
  },
  planning: {
    list: query(state => state.blocks),
    detail: query((state, input?: { id: number }) => {
      const block = state.blocks.find(row => row.id === input?.id);
      return { block, exam: state.exams.find(row => row.id === block?.examId), windows: state.windows };
    }),
    generate: makeOperation<{ weekStart?: string; windows?: unknown[]; commitments?: unknown[] }>("planning.generate"),
    updateStatus: makeOperation<any>("planning.updateStatus", byIdRevision("blocks")),
  },
  flows: {
    active: query((state, _input, serverNow, clockSampleAt) => {
      const session = state.sessions.find(row => row.status === "running" || row.status === "paused");
      if (!session) return null;
      const block = state.blocks.find(row => row.id === session.blockId);
      const baseMs = (session.accumulatedSeconds ?? 0) * 1000;
      const resumed = session.status === "running" && session.lastResumedAt
        ? new Date(session.lastResumedAt).getTime()
        : null;
      const elapsedSeconds = Math.floor((baseMs + (resumed && serverNow ? Math.max(0, serverNow.getTime() - resumed) : 0)) / 1000);
      return {
        session, block, exam: state.exams.find(row => row.id === block?.examId),
        essay: state.essays.find(row => row.id === block?.essayId),
        elapsedSeconds, clockSampleAt: clockSampleAt ?? (typeof performance === "undefined" ? 0 : performance.now()),
      };
    }),
    series: query((state, input?: { days?: number }) => dailyFlowSeries(state.sessions, Math.min(30, Math.max(2, input?.days ?? 7)))),
    createAdHoc: makeOperation<{ examId?: number; essayId?: number }>("flows.createAdHoc"),
    start: makeOperation<{ blockId: number }>("flows.start", (s, i) => rowRevision(s, "blocks", i.blockId)),
    pause: makeOperation<{ id: number }>("flows.pause", byIdRevision("sessions")),
    resume: makeOperation<{ id: number }>("flows.resume", byIdRevision("sessions")),
    complete: makeOperation<{ id: number }>("flows.complete", byIdRevision("sessions")),
    cancel: makeOperation<{ id: number }>("flows.cancel", byIdRevision("sessions")),
  },
  resources: {
    list: localQuery(store => store.queries.resources.list()),
    create: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["resources"]["create"]>[0]) => s.mutations.resources.create(i)),
    update: temporaryMutation((s, i: Parameters<StudyStore["mutations"]["resources"]["update"]>[0]) => s.mutations.resources.update(i)),
    delete: temporaryMutation((s, i: { id: number }) => s.mutations.resources.delete(i)),
  },
  essays: {
    list: query(state => state.essays),
    detail: query((state, input?: { id: number }) => ({ essay: state.essays.find(row => row.id === input?.id), parts: state.parts.filter(row => row.essayId === input?.id).sort((a, b) => a.sortOrder - b.sortOrder), versions: state.versions.filter(row => row.essayId === input?.id).sort((a, b) => b.versionNumber - a.versionNumber), feedback: state.feedback.filter(row => row.essayId === input?.id) })),
    create: makeOperation<any>("essays.create"),
    save: makeOperation<any>("essays.save", essayRevision),
    autosave: makeOperation<any>("essays.autosave", essayRevision),
    delete: makeOperation<{ id: number }>("essays.delete", byIdRevision("essays")),
    createPart: makeOperation<any>("essays.createPart", essayRevision),
    updatePart: makeOperation<any>("essays.updatePart", (s, i) => {
      const part = s?.parts.find(row => row.id === i.id);
      return rowRevision(s, "essays", part?.essayId);
    }),
    deletePart: makeOperation<{ id: number }>("essays.deletePart", (s, i) => {
      const part = s?.parts.find(row => row.id === i.id);
      return rowRevision(s, "essays", part?.essayId);
    }),
    reorderParts: makeOperation<{ essayId: number; partIds: number[] }>("essays.reorderParts", essayRevision),
    applyPart: makeOperation<{ essayId: number; partId: number; currentText: string }>("essays.applyPart", essayRevision),
    feedback: makeOperation<any>("essays.feedback", essayRevision),
    restoreVersion: makeOperation<{ id: number; versionId: number }>("essays.restoreVersion", essayRevision),
  },
};
