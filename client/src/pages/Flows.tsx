import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { useAccessibleModal } from "@/components/useAccessibleModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { study as trpc } from "@/lib/study";
import { BookOpen, CalendarDays, Check, ChevronDown, FileText, History, Pause, Play, Plus, RotateCcw, Sparkles, Target, Timer, X } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

const LazyFlowChart = lazy(() => import("@/components/FlowChart"));
const formatTime = (totalSeconds: number) => `${String(Math.floor(Math.max(0, totalSeconds) / 3600)).padStart(2, "0")}:${String(Math.floor((Math.max(0, totalSeconds) % 3600) / 60)).padStart(2, "0")}:${String(Math.max(0, totalSeconds) % 60).padStart(2, "0")}`;
const statusLabel: Record<string, string> = { planned: "Disponível", accepted: "Pronta", in_progress: "Em andamento", completed: "Concluída", postponed: "Adiada", cancelled: "Cancelada" };

function Frame({ children }: { children: React.ReactNode }) { return <div className="page-frame"><div className="page-heading"><div><p className="eyebrow">Execução</p><h1 className="display-title">Flows</h1><p className="body-copy mt-2 max-w-2xl">Entre em foco, registre o tempo real e acompanhe seu ritmo sem transformar estudo em cobrança.</p></div></div>{children}<PeriodHistory /></div>; }

