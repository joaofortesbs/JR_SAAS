import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Archive, CalendarDays, Check, ChevronRight, CircleAlert, Edit3, Flag, Plus, Target, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const priorityLabel: Record<string, string> = { principal: "Principal", alta: "Alta", media: "Média", baixa: "Baixa" };
const daysUntil = (date: string) => Math.max(0, Math.ceil((new Date(`${date}T12:00:00`).getTime() - Date.now()) / 86400000));
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(" de ", " ");

type FormState = { name: string; institution: string; date: string; priority: "principal" | "alta" | "media" | "baixa"; notes: string };
const blankForm: FormState = { name: "", institution: "", date: "", priority: "alta", notes: "" };

function Frame({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="page-frame"><div className="page-heading"><div><p className="eyebrow">Direção</p><h1 className="display-title">Provas</h1><p className="body-copy mt-2 max-w-2xl">Cada prazo vira uma prioridade visível — sem perder o panorama entre ENEM e vestibulares.</p></div>{action}</div>{children}</div>;
}

function ExamForm({ initial, editingId, onClose, onSaved }: { initial: FormState; editingId?: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const create = trpc.exams.create.useMutation({ onSuccess: async () => { await utils.exams.list.invalidate(); await utils.dashboard.invalidate(); onSaved(); } });
  const update = trpc.exams.update.useMutation({ onSuccess: async () => { await utils.exams.list.invalidate(); await utils.dashboard.invalidate(); onSaved(); } });
  const pending = create.isPending || update.isPending;
  const submit = () => {
    if (!form.name || !form.institution || !form.date) { setError("Preencha nome, instituição e prazo."); return; }
    setError("");
    if (editingId) update.mutate({ id: editingId, ...form });
    else create.mutate({ ...form, phase: "Prova principal", color: "mint" });
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="exam-form-title"><div className="section-row"><div><p className="eyebrow">{editingId ? "Editar objetivo" : "Novo objetivo"}</p><h2 id="exam-form-title" className="card-title mt-1">{editingId ? "Atualize os dados da prova" : "Qual prova está guiando seu ano?"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div><div className="form-grid mt-6"><Input placeholder="Nome da prova (ex.: ENEM 2026)" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><Input placeholder="Instituição (ex.: INEP)" value={form.institution} onChange={event => setForm({ ...form, institution: event.target.value })} /><label className="field-label"><span>Prazo</span><Input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label className="field-label"><span>Prioridade</span><select className="soft-select" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as FormState["priority"] })}><option value="principal">Principal</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></label></div><Textarea className="mt-4" placeholder="Observação opcional" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />{error && <p className="inline-error mt-4"><CircleAlert size={15} /> {error}</p>}<div className="flex justify-end gap-2 mt-6"><Button variant="outline" className="soft-button-secondary" onClick={onClose}>Cancelar</Button><Button className="soft-button-primary" onClick={submit} disabled={pending}><Check size={16} /> {pending ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar prova"}</Button></div></div></div>;
}

function ExamCard({ exam, onEdit, onClose }: { exam: any; onEdit: () => void; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const closed = exam.status !== "active";
  return <article className={cn("exam-grid-card soft-card", closed && "is-closed")}><div className="flex items-start justify-between gap-3"><div className={cn("icon-bubble", closed ? "bubble-blue" : "bubble-mint")}><Target size={18} /></div><span className={cn("status-pill", closed ? "status-blue" : exam.priority === "principal" ? "status-orange" : "status-lilac")}>{closed ? "Encerrada" : priorityLabel[exam.priority]}</span></div><button className="exam-card-click" onClick={() => setLocation(`/provas/${exam.id}`)}><h2 className="card-title mt-5">{exam.name}</h2><p className="body-copy mt-1">{exam.institution}</p><div className="exam-card-deadline mt-6"><span className="eyebrow">Prazo</span><strong>{dateLabel(exam.date)}</strong><span className="caption">{closed ? "histórico preservado" : `${daysUntil(exam.date)} dias restantes`}</span></div><div className="progress-track mt-5"><div className={cn("progress-fill", closed ? "fill-blue" : "fill-mint")} style={{ width: closed ? "100%" : "18%" }} /></div><div className="flex items-center justify-between caption mt-2"><span>Preparação inicial</span><ChevronRight size={16} /></div></button><div className="exam-card-actions"><button className="text-link" onClick={onEdit}><Edit3 size={14} /> Editar</button>{!closed && <button className="text-link muted-action" onClick={onClose}><Archive size={14} /> Encerrar</button>}</div></article>;
}

export default function Exams() {
  const { data, isLoading, error } = trpc.exams.list.useQuery();
  const utils = trpc.useUtils();
  const close = trpc.exams.close.useMutation({ onSuccess: async () => { await utils.exams.list.invalidate(); await utils.dashboard.invalidate(); } });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<"active" | "closed">("active");
  if (isLoading) return <Frame><div className="soft-card p-12">Carregando provas…</div></Frame>;
  if (error) return <Frame><div className="soft-card p-8"><p className="card-title">Não conseguimos carregar suas provas.</p><p className="body-copy mt-2">Tente novamente. Nenhum dado foi apagado.</p></div></Frame>;
  const exams = (data ?? []).filter(exam => filter === "active" ? exam.status === "active" : exam.status !== "active");
  const formInitial = editing ? { name: editing.name, institution: editing.institution, date: editing.date, priority: editing.priority, notes: editing.notes ?? "" } : blankForm;
  return <Frame action={<Button className="soft-button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Nova prova</Button>}>
    <div className="section-toolbar"><div className="filter-row"><button className={cn("filter-pill", filter === "active" && "active")} onClick={() => setFilter("active")}>Ativas</button><button className={cn("filter-pill", filter === "closed" && "active")} onClick={() => setFilter("closed")}>Histórico</button></div><span className="caption">{exams.length} {filter === "active" ? "provas ativas" : "provas encerradas"}</span></div>
    {exams.length ? <div className="exam-grid mt-5">{exams.map(exam => <ExamCard key={exam.id} exam={exam} onEdit={() => { setEditing(exam); setShowForm(true); }} onClose={() => close.mutate({ id: exam.id, status: "completed" })} />)}<button className="exam-add-card" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={20} /><span>Adicionar outra prova</span><small>Mais um objetivo, mais clareza.</small></button></div> : <div className="soft-card empty-state"><div className="empty-icon"><Target size={22} /></div><h2 className="card-title mt-4">{filter === "active" ? "Nenhuma prova cadastrada" : "Seu histórico está vazio"}</h2><p className="body-copy mt-2 max-w-md mx-auto">{filter === "active" ? "Comece pelas datas que guiam seu ano. Depois, conecte conteúdos, materiais e sessões." : "Provas encerradas continuam preservadas para você olhar sua trajetória."}</p>{filter === "active" && <Button className="soft-button-primary mt-5" onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar primeira prova</Button>}</div>}
    {showForm && <ExamForm initial={formInitial} editingId={editing?.id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setEditing(null); }} />}
  </Frame>;
}

export function ExamDetail({ id }: { id: number }) {
  const { data, isLoading } = trpc.exams.detail.useQuery({ id });
  const [, setLocation] = useLocation();
  if (isLoading) return <Frame><div className="soft-card p-12">Carregando prova…</div></Frame>;
  if (!data?.exam) return <Frame><div className="soft-card empty-state"><div className="empty-icon"><Target size={22} /></div><h2 className="card-title mt-4">Prova não encontrada</h2><Button className="soft-button-primary mt-5" onClick={() => setLocation("/provas")}>Voltar às provas</Button></div></Frame>;
  const exam = data.exam;
  return <Frame action={<Button className="soft-button-primary" onClick={() => setLocation(`/flows?exam=${exam.id}`)}><Flag size={16} /> Iniciar Flow nesta prova</Button>}><button className="text-link mb-5" onClick={() => setLocation("/provas")}><ChevronRight className="rotate-180" size={15} /> Voltar às provas</button><div className="exam-detail-layout"><section className="soft-card exam-detail-hero"><div className="flex items-start justify-between"><div><span className="status-pill status-lilac">{priorityLabel[exam.priority]}</span><h2 className="hero-title mt-5">{exam.name}</h2><p className="body-copy mt-3">{exam.institution} · prazo em {dateLabel(exam.date)}</p></div><div className="icon-bubble bubble-mint"><Target size={20} /></div></div><div className="detail-deadline mt-8"><p className="eyebrow">Contagem até a prova</p><strong>{daysUntil(exam.date)}<span> dias</span></strong></div><p className="body-copy mt-3">Use este objetivo para escolher seus Flows e entender o que já está avançando.</p></section><section className="soft-card p-6"><p className="eyebrow">Cobertura de preparação</p><div className="flex items-end justify-between mt-2"><h2 className="card-title">Conteúdos e sessões</h2><span className="caption">{data.blocks.length} blocos</span></div><div className="progress-track mt-5"><div className="progress-fill fill-mint" style={{ width: `${Math.min(100, data.blocks.length * 12)}%` }} /></div><div className="detail-stat-grid mt-6"><div><p className="caption">Tempo concluído</p><strong>{data.blocks.filter(block => block.status === "completed").reduce((sum, block) => sum + block.durationMinutes, 0)} min</strong></div><div><p className="caption">Redações</p><strong>{data.essays.length}</strong></div></div></section></div><section className="soft-card p-6 mt-5"><div className="section-row"><div><p className="eyebrow">Mapa de conteúdo</p><h2 className="card-title mt-1">O que entra nessa prova?</h2></div><span className="caption">{data.topics.length} conteúdos</span></div>{data.topics.length ? <div className="topic-list mt-5">{data.topics.map(topic => <div className="topic-detail-row" key={topic.id}><div><p className="font-semibold">{topic.name}</p><p className="caption mt-1">{topic.subject}</p></div><span className="status-pill status-lilac">peso {topic.weight}/5</span></div>)}</div> : <div className="compact-empty mt-5"><CalendarDays size={19} /><p className="caption">Ainda não há conteúdos mapeados. Você pode continuar usando a prova diretamente nos Flows.</p></div>}</section></Frame>;
}
