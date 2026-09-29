import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";

export default function EssayFeedbackPanel({ feedback, pending, selectedExcerpt, onSubmit }: { feedback: any[]; pending: boolean; selectedExcerpt: string; onSubmit: (notes: string, totalScore?: number, selectedExcerpt?: string) => void }) {
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  return <section className="essay-feedback-panel soft-card">
    <div className="essay-feedback-heading"><div><p className="eyebrow">Feedback contextual</p><h2 className="card-title mt-1">Comente sem sair da redação</h2></div><div className="icon-bubble bubble-pink"><MessageCircle size={17} /></div></div>
    {selectedExcerpt ? <div className="essay-feedback-selection mt-4"><span className="eyebrow">Trecho selecionado</span><blockquote>“{selectedExcerpt}”</blockquote><p className="caption">O comentário será guardado junto deste contexto.</p></div> : <div className="essay-feedback-empty mt-5"><Sparkles size={17} /><p className="caption">Selecione uma frase no editor para ancorar um feedback ou registre um comentário geral abaixo.</p></div>}
    {feedback.length ? <div className="essay-feedback-list mt-5">{feedback.slice(0, 3).map(item => <article className="essay-feedback-item" key={item.id}><div className="flex items-center justify-between gap-3"><span className="status-pill status-pink">{item.origin}</span>{item.totalScore != null && <strong className="feedback-score">{item.totalScore}<small>/1000</small></strong>}</div><p className="body-copy mt-3">{item.notes || "Feedback registrado sem observações."}</p><p className="caption mt-3">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p></article>)}</div> : null}
    <div className="essay-feedback-form mt-5"><div className="section-row"><p className="eyebrow">Registrar novo retorno</p><span className="caption">privado para você</span></div><div className="essay-feedback-inputs mt-3"><input type="number" min="0" max="1000" value={score} onChange={event => setScore(event.target.value)} placeholder="Nota / 1000" aria-label="Nota da redação" /><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="O que merece ser revisado?" aria-label="Feedback da professora" /></div><Button className="soft-button-secondary mt-3" disabled={!notes.trim() || pending} onClick={() => { onSubmit(notes.trim(), score ? Number(score) : undefined, selectedExcerpt || undefined); setNotes(""); setScore(""); }}><Check size={15} /> Guardar feedback</Button></div>
  </section>;
}
