import EssayEditor, { type EssayPartView } from "@/components/EssayEditor";
import EssayPartsPanel from "@/components/EssayPartsPanel";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { study as trpc } from "@/lib/study";
import { safeEssayHtml } from "@/lib/study-types";
import { BookOpen, ChevronRight, CircleAlert, FileDown, FileText, Filter, Loader2, Plus, Printer, Search, Sparkles, TimerReset, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

const partColors: Record<string, string> = { blue: "#1f65bd", pink: "#d94f87", mint: "#23947d", orange: "#b57920", yellow: "#9b7b1e" };
const statusLabel: Record<string, string> = { draft: "Rascunho", submitted_for_review: "Em revisão", feedback_received: "Feedback recebido", revision_needed: "Revisão necessária", revised: "Revisada" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function Frame({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="page-frame"><div className="page-heading"><div><p className="eyebrow">Escrita com direção</p><h1 className="display-title">Redações</h1><p className="body-copy mt-2 max-w-2xl">Escreva, organize e transforme cada trecho em um próximo movimento claro.</p></div>{action}</div>{children}</div>;
}

export default function Essays() {
  const [location] = useLocation();
  const detailMatch = location.match(/^\/redacoes\/(\d+)$/);
  if (detailMatch) return <EssayDetailPage id={Number(detailMatch[1])} />;
  if (location === "/redacoes/nova") return <NewEssayPage />;
  return <EssayLibrary />;
}

function EssayLibrary() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.essays.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.essays.create.useMutation({ onSuccess: result => setLocation(`/redacoes/${result.id}`) });
  const remove = trpc.essays.delete.useMutation({ onSuccess: () => { utils.essays.list.invalidate(); setDeleteTarget(null); } });
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const themes = useMemo(() => Array.from(new Set((data ?? []).map(essay => essay.theme).filter((value): value is string => Boolean(value)))), [data]);
  const essays = useMemo(() => (data ?? []).filter(essay => `${essay.title} ${essay.theme ?? ""}`.toLowerCase().includes(search.toLowerCase())).filter(essay => theme === "all" || essay.theme === theme), [data, search, theme]);
  return <Frame action={<Button className="soft-button-primary" onClick={() => setLocation("/redacoes/nova")}><Plus size={17} /> Nova redação</Button>}>
    <div className="essay-library-toolbar"><div className="essay-search"><Search size={17} /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar redações ou temas..." aria-label="Buscar redações" /></div><div className="essay-filter"><Filter size={15} /><select value={theme} onChange={event => setTheme(event.target.value)} aria-label="Filtrar por tema"><option value="all">Todos os temas</option>{themes.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div>
    {isLoading ? <div className="soft-card p-12 grid place-items-center" role="status"><Loader2 className="animate-spin" /></div> : error ? <div className="soft-card p-8" role="alert"><p className="card-title">Não conseguimos carregar suas redações.</p><p className="body-copy mt-2">Tente novamente.</p><Button className="soft-button-primary mt-4" onClick={() => utils.essays.list.invalidate()}>Tentar novamente</Button></div> : essays.length ? <div className="essay-library-grid mt-5">{essays.map(essay => <EssayCard key={essay.id} essay={essay} onOpen={() => setLocation(`/redacoes/${essay.id}`)} onDelete={() => setDeleteTarget(essay)} />)}<button className="essay-new-card" onClick={() => setLocation("/redacoes/nova")}><Plus size={20} /><strong>Começar outra redação</strong><span>Um novo texto, um novo avanço.</span></button></div> : <div className="soft-card essay-empty-state"><div className="empty-icon"><FileText size={22} /></div><h2 className="card-title mt-4">Seu espaço de escrita está aberto</h2><p className="body-copy mt-2 max-w-md mx-auto">Crie sua primeira redação e use as partes para enxergar a estrutura do argumento.</p><Button className="soft-button-primary mt-5" onClick={() => setLocation("/redacoes/nova")}><Plus size={16} /> Escrever primeira redação</Button></div>}
    <ConfirmActionDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)} title="Excluir esta redação?" description="O texto e suas anotações serão removidos desta sessão temporária." confirmLabel="Excluir redação" pending={remove.isPending} onConfirm={() => deleteTarget && remove.mutate({ id: deleteTarget.id })} />
  </Frame>;
}

