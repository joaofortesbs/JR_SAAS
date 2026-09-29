import { Bold, Check, Italic, Paintbrush, Palette, Strikethrough, Underline } from "lucide-react";
import { useState } from "react";

const textColors = [
  { name: "Azul Central", value: "#1f65bd" },
  { name: "Rosa", value: "#d94f87" },
  { name: "Âmbar", value: "#b57920" },
  { name: "Texto", value: "#17233b" },
];

export default function EssayToolbar({
  visible,
  top,
  left,
  onCommand,
  onColor,
  onPart,
}: {
  visible: boolean;
  top: number;
  left: number;
  onCommand: (command: "bold" | "italic" | "underline" | "strikeThrough") => void;
  onColor: (color: string) => void;
  onPart: () => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);
  if (!visible) return null;
  return <div className="essay-floating-toolbar" style={{ top, left }} role="toolbar" aria-label="Formatação do trecho selecionado" onMouseDown={event => event.preventDefault()}>
    <button className="essay-tool-button" onClick={() => onPart()} aria-label="Selecionar parte" title="Selecionar parte"><Paintbrush size={16} /></button>
    <span className="essay-tool-divider" />
    <button className="essay-tool-button" onClick={() => onCommand("bold")} aria-label="Negrito" title="Negrito"><Bold size={16} /></button>
    <button className="essay-tool-button" onClick={() => onCommand("italic")} aria-label="Itálico" title="Itálico"><Italic size={16} /></button>
    <button className="essay-tool-button" onClick={() => onCommand("underline")} aria-label="Sublinhado" title="Sublinhado"><Underline size={16} /></button>
    <button className="essay-tool-button" onClick={() => onCommand("strikeThrough")} aria-label="Tachado" title="Tachado"><Strikethrough size={16} /></button>
    <div className="essay-color-wrap">
      <button className="essay-tool-button" onClick={() => setColorOpen(open => !open)} aria-label="Cor do texto" title="Cor do texto"><Palette size={16} /></button>
      {colorOpen && <div className="essay-color-menu" role="menu">{textColors.map(color => <button key={color.value} className="essay-color-option" onClick={() => { onColor(color.value); setColorOpen(false); }} role="menuitem" aria-label={color.name} title={color.name}><span style={{ backgroundColor: color.value }} />{color.name === "Texto" && <Check size={12} />}</button>)}</div>}
    </div>
  </div>;
}
