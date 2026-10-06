import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { study as trpc } from "@/lib/study";
import { BookMarked, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

type ResourceForm = { title: string; url: string; source: string; subject: string; durationMinutes: string };
const empty: ResourceForm = { title: "", url: "", source: "", subject: "", durationMinutes: "50" };
export default function Library() {
  const { data, isLoading, error } = trpc.resources.list.useQuery();
  const utils = trpc.useUtils();
  const refresh = () => utils.resources.list.invalidate();
  const create = trpc.resources.create.useMutation({ onSuccess: () => { refresh(); setForm(empty); setEditing(null); setShowForm(false); setAttachment(null); } });
  const update = trpc.resources.update.useMutation({ onSuccess: () => { refresh(); setEditing(null); setShowForm(false); setForm(empty); setAttachment(null); } });
  const remove = trpc.resources.delete.useMutation({ onSuccess: refresh });
  const [form, setForm] = useState<ResourceForm>(empty);
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const resources = data ?? [];
  const mutationError = create.error || update.error || remove.error;
  useEffect(() => {
    if (!attachment) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);
  useEffect(() => { if (!showForm) setAttachment(null); }, [showForm]);
  const submit = () => {
    const payload = { title: form.title.trim(), url: form.url.trim() || undefined, source: form.source.trim() || undefined, subject: form.subject.trim() || undefined, durationMinutes: Number(form.durationMinutes) || 0 };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };
  const startEdit = (resource: any) => { setEditing(resource); setForm({ title: resource.title, url: resource.url ?? "", source: resource.source ?? "", subject: resource.subject ?? "", durationMinutes: String(resource.durationMinutes ?? 50) }); setAttachment(null); setAttachmentError(""); setShowForm(true); };
  const chooseAttachment = (file?: File) => {
    if (!file) { setAttachment(null); setAttachmentError(""); return; }
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)) { setAttachment(null); setAttachmentError("Escolha PDF, PNG, JPG ou WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setAttachment(null); setAttachmentError("O arquivo precisa ter até 8 MB."); return; }
    setAttachment(file);
    setAttachmentError("");
  };
  return <div className="page-frame">
    <div className="page-heading"><div><p className="eyebrow">Materiais</p><h1 className="display-title">Biblioteca</h1><p className="body-copy mt-2 max-w-2xl">Guarde referências e links que você escolheu. Arquivos não são enviados.</p></div><Button className="soft-button-primary" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}><Plus size={16} /> Novo material</Button></div>
    {showForm && <section className="soft-card p-6 mb-5" aria-labelledby="resource-form-title"><div className="section-row"><div><p className="eyebrow">Material temporário</p><h2 id="resource-form-title" className="card-title mt-1">{editing ? "Editar referência" : "Adicionar referência"}</h2></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Fechar formulário"><X size={18} /></button></div><div className="form-grid mt-5"><Input aria-label="Título" placeholder="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /><Input type="url" aria-label="Link" placeholder="Link (opcional)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /><Input aria-label="Fonte" placeholder="Fonte (opcional)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /><Input aria-label="Disciplina" placeholder="Disciplina (opcional)" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /><Input type="number" aria-label="Duração em minutos" min="5" max="600" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} placeholder="Duração estimada (min)" /></div><p className="caption mt-3">Não há upload. Links externos só abrem quando você escolher.</p>{mutationError && <p className="inline-error mt-3" role="alert">{mutationError.message}</p>}<div className="flex gap-2 mt-5"><Button className="soft-button-primary" disabled={!form.title.trim() || create.isPending || update.isPending} onClick={submit}>{editing ? "Atualizar" : "Adicionar à biblioteca"}</Button><Button variant="outline" className="soft-button-secondary" onClick={() => setShowForm(false)}>Cancelar</Button></div></section>}
    {showForm && <section className="soft-card p-5 mb-5" aria-label="Prévia local de arquivo"><label className="field-label block"><span>Pré-visualizar arquivo (opcional)</span><input className="mt-2 block w-full text-sm" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={event => chooseAttachment(event.target.files?.[0])} /></label><p className="caption mt-2">PDF, PNG, JPG ou WebP · até 8 MB. Prévia apenas no navegador: o arquivo não será enviado nem associado ao material salvo.</p>{attachmentError && <p className="inline-error mt-2" role="alert">{attachmentError}</p>}{attachment && previewUrl && <div className="mt-3"><div className="section-row"><span className="caption truncate">{attachment.name} · {(attachment.size / 1024 / 1024).toFixed(1)} MB</span><button className="icon-button" onClick={() => setAttachment(null)} aria-label="Descartar prévia"><X size={15} /></button></div>{attachment.type.startsWith("image/") ? <img src={previewUrl} alt={`Prévia local de ${attachment.name}`} className="mt-3 max-h-80 max-w-full rounded-lg object-contain" /> : <iframe src={previewUrl} title={`Prévia local de ${attachment.name}`} className="mt-3 h-72 w-full rounded-lg border" />}</div>}</section>}
    {isLoading ? <div className="soft-card p-8" role="status">Carregando materiais…</div> : error ? <div className="soft-card p-8" role="alert"><h2 className="card-title">Biblioteca indisponível</h2><Button className="soft-button-primary mt-4" onClick={() => refresh()}>Tentar novamente</Button></div> : resources.length ? <div className="resource-grid">{resources.map((r: any) => <article className="soft-card resource-card" key={r.id}><div className="flex items-center justify-between"><div className="icon-bubble bubble-blue"><BookMarked size={17} /></div><div className="flex gap-1"><button className="icon-button" onClick={() => startEdit(r)} aria-label={`Editar ${r.title}`}><Pencil size={15} /></button><button className="icon-button" onClick={() => setDeleteId(r.id)} aria-label={`Excluir ${r.title}`}><Trash2 size={15} /></button></div></div><h2 className="card-title mt-5">{r.title}</h2><p className="caption mt-1">{[r.source, r.subject].filter(Boolean).join(" · ") || "Referência pessoal"}</p><div className="resource-footer mt-6"><span className="caption">{r.durationMinutes ? `${r.durationMinutes} min` : "Sem duração definida"}</span>{r.url && <a className="text-link" href={r.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir link</a>}</div></article>)}</div> : <div className="soft-card empty-state"><div className="empty-icon"><BookMarked size={21} /></div><h2 className="card-title mt-4">Sua biblioteca está vazia</h2><p className="body-copy mt-2 max-w-md mx-auto">Adicione links e referências escolhidos por você. Nada foi incluído como exemplo.</p><Button className="soft-button-primary mt-5" onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar primeira referência</Button></div>}
    <p className="caption mt-5">Itens temporários em memória. Recarregar, sair ou trocar de conta descarta tudo.</p>
    <ConfirmActionDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)} title="Excluir este material?" description="Ele será removido desta sessão temporária." confirmLabel="Excluir" pending={remove.isPending} onConfirm={() => { if (deleteId !== null) remove.mutate({ id: deleteId }); setDeleteId(null); }} />
    {remove.error && <p className="inline-error mt-4" role="alert">{remove.error.message}</p>}
  </div>;
}