function EssayCard({ essay, onOpen, onDelete }: { essay: any; onOpen: () => void; onDelete: () => void }) {
  const words = wordCount(essay.currentText ?? "");
  return <article className="relative"><button className="essay-library-card soft-card" onClick={onOpen}><div className="essay-card-top"><span className="icon-bubble bubble-pink"><FileText size={18} /></span><span className="status-pill status-blue">{statusLabel[essay.status] ?? "Rascunho"}</span></div><div className="essay-card-copy"><h2 className="card-title mt-5 text-left">{essay.title}</h2><p className="body-copy mt-1 text-left">{essay.theme || "Tema ainda não definido"}</p></div><div className="essay-card-footer"><span>{words} palavras</span><span>{new Date(essay.updatedAt).toLocaleDateString("pt-BR")}</span><ChevronRight size={16} /></div></button><button className="icon-button absolute right-4 top-4" onClick={onDelete} aria-label={`Excluir ${essay.title}`}><Trash2 size={15} /></button></article>;
}

function NewEssayPage() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const create = trpc.essays.create.useMutation({ onSuccess: result => setLocation(`/redacoes/${result.id}`) });
  return <Frame><div className="new-essay-layout"><section className="soft-card new-essay-hero"><div className="brand-mark"><Sparkles size={19} /></div><p className="eyebrow mt-6">Novo espaço de escrita</p><h2 className="hero-title mt-3">Uma ideia fica mais forte quando ganha estrutura.</h2><p className="body-copy mt-4 max-w-lg">Comece com o título e o tema. Depois, a toolbar ajuda você a organizar o pensamento sem interromper o fluxo.</p><div className="new-essay-form mt-8"><label><span>Título</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Redação ENEM — Saúde mental" /></label><label><span>Tema ou proposta</span><Input value={theme} onChange={event => setTheme(event.target.value)} placeholder="Ex.: Desafios da saúde mental no Brasil" /></label><div className="flex gap-3 mt-3"><Button variant="outline" className="soft-button-secondary" onClick={() => setLocation("/redacoes")}>Cancelar</Button><Button className="soft-button-primary" disabled={create.isPending || title.trim().length < 2} onClick={() => create.mutate({ title: title.trim(), theme: theme.trim() || undefined, bank: "ENEM", source: "editor" })}>{create.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Criar redação</Button></div>{create.error && <p className="inline-error mt-4" role="alert"><CircleAlert size={15} /> {create.error.message || "Não foi possível criar a redação nesta sessão."}</p>}</div></section><aside className="new-essay-aside"><div className="soft-card p-6"><p className="eyebrow">Como funciona</p><div className="new-essay-step mt-5"><span>1</span><div><strong>Escreva sem interromper o raciocínio</strong><p className="caption mt-1">As alterações ficam na memória desta sessão.</p></div></div><div className="new-essay-step mt-4"><span>2</span><div><strong>Selecione e categorize</strong><p className="caption mt-1">Introdução, desenvolvimento, conclusão ou suas próprias partes.</p></div></div><div className="new-essay-step mt-4"><span>3</span><div><strong>Leve para um Flow</strong><p className="caption mt-1">Cronometre a revisão da redação quando quiser.</p></div></div><p className="caption mt-5">Nada é salvo permanentemente. Ao sair, o rascunho é descartado.</p></div></aside></div></Frame>;
}

