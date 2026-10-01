"use client";
import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Copy, FileSpreadsheet, FileText } from "lucide-react";
import { type ConversationVisual as Visual, visualToText } from "@/core/conversation-visuals";
import { AssistantMarkdown } from "./assistant-markdown";

export function ConversationVisual({ visual }: { visual: Visual }) {
  const [expanded, setExpanded] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const contentId = useId();
  const Icon = visual.kind === "TABLE" ? FileSpreadsheet : FileText;
  async function copy() {
    try { await navigator.clipboard.writeText(visualToText(visual)); setCopyStatus("Copiado"); }
    catch { setCopyStatus("Não foi possível copiar. Selecione o conteúdo para copiar."); }
  }
  return <section aria-label={visual.title} className="my-4 min-w-0 overflow-hidden rounded-xl border bg-surface">
    <div className="flex flex-wrap items-center gap-2 border-b bg-surface-muted/50 px-3 py-2">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <h3 className="min-w-0 flex-1 break-words text-sm font-semibold">{visual.title}</h3>
      <button type="button" onClick={copy} aria-label={`Copiar ${visual.title}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs hover:bg-surface-muted"><Copy className="size-3.5" aria-hidden="true" />Copiar</button>
      <button type="button" aria-controls={contentId} aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs hover:bg-surface-muted">{expanded ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}{expanded ? "Recolher" : "Expandir"}</button>
    </div>
    <div id={contentId} hidden={!expanded} className="max-h-[32rem] overflow-auto overscroll-contain p-3 text-sm">
      {visual.kind === "DOCUMENT" ? <AssistantMarkdown text={visual.markdown} /> : <>
        <table className="w-full border-collapse text-left text-sm"><thead><tr>{visual.columns.map((column, index) => <th key={index} className="whitespace-nowrap border-b bg-surface-muted/50 px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{visual.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={`border-b px-3 py-2 align-top ${/^[-+]?\d[\d\s.,%]*$/.test(cell.trim()) ? "text-right tabular-nums" : "min-w-28 break-words [overflow-wrap:anywhere]"}`}>{cell}</td>)}</tr>)}</tbody></table>
        {visual.note ? <p className="mt-3 text-xs leading-5 text-muted">{visual.note}</p> : null}
      </>}
    </div>
    {copyStatus ? <p role="status" className="px-3 py-2 text-xs text-muted">{copyStatus}</p> : null}
  </section>;
}
