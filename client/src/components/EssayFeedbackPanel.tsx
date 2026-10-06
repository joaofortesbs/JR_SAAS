import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, MessageCircle } from "lucide-react";
import { useState } from "react";

export default function EssayFeedbackPanel({ feedback, pending, selectedExcerpt, onSubmit }: { feedback: any[]; pending: boolean; selectedExcerpt: string; onSubmit: (notes: string, totalScore?: number, selectedExcerpt?: string) => void }) {
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  return <section className="essay-feedback-panel soft-card">
    <div className="essay-feedback-heading"><div><p className="eyebrow">Anotações pessoais</p><h2 className="card-title mt-1">Registre o que quer revisar</h2></div><div className="icon-bubble bubble-pink"><MessageCircle size={17} /></div></div>
    {selectedExcerpt ? <div className="essay-feedback-selection mt-4"><span className="eyebrow">Trecho selecionado</span><blockquote>“{selectedExcerpt}”</blockquote><p className="caption">A anotação fica nesta sessão temporária.</p></div> : <div className="essay-feedback-empty mt-5"><MessageCircle size={17} /><p className="caption">Selecione uma frase para ancorar uma anotação pessoal ou escreva um lembrete geral.</p></div>}
    {feedback.length ? <div className="essay-feedback-list mt-5">{feedback.slice(0, 3).map(item => <article className="essay-feedback-item" key={item.id}><div className="flex items-center justify-between gap-3"><span className="status-pill status-pink">{item.origin}</span>{item.totalScore != null && <strong className="feedback-score">{item.totalScore}<small>/1000</small></strong>}</div><p className="body-copy mt-3">{item.notes || "Feedback registrado sem observações."}</p><p className="caption mt-3">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p></article>)}</div> : null}
    <div className="essay-feedback-form mt-5"><div className="section-row"><p className="eyebrow">Nova anotação manual</p><span className="caption">sem correção automatizada</span></div><div className="essay-feedback-inputs mt-3"><input type="number" min="0" max="1000" value={score} onChange={event => setScore(event.target.value)} placeholder="Nota pessoal opcional / 1000" aria-label="Nota pessoal opcional" /><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="O que você quer rever?" aria-label="Anotação pessoal" /></div><Button className="soft-button-secondary mt-3" disabled={!notes.trim() || pending} onClick={() => { onSubmit(notes.trim(), score ? Number(score) : undefined, selectedExcerpt || undefined); setNotes(""); setScore(""); }}><Check size={15} /> Guardar anotação temporária</Button></div>
  </section>;
}
