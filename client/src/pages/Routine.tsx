import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { study as trpc } from "@/lib/study";
import { Check, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
type WindowForm = { weekday: string; startTime: string; endTime: string; maxMinutes: string; preference: string };
type CommitmentForm = { title: string; weekday: string; startTime: string; endTime: string };
const blankWindow: WindowForm = { weekday: "1", startTime: "19:00", endTime: "20:30", maxMinutes: "90", preference: "" };
const blankCommitment: CommitmentForm = { title: "", weekday: "1", startTime: "08:00", endTime: "09:00" };

export default function Routine() {
  const { data, isLoading, error } = trpc.routine.list.useQuery();
  const utils = trpc.useUtils();
  const refresh = () => utils.routine.list.invalidate();
  const addWindow = trpc.routine.addWindow.useMutation({ onSuccess: refresh });
  const updateWindow = trpc.routine.updateWindow.useMutation({ onSuccess: () => { refresh(); setEditingWindow(null); } });
  const deleteWindow = trpc.routine.deleteWindow.useMutation({ onSuccess: refresh });
  const addCommitment = trpc.routine.addCommitment.useMutation({ onSuccess: refresh });
  const updateCommitment = trpc.routine.updateCommitment.useMutation({ onSuccess: () => { refresh(); setEditingCommitment(null); } });
  const deleteCommitment = trpc.routine.deleteCommitment.useMutation({ onSuccess: refresh });
  const [windowForm, setWindowForm] = useState(blankWindow);
  const [commitmentForm, setCommitmentForm] = useState(blankCommitment);
  const [editingWindow, setEditingWindow] = useState<any>(null);
  const [editingCommitment, setEditingCommitment] = useState<any>(null);
  const [deleting, setDeleting] = useState<{ id: number; kind: "window" | "commitment" } | null>(null);
  const windows = data?.windows ?? [];
  const commitments = data?.commitments ?? [];
  const submitWindow = () => {
    const payload = { weekday: Number(windowForm.weekday), startTime: windowForm.startTime, endTime: windowForm.endTime, maxMinutes: Number(windowForm.maxMinutes), preference: windowForm.preference || undefined };
    editingWindow ? updateWindow.mutate({ id: editingWindow.id, ...payload }) : addWindow.mutate(payload);
    if (!editingWindow) setWindowForm(blankWindow);
  };
  const submitCommitment = () => {
    const payload = { title: commitmentForm.title.trim(), weekday: Number(commitmentForm.weekday), startTime: commitmentForm.startTime, endTime: commitmentForm.endTime };
    editingCommitment ? updateCommitment.mutate({ id: editingCommitment.id, ...payload }) : addCommitment.mutate(payload);
    if (!editingCommitment) setCommitmentForm(blankCommitment);
  };
  const busy = addWindow.isPending || updateWindow.isPending || addCommitment.isPending || updateCommitment.isPending;
  const mutationError = addWindow.error || updateWindow.error || deleteWindow.error || addCommitment.error || updateCommitment.error || deleteCommitment.error;
  return <div className="page-frame">
    <div className="page-heading"><div><p className="eyebrow">Seu ritmo</p><h1 className="display-title">Minha rotina</h1><p className="body-copy mt-2 max-w-2xl">Disponibilidade real, compromissos que você escolher e nenhum horário preenchido por nós.</p></div></div>
    {isLoading ? <div className="soft-card p-8" role="status">Carregando sua rotina temporária…</div> : error ? <div className="soft-card p-8" role="alert"><h2 className="card-title">A rotina não carregou</h2><p className="body-copy mt-2">Tente novamente.</p><Button onClick={() => refresh()} className="soft-button-primary mt-4">Tentar novamente</Button></div> : <div className="routine-layout">
      <section className="soft-card p-6"><div className="section-row"><div><p className="eyebrow">Janelas para estudar</p><h2 className="card-title mt-1">Quando cabe?</h2></div><div className="icon-bubble bubble-blue"><Clock3 size={18} /></div></div>
        {windows.length ? <div className="stack-list mt-5">{windows.map((w: any) => <div key={w.id} className="study-row"><div className="time-chip">{w.startTime}</div><div className="study-row-main"><p className="font-semibold">{weekdays[w.weekday]} · {w.startTime}–{w.endTime}</p><p className="caption mt-1">{w.maxMinutes} min{w.preference ? ` · ${w.preference}` : ""}</p></div><button className="icon-button" onClick={() => { setEditingWindow(w); setWindowForm({ weekday: String(w.weekday), startTime: w.startTime, endTime: w.endTime, maxMinutes: String(w.maxMinutes), preference: w.preference ?? "" }); }} aria-label="Editar janela"><Pencil size={15} /></button><button className="icon-button" onClick={() => setDeleting({ id: w.id, kind: "window" })} aria-label="Excluir janela"><Trash2 size={15} /></button></div>)}</div> : <div className="compact-empty mt-5"><Clock3 size={19} /><p className="caption">Nenhuma janela adicionada. Você escolhe quando estudar.</p></div>}
        <div className="form-stack mt-6"><p className="eyebrow">{editingWindow ? "Editar janela" : "Adicionar janela"}</p><label className="field-label"><span>Dia</span><select className="soft-select" value={windowForm.weekday} onChange={e => setWindowForm({ ...windowForm, weekday: e.target.value })}>{weekdays.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></label><div className="two-inputs"><label className="field-label"><span>De</span><Input type="time" value={windowForm.startTime} onChange={e => setWindowForm({ ...windowForm, startTime: e.target.value })} /></label><label className="field-label"><span>Até</span><Input type="time" value={windowForm.endTime} onChange={e => setWindowForm({ ...windowForm, endTime: e.target.value })} /></label></div><label className="field-label"><span>Limite em minutos</span><Input type="number" min="15" max="600" value={windowForm.maxMinutes} onChange={e => setWindowForm({ ...windowForm, maxMinutes: e.target.value })} /></label><Input aria-label="Preferência opcional" value={windowForm.preference} onChange={e => setWindowForm({ ...windowForm, preference: e.target.value })} placeholder="Preferência (opcional)" /><div className="flex gap-2"><Button className="soft-button-primary" disabled={busy || !windowForm.startTime || !windowForm.endTime} onClick={submitWindow}><Check size={15} />{editingWindow ? "Atualizar janela" : "Adicionar janela"}</Button>{editingWindow && <Button variant="outline" className="soft-button-secondary" onClick={() => { setEditingWindow(null); setWindowForm(blankWindow); }}><X size={15} /> Cancelar</Button>}</div></div>
      </section>
      <section className="soft-card p-6"><p className="eyebrow">Compromissos</p><h2 className="card-title mt-1">O que já ocupa seu dia?</h2><p className="caption mt-2">Cadastre seus compromissos. Nenhum exemplo vem pré-preenchido.</p>
        {commitments.length ? <div className="stack-list mt-5">{commitments.map((c: any) => <div className="study-row" key={c.id}><div className="time-chip">{c.startTime}</div><div className="study-row-main"><p className="font-semibold">{c.title}</p><p className="caption mt-1">{weekdays[c.weekday]} · {c.startTime}–{c.endTime}</p></div><button className="icon-button" onClick={() => { setEditingCommitment(c); setCommitmentForm({ title: c.title, weekday: String(c.weekday), startTime: c.startTime, endTime: c.endTime }); }} aria-label={`Editar ${c.title}`}><Pencil size={15} /></button><button className="icon-button" onClick={() => setDeleting({ id: c.id, kind: "commitment" })} aria-label={`Excluir ${c.title}`}><Trash2 size={15} /></button></div>)}</div> : <div className="compact-empty mt-5"><p className="caption">Ainda não há compromissos.</p></div>}
        <div className="form-stack mt-6"><p className="eyebrow">{editingCommitment ? "Editar compromisso" : "Adicionar compromisso"}</p><Input aria-label="Nome do compromisso" placeholder="Nome" value={commitmentForm.title} onChange={e => setCommitmentForm({ ...commitmentForm, title: e.target.value })} /><label className="field-label"><span>Dia</span><select className="soft-select" value={commitmentForm.weekday} onChange={e => setCommitmentForm({ ...commitmentForm, weekday: e.target.value })}>{weekdays.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></label><div className="two-inputs"><Input aria-label="Início" type="time" value={commitmentForm.startTime} onChange={e => setCommitmentForm({ ...commitmentForm, startTime: e.target.value })} /><Input aria-label="Fim" type="time" value={commitmentForm.endTime} onChange={e => setCommitmentForm({ ...commitmentForm, endTime: e.target.value })} /></div><Button className="soft-button-primary" disabled={busy || !commitmentForm.title.trim()} onClick={submitCommitment}><Plus size={15} />{editingCommitment ? "Atualizar compromisso" : "Adicionar compromisso"}</Button>{editingCommitment && <Button variant="outline" className="soft-button-secondary" onClick={() => { setEditingCommitment(null); setCommitmentForm(blankCommitment); }}>Cancelar edição</Button>}</div>
      </section>
    </div>}
    {mutationError && <p className="inline-error mt-4" role="alert">{mutationError.message}</p>}
    <p className="caption mt-5">Tudo nesta tela é temporário e será apagado ao recarregar, sair ou trocar de conta.</p>
    <ConfirmActionDialog open={Boolean(deleting)} onOpenChange={open => !open && setDeleting(null)} title="Remover este item?" description="A alteração vale apenas para esta sessão temporária." confirmLabel="Remover" pending={deleteWindow.isPending || deleteCommitment.isPending} onConfirm={() => { if (deleting?.kind === "window") deleteWindow.mutate({ id: deleting.id }); if (deleting?.kind === "commitment") deleteCommitment.mutate({ id: deleting.id }); setDeleting(null); }} />
  </div>;
}