function EssayDetailPage({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.essays.detail.useQuery({ id });
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [html, setHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const pendingApply = useRef<((part: EssayPartView) => void) | null>(null);
  const initializedForId = useRef<number | null>(null);
  const [partError, setPartError] = useState("");
  const autosave = trpc.essays.autosave.useMutation({ onSuccess: () => setSaveStatus("saved"), onError: () => setSaveStatus("error") });
  const autosaveRef = useRef(autosave.mutate);
  autosaveRef.current = autosave.mutate;
  const lastSaved = useRef({ title: "", theme: "", currentText: "" });
  const save = trpc.essays.save.useMutation({ onSuccess: async () => { setSaveStatus("saved"); await utils.essays.detail.invalidate({ id }); } });
  const createPart = trpc.essays.createPart.useMutation({ onSuccess: async () => { setPartError(""); await utils.essays.detail.invalidate({ id }); } , onError: error => setPartError(error.message) });
  const updatePart = trpc.essays.updatePart.useMutation({ onSuccess: async () => { setPartError(""); await utils.essays.detail.invalidate({ id }); }, onError: error => setPartError(error.message) });
  const deletePart = trpc.essays.deletePart.useMutation({ onSuccess: async () => { setPartError(""); await utils.essays.detail.invalidate({ id }); }, onError: error => setPartError(error.message) });
  const reorderParts = trpc.essays.reorderParts.useMutation({ onSuccess: async () => { setPartError(""); await utils.essays.detail.invalidate({ id }); }, onError: error => setPartError(error.message) });
  const applyPart = trpc.essays.applyPart.useMutation({ onSuccess: async () => { await utils.essays.detail.invalidate({ id }); }, onError: error => setPartError(error.message) });
  const feedback = trpc.essays.feedback.useMutation({ onSuccess: async () => { await utils.essays.detail.invalidate({ id }); }, onError: error => setPartError(error.message) });
  const startFlow = trpc.flows.start.useMutation({ onSuccess: () => setLocation("/flows") });
  const createFlow = trpc.flows.createAdHoc.useMutation({ onSuccess: result => startFlow.mutate({ blockId: result.id }) });
  useEffect(() => { if (!data?.essay || initializedForId.current === id) return; initializedForId.current = id; setTitle(data.essay.title); setTheme(data.essay.theme ?? ""); setHtml(data.essay.currentText ?? ""); lastSaved.current = { title: data.essay.title, theme: data.essay.theme ?? "", currentText: data.essay.currentText ?? "" }; setSaveStatus("idle"); }, [data?.essay, id]);
  useEffect(() => {
    if (initializedForId.current !== id || !title.trim()) return;
    const next = { title: title.trim(), theme: theme.trim(), currentText: html };
    if (next.title === lastSaved.current.title && next.theme === lastSaved.current.theme && next.currentText === lastSaved.current.currentText) return;
    const timer = window.setTimeout(() => { setSaveStatus("saving"); lastSaved.current = next; autosaveRef.current({ id, title: next.title, theme: next.theme || undefined, currentText: next.currentText }); }, 900);
    return () => window.clearTimeout(timer);
  }, [id, title, theme, html]);
  useEffect(() => {
    if (!partPickerOpen) return;
    const panel = document.querySelector<HTMLElement>(".essay-part-picker");
    if (!panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getItems = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    getItems()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setPartPickerOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = getItems();
      if (!items.length) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [partPickerOpen]);
  if (isLoading) return <Frame><div className="soft-card p-12 grid place-items-center"><Loader2 className="animate-spin" /></div></Frame>;
  if (error || !data?.essay) return <Frame><div className="soft-card p-8"><p className="card-title">Redação não encontrada</p><p className="body-copy mt-2">Este texto pode ter sido removido ou não pertence à sua conta.</p><Button className="soft-button-primary mt-5" onClick={() => setLocation("/redacoes")}>Voltar às redações</Button></div></Frame>;
  const parts = data.parts.map(part => ({ ...part, coverage: partCoverage(html, part.id) }));
  const requestPartPicker = (apply: (part: EssayPartView) => void) => { pendingApply.current = apply; setPartPickerOpen(true); };
  const pickPart = (part: EssayPartView) => { pendingApply.current?.(part); pendingApply.current = null; setPartPickerOpen(false); setPartError(""); window.setTimeout(() => applyPart.mutate({ essayId: id, partId: part.id, currentText: document.querySelector<HTMLElement>(".essay-rich-editor")?.innerHTML ?? html }), 0); };
  const exportHtml = () => { const safeTitle = escapeHtml(title); const safeTheme = escapeHtml(theme || "Redação"); const safeText = safeEssayHtml(html); const blob = new Blob([`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.8;color:#253044}h1{line-height:1.2}span[data-part-id]{padding:.05em .15em;border-bottom:2px solid currentColor}</style></head><body><h1>${safeTitle}</h1><p><strong>${safeTheme}</strong></p>${safeText}</body></html>`], { type: "text/html" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "redacao"}.html`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); };
  return <Frame action={<div className="flex flex-wrap gap-2"><Button variant="outline" className="soft-button-secondary" onClick={() => setLocation("/redacoes")}><ChevronRight className="rotate-180" size={15} /> Biblioteca</Button><Button variant="outline" className="soft-button-secondary" onClick={exportHtml}><FileDown size={15} /> Exportar HTML local</Button><Button variant="outline" className="soft-button-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</Button><Button className="soft-button-primary" onClick={() => createFlow.mutate({ essayId: id })} disabled={createFlow.isPending || startFlow.isPending}><TimerReset size={16} /> {startFlow.isPending ? "Iniciando Flow" : "Estudar em um Flow"}</Button></div>}><div className="essay-editor-layout"><EssayEditor title={title} theme={theme} html={html} parts={parts} status={saveStatus} feedback={data.feedback ?? []} feedbackPending={feedback.isPending} onTitleChange={setTitle} onThemeChange={setTheme} onContentChange={setHtml} onRequestPartPicker={requestPartPicker} onFeedbackSubmit={(notes, totalScore, excerpt) => feedback.mutate({ essayId: id, origin: "manual", totalScore, notes: excerpt ? `Trecho selecionado: “${excerpt}”

${notes}` : notes })} onSave={() => { setSaveStatus("saving"); save.mutate({ id, title: title.trim(), theme: theme.trim() || undefined, currentText: html, status: "draft" }); }} /><EssayPartsPanel parts={parts} pending={createPart.isPending || updatePart.isPending || deletePart.isPending || applyPart.isPending || reorderParts.isPending} error={partError} onCreate={(name, color) => createPart.mutate({ essayId: id, name, color: color as any })} onUpdate={(part, name, color) => updatePart.mutate({ id: part.id, name, color: color as any })} onDelete={part => deletePart.mutate({ id: part.id })} onPick={pickPart} onReorder={next => reorderParts.mutate({ essayId: id, partIds: next.map(part => part.id) })} /></div>{partPickerOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPartPickerOpen(false)}><div className="modal-card essay-part-picker" role="dialog" aria-modal="true" aria-labelledby="essay-part-picker-title"><div className="section-row"><div><p className="eyebrow">Categorizar trecho</p><h2 id="essay-part-picker-title" className="card-title mt-1">Em qual parte ele entra?</h2></div><button className="icon-button" onClick={() => setPartPickerOpen(false)} aria-label="Fechar"><X size={18} /></button></div><div className="essay-picker-list mt-5">{parts.map(part => <button className="essay-picker-option" key={part.id} onClick={() => pickPart(part)}><span className="essay-part-swatch" data-color={part.color} /><span><strong>{part.name}</strong><small>{part.coverage ?? 0}% coberto</small></span><ChevronRight size={16} /></button>)}{!parts.length && <div className="compact-empty"><Sparkles size={18} /><p className="caption">Crie uma parte no painel lateral antes de categorizar.</p></div>}</div></div></div>}{(createFlow.error || startFlow.error) && <p className="inline-error mt-4"><CircleAlert size={15} /> Não foi possível iniciar o Flow desta redação.</p>}</Frame>;
}

function partCoverage(html: string, id: number) {
  const total = textLength(html);
  if (!total) return 0;
  const match = html.match(new RegExp(`<span[^>]*data-part-id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/span>`, "gi")) ?? [];
  const covered = match.reduce((sum, item) => sum + textLength(item.replace(/^[\s\S]*?>/, "").replace(/<\/span>$/i, "")), 0);
  return Math.min(100, Math.round(covered / total * 100));
}

function textLength(html: string) { return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().length; }
function wordCount(html: string) { const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim(); return text ? text.split(/\s+/).length : 0; }
