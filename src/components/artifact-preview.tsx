import { FileSpreadsheet, FileText } from "lucide-react";
import type { ArtifactView } from "@/core/workspace-artifacts";

export function ArtifactPreview({ artifact }: { artifact: ArtifactView }) {
  const content = artifact.content;
  const Icon = content?.kind === "SPREADSHEET" ? FileSpreadsheet : FileText;
  return <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b bg-surface-muted/40 px-4 py-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0"><p className="break-words text-sm font-semibold">{artifact.title}</p><p className="mt-0.5 text-xs text-muted">{content?.kind === "SPREADSHEET" ? "Planilha" : content ? "Documento" : "Arquivo"}{artifact.taskId ? " · Vinculado à tarefa" : ""}</p></div>
    </div>
    {content ? <div className="max-h-72 overflow-auto p-4 text-xs leading-5">
      {content.purpose ? <p className="mb-3 text-muted">{content.purpose}</p> : null}
      {content.kind === "SPREADSHEET" ? <><table className="min-w-full border-collapse text-left"><thead><tr>{content.columns.map((column, index) => <th key={index} className="border-b bg-surface-muted/60 px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{content.rows.slice(0, 8).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="min-w-28 border-b px-3 py-2 align-top">{cell || <span className="text-muted">—</span>}</td>)}</tr>)}</tbody></table>{content.rows.length > 8 ? <p className="mt-2 text-muted">Mais {content.rows.length - 8} registros na ferramenta completa.</p> : null}</> : <div className="space-y-3">{content.sections.slice(0, 5).map((section, index) => <section key={index}><h4 className="font-semibold">{section.heading}</h4><p className="mt-1 whitespace-pre-wrap text-muted">{section.body || "Ainda não preenchido."}</p></section>)}{content.sections.length > 5 ? <p className="text-muted">Mais {content.sections.length - 5} seções na ferramenta completa.</p> : null}</div>}
    </div> : <div className="p-4 text-xs text-muted">Arquivo disponível para abrir e baixar.</div>}
  </div>;
}