function PeriodHistory() {
  const { data, isLoading, error } = trpc.dashboard.useQuery();
  const utils = trpc.useUtils();
  if (isLoading) return <section className="soft-card p-6 mt-5" aria-label="Carregando períodos"><div className="h-4 w-40 rounded bg-[var(--edu-blue-soft)] animate-pulse" /><div className="h-12 mt-4 rounded bg-[var(--edu-blue-soft)] animate-pulse" /></section>;
  if (error) return <section className="soft-card p-6 mt-5" role="alert"><p className="card-title">Não foi possível carregar os períodos de execução.</p><Button variant="outline" className="soft-button-secondary mt-3" onClick={() => utils.study.snapshot.invalidate()}>Tentar novamente</Button></section>;
  const sessions = new Map((data?.sessions ?? []).filter(session => session.status === "completed" || session.status === "cancelled").map(session => [session.id, session]));
  const periods = (data?.periods ?? []).filter(period => sessions.has(period.sessionId)).slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const elapsed = (ms: number | null) => {
    const total = Math.floor(Math.max(0, ms ?? 0) / 1000);
    return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor(total % 3600 / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  return <section className="soft-card p-6 mt-5" aria-labelledby="flow-periods-title"><div className="section-row"><div><p className="eyebrow">Registro de execução</p><h2 id="flow-periods-title" className="card-title mt-1">Períodos reais</h2></div><span className="caption">{periods.length} intervalos</span></div>{periods.length ? <div className="history-list mt-4">{periods.map(period => { const session = sessions.get(period.sessionId); return <div className="history-row" key={period.id}><span className="history-dot" /><div className="min-w-0 flex-1"><p className="font-semibold">{session?.status === "cancelled" ? "Flow cancelado" : "Flow concluído"} · {elapsed(period.elapsedMs)}</p><p className="caption mt-1">{new Date(period.startedAt).toLocaleString("pt-BR")} – {period.endedAt ? new Date(period.endedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "período em andamento"}</p></div></div>; })}</div> : <div className="compact-empty mt-4"><History size={18} /><p className="caption">Os intervalos registrados pelo cronômetro aparecerão aqui. Pausas não entram no tempo acumulado.</p></div>}</section>;
}

function SelectionModal({ blocks, exams, essays, sessions, onSelectBlock, onSelectExam, onSelectEssay, onClose }: { blocks: any[]; exams: any[]; essays: any[]; sessions: any[]; onSelectBlock: (id: number) => void; onSelectExam: (id: number) => void; onSelectEssay: (id: number) => void; onClose: () => void }) {
  const dialogRef = useAccessibleModal<HTMLDivElement>(onClose);
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div ref={dialogRef} className="modal-card flow-picker" role="dialog" aria-modal="true" aria-labelledby="flow-picker-title" tabIndex={-1}><div className="section-row"><div><p className="eyebrow">Contexto do Flow</p><h2 id="flow-picker-title" className="card-title mt-1">O que você vai estudar?</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div><div className="flow-picker-section mt-6"><div className="section-row"><div><p className="eyebrow">Contextos de estudo</p><p className="caption mt-1">Sessões, provas e redações disponíveis</p></div><span className="status-pill status-blue">{blocks.length + exams.length + essays.length}</span></div><div className="picker-list mt-3">{blocks.map(block => <button key={`block-${block.id}`} className="picker-row" onClick={() => onSelectBlock(block.id)}><div className="icon-bubble bubble-blue"><CalendarDays size={16} /></div><div className="min-w-0 flex-1 text-left"><p className="font-semibold truncate">{block.title}</p><p className="caption mt-1">{block.durationMinutes} min · {statusLabel[block.status]}</p></div><ChevronDown className="-rotate-90" size={16} /></button>)}{exams.map(exam => <button key={`exam-${exam.id}`} className="picker-row" onClick={() => onSelectExam(exam.id)}><div className="icon-bubble bubble-mint"><Target size={16} /></div><div className="min-w-0 flex-1 text-left"><p className="font-semibold truncate">{exam.name}</p><p className="caption mt-1">{exam.institution} · sessão avulsa</p></div><Plus size={16} /></button>)}{essays.map(essay => <button key={`essay-${essay.id}`} className="picker-row" onClick={() => onSelectEssay(essay.id)}><div className="icon-bubble bubble-pink"><FileText size={16} /></div><div className="min-w-0 flex-1 text-left"><p className="font-semibold truncate">{essay.title}</p><p className="caption mt-1">{essay.theme || "Redação"} · revisão</p></div><Plus size={16} /></button>)}{!blocks.length && !exams.length && !essays.length && <div className="compact-empty"><Target size={18} /><p className="caption">Adicione uma prova ou redação para começar um Flow.</p></div>}</div></div><div className="flow-picker-section mt-6"><div className="section-row"><div><p className="eyebrow">Histórico recente</p><p className="caption mt-1">Sessões concluídas e canceladas</p></div><History size={17} className="text-[var(--edu-text-secondary)]" /></div>{sessions.length ? <div className="history-list mt-3">{sessions.slice(0, 8).map(session => <div key={session.id} className="history-row"><span className="history-dot" /><div className="min-w-0"><p className="font-semibold">Flow {session.status === "cancelled" ? "cancelado" : "concluído"}</p><p className="caption mt-1">{session.actualMinutes ?? 0} min · {new Date(session.startedAt).toLocaleDateString("pt-BR")}</p></div>{session.status === "cancelled" ? <X size={15} /> : <Check size={15} className="text-[var(--edu-mint-strong)]" />}</div>)}</div> : <p className="caption mt-3">As sessões finalizadas aparecerão aqui.</p>}</div></div></div>;
}

function FlowTimerCard({ active, selectedLabel, onChoose, onPause, onResume, onComplete, onCancel }: { active: any; selectedLabel?: string; onChoose: () => void; onPause: () => void; onResume: () => void; onComplete: () => void; onCancel: () => void }) {
  const [liveSeconds, setLiveSeconds] = useState(active?.elapsedSeconds ?? 0);
  useEffect(() => { setLiveSeconds(active?.elapsedSeconds ?? 0); }, [active?.session?.id, active?.elapsedSeconds]);
  useEffect(() => {
    if (!active || active.session.status !== "running") return;
    const interval = window.setInterval(() => {
      const monotonicNow = typeof performance === "undefined" ? active.clockSampleAt : performance.now();
      setLiveSeconds(Math.floor(active.elapsedSeconds + Math.max(0, monotonicNow - active.clockSampleAt) / 1000));
    }, 250);
    return () => window.clearInterval(interval);
  }, [active?.session?.id, active?.session?.status, active?.elapsedSeconds, active?.clockSampleAt]);
  const running = active?.session.status === "running";
  const paused = active?.session.status === "paused";
  return <section className="soft-card flow-timer-card"><div className="section-row"><div><p className="eyebrow">Flow ativo</p><button className="flow-context-button mt-2" onClick={onChoose}>{active?.block?.title || selectedLabel || "Escolher contexto"}<ChevronDown size={15} /></button></div><button className="icon-button" onClick={onChoose} aria-label="Escolher sessão ou prova"><Target size={18} /></button></div><div className={cn("timer-display", running && "is-running", paused && "is-paused")}><div className="timer-glow" /><span>{formatTime(liveSeconds)}</span><small>{running ? "em foco agora" : paused ? "pausado nesta sessão" : "pronto para começar"}</small></div><div className="flow-timer-actions">{!active ? <Button className="soft-button-primary w-full" onClick={onChoose}><Target size={16} /> Escolher sessão ou prova</Button> : running ? <><Button className="soft-button-secondary flex-1" onClick={onPause}><Pause size={16} /> Pausar</Button><Button className="soft-button-primary flex-1" onClick={onComplete}><Check size={16} /> Finalizar</Button></> : <><Button className="soft-button-primary flex-1" onClick={onResume}><Play size={16} /> Retomar</Button><Button variant="outline" className="soft-button-secondary" onClick={onCancel} aria-label="Cancelar Flow"><X size={16} /></Button></>}</div><p className="caption text-center mt-4">O tempo é confirmado pelo Supabase e continua entre dispositivos; pausas não entram na duração.</p></section>;
}

export default function Flows() {
  const [location] = useLocation();
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardQueryError } = trpc.dashboard.useQuery();
  const activeQuery = trpc.flows.active.useQuery();
  const seriesQuery = trpc.flows.series.useQuery({ days: 7 });
  const utils = trpc.useUtils();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const deepLinkStarted = useRef("");
  const start = trpc.flows.start.useMutation({ onSuccess: async () => { await utils.flows.active.invalidate(); await utils.dashboard.invalidate(); setPickerOpen(false); } });
  const createAdHoc = trpc.flows.createAdHoc.useMutation({ onSuccess: result => { if (result.id) start.mutate({ blockId: result.id }); } });
  const pause = trpc.flows.pause.useMutation({ onSuccess: () => utils.flows.active.invalidate() });
  const resume = trpc.flows.resume.useMutation({ onSuccess: () => utils.flows.active.invalidate() });
  const complete = trpc.flows.complete.useMutation({ onSuccess: async () => { await utils.flows.active.invalidate(); await utils.flows.series.invalidate(); await utils.dashboard.invalidate(); } });
  const cancel = trpc.flows.cancel.useMutation({ onSuccess: async () => { await utils.flows.active.invalidate(); await utils.flows.series.invalidate(); await utils.dashboard.invalidate(); setCancelOpen(false); } });
  const queryBlock = new URLSearchParams(location.split("?")[1] ?? "").get("block");
  const queryExam = new URLSearchParams(location.split("?")[1] ?? "").get("exam");
  useEffect(() => {
    if (!queryBlock || !dashboard || activeQuery.isLoading || activeQuery.data || deepLinkStarted.current === queryBlock) return;
    if (dashboard.blocks.some(block => block.id === Number(queryBlock))) {
      deepLinkStarted.current = queryBlock;
      start.mutate({ blockId: Number(queryBlock) });
    }
  }, [queryBlock, dashboard, activeQuery.isLoading, activeQuery.data, start]);
  useEffect(() => { if (queryBlock && dashboard?.blocks.some(block => block.id === Number(queryBlock))) setSelectedLabel(dashboard.blocks.find(block => block.id === Number(queryBlock))?.title ?? ""); }, [queryBlock, dashboard?.blocks]);
  useEffect(() => { if (queryExam && dashboard?.exams.some(exam => exam.id === Number(queryExam))) setSelectedLabel(dashboard.exams.find(exam => exam.id === Number(queryExam))?.name ?? ""); }, [queryExam, dashboard?.exams]);
  const active = activeQuery.data;
  const executableBlocks = useMemo(() => (dashboard?.blocks ?? []).filter(block => ["planned", "accepted", "in_progress"].includes(block.status)), [dashboard?.blocks]);
  const activeExams = useMemo(() => (dashboard?.exams ?? []).filter(exam => exam.status === "active"), [dashboard?.exams]);
  if (dashboardLoading || activeQuery.isLoading) return <Frame><div className="soft-card p-12 grid place-items-center" role="status"><Timer className="animate-pulse" /> <span className="caption mt-3">Consultando seus Flows…</span></div></Frame>;
  if (dashboardQueryError || activeQuery.error || seriesQuery.error) return <Frame><div className="soft-card p-8" role="alert"><p className="card-title">Não foi possível carregar seus Flows.</p><p className="body-copy mt-2">O histórico e o cronômetro não foram substituídos por dados temporários.</p><Button className="soft-button-primary mt-4" onClick={() => { void utils.study.snapshot.invalidate(); }}>Tentar novamente</Button></div></Frame>;
  const chooseBlock = (id: number) => start.mutate({ blockId: id });
  const chooseExam = (id: number) => createAdHoc.mutate({ examId: id });
  const chooseEssay = (id: number) => createAdHoc.mutate({ essayId: id });
  const history = (dashboard?.sessions ?? []).filter(session => session.status === "completed" || session.status === "cancelled").slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return <Frame><div className="flow-intro"><div className="flow-intro-badge"><Sparkles size={15} /> foco possível</div><p>Selecione um contexto, comece pelo tempo que você tem e deixe o histórico mostrar o caminho.</p></div><div className="flows-grid mt-5"><FlowTimerCard active={active} selectedLabel={selectedLabel} onChoose={() => setPickerOpen(true)} onPause={() => active && pause.mutate({ id: active.session.id })} onResume={() => active && resume.mutate({ id: active.session.id })} onComplete={() => active && complete.mutate({ id: active.session.id })} onCancel={() => active && setCancelOpen(true)} /><Suspense fallback={<section className="soft-card flow-chart-card chart-empty"><Timer className="animate-pulse" size={20} /></section>}><LazyFlowChart series={seriesQuery.data} isLoading={seriesQuery.isLoading} /></Suspense></div>{(start.error || createAdHoc.error || pause.error || resume.error || complete.error || cancel.error) && <div className="inline-error mt-4" role="alert"><RotateCcw size={15} /> {start.error?.message.includes("ACTIVE_FLOW") ? "Você já tem um Flow ativo. Finalize ou cancele antes de iniciar outro." : "A alteração não foi confirmada no Supabase. Seu estado atual continua visível; tente novamente."}</div>}{pickerOpen && <SelectionModal blocks={executableBlocks} exams={activeExams} essays={(dashboard?.essays ?? []).filter(essay => essay.status !== "revised")} sessions={history} onSelectBlock={chooseBlock} onSelectExam={chooseExam} onSelectEssay={chooseEssay} onClose={() => setPickerOpen(false)} />}<ConfirmActionDialog open={cancelOpen} onOpenChange={open => !open && setCancelOpen(false)} title="Cancelar este Flow?" description="A sessão será encerrada e o contexto poderá ser usado novamente. O tempo já registrado continuará no histórico desta sessão." confirmLabel="Cancelar Flow" pending={cancel.isPending} onConfirm={() => active && cancel.mutate({ id: active.session.id })} /><div className="soft-card p-6 mt-5"><div className="section-row"><div><p className="eyebrow">Histórico confirmado</p><h2 className="card-title mt-1">Tempo em movimento</h2></div><History size={18} /></div>{history.length ? <div className="history-list mt-4">{history.map(session => <div className="history-row" key={session.id}><span className="history-dot" /><div className="min-w-0 flex-1"><p className="font-semibold">Flow {session.status === "cancelled" ? "cancelado" : "concluído"}</p><p className="caption mt-1">{session.actualMinutes ?? Math.floor((session.accumulatedSeconds ?? 0) / 60)} min · {new Date(session.startedAt).toLocaleString("pt-BR")}</p></div>{session.status === "cancelled" ? <X size={15} aria-label="Cancelado" /> : <Check size={15} className="text-[var(--edu-mint-strong)]" aria-label="Concluído" />}</div>)}</div> : <div className="compact-empty mt-4"><History size={18} /><p className="caption">Seu histórico confirmado começa ao encerrar ou cancelar um Flow.</p></div>}</div><div className="flow-support-grid mt-5"><div className="soft-card p-6"><div className="icon-bubble bubble-blue"><BookOpen size={17} /></div><h2 className="card-title mt-4">Um Flow não precisa ser perfeito</h2><p className="body-copy mt-2">Se você tiver 25 minutos, use 25. O valor está em registrar o que realmente aconteceu.</p></div><div className="soft-card p-6"><div className="icon-bubble bubble-mint"><Check size={17} /></div><h2 className="card-title mt-4">Tempo real, sem arredondamentos falsos</h2><p className="body-copy mt-2">O cronômetro oficial acumula apenas períodos em execução. Pausas não contam.</p></div></div></Frame>;
}
