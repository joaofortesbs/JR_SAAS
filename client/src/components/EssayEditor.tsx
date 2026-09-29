import EssayFeedbackPanel from "@/components/EssayFeedbackPanel";
import EssayToolbar from "@/components/EssayToolbar";
import { CircleAlert, Cloud, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type EssayPartView = { id: number; name: string; color: string; coverage?: number };

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function selectionInside(root: HTMLElement, selection: Selection | null) { if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false; return root.contains(selection.getRangeAt(0).commonAncestorContainer); }

export default function EssayEditor({ title, theme, html, parts, status, feedback, feedbackPending, onTitleChange, onThemeChange, onContentChange, onRequestPartPicker, onFeedbackSubmit, onSave }: {
  title: string;
  theme: string;
  html: string;
  parts: EssayPartView[];
  status: "idle" | "saving" | "saved" | "error";
  feedback: any[];
  feedbackPending: boolean;
  onTitleChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onRequestPartPicker: (apply: (part: EssayPartView) => void) => void;
  onFeedbackSubmit: (notes: string, totalScore?: number, selectedExcerpt?: string) => void;
  onSave: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [toolbar, setToolbar] = useState({ visible: false, top: 0, left: 0 });
  const [selectedExcerpt, setSelectedExcerpt] = useState("");

  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html || ""; }, [html]);

  const captureSelection = (preserveExcerpt = false) => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (!root || !selectionInside(root, selection)) {
      if (!preserveExcerpt) setSelectedExcerpt("");
      setToolbar(current => ({ ...current, visible: false }));
      return;
    }
    const range = selection!.getRangeAt(0).cloneRange();
    savedRange.current = range;
    const excerpt = selection!.toString().replace(/\s+/g, " ").trim().slice(0, 180);
    setSelectedExcerpt(excerpt);
    const rect = range.getBoundingClientRect();
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) return;
    setToolbar({ visible: true, top: clamp(rect.top - shellRect.top - 52, 8, Math.max(8, shellRect.height - 50)), left: clamp(rect.left - shellRect.left + rect.width / 2 - 150, 8, Math.max(8, shellRect.width - 308)) });
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRange.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
    return true;
  };

  const runCommand = (command: "bold" | "italic" | "underline" | "strikeThrough" | "foreColor", value?: string) => {
    if (!restoreSelection()) return;
    document.execCommand(command, false, value);
    onContentChange(editorRef.current?.innerHTML ?? "");
    requestAnimationFrame(() => captureSelection());
  };

  const applyPart = (part: EssayPartView) => {
    if (!restoreSelection()) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.dataset.partId = String(part.id);
    span.style.color = partColor(part.color);
    try { range.surroundContents(span); } catch { document.execCommand("styleWithCSS", false, "true"); document.execCommand("foreColor", false, partColor(part.color)); }
    onContentChange(editorRef.current?.innerHTML ?? "");
    setToolbar(current => ({ ...current, visible: false }));
  };

  const handleInput = () => onContentChange(editorRef.current?.innerHTML ?? "");
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); onSave(); } };

  return <section className="essay-editor-card soft-card" ref={shellRef}>
    <div className="essay-editor-header"><div><p className="eyebrow">Escrita em foco</p><p className="caption mt-1">Selecione qualquer trecho para formatar, categorizar ou comentar.</p></div><div className="essay-save-status" aria-live="polite">{status === "saving" && <><Loader2 size={14} className="animate-spin" /> Salvando</>}{status === "saved" && <><Cloud size={14} /> Tudo salvo</>}{status === "error" && <><CircleAlert size={14} /> Falha ao salvar</>}{status === "idle" && <><Save size={14} /> Salve quando quiser</>}</div></div>
    <div className="essay-meta-fields"><input className="essay-title-input" value={title} onChange={event => onTitleChange(event.target.value)} placeholder="Título da redação" aria-label="Título da redação" /><input className="essay-theme-input" value={theme} onChange={event => onThemeChange(event.target.value)} placeholder="Tema ou proposta · ex.: Desafios da saúde mental" aria-label="Tema da redação" /></div>
    <div className="essay-editor-stage">
      <EssayToolbar visible={toolbar.visible} top={toolbar.top} left={toolbar.left} onCommand={command => runCommand(command)} onColor={color => runCommand("foreColor", color)} onPart={() => { setToolbar(current => ({ ...current, visible: false })); onRequestPartPicker(applyPart); }} />
      <div ref={editorRef} className="essay-rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Texto da redação" data-placeholder="Comece sua redação aqui..." onInput={handleInput} onMouseUp={() => captureSelection()} onKeyUp={() => captureSelection()} onKeyDown={handleKeyDown} onBlur={() => window.setTimeout(() => captureSelection(true), 120)} />
    </div>
    <EssayFeedbackPanel feedback={feedback} pending={feedbackPending} selectedExcerpt={selectedExcerpt} onSubmit={onFeedbackSubmit} />
    <div className="essay-editor-footer"><span className="caption">{wordCount(editorRef.current?.innerText ?? html)} palavras · Ctrl/Cmd + S salva uma versão</span><button className="soft-button-primary" onClick={onSave} disabled={status === "saving"}><Save size={16} /> Salvar versão</button></div>
  </section>;
}

function partColor(color: string) { return { blue: "#1f65bd", pink: "#d94f87", mint: "#23947d", orange: "#b57920", yellow: "#9b7b1e" }[color] ?? "#1f65bd"; }
function wordCount(value: string) { const text = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim(); return text ? text.split(/\s+/).length : 0; }
