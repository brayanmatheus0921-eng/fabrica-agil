import { z } from "zod";

// One bounded schema for preview, AI output, manual edits and all exports.
export const canvasSchema = z.object({
  kind: z.enum(["DOCUMENT", "SPREADSHEET"]),
  title: z.string().trim().min(1).max(160),
  purpose: z.string().max(1200),
  instructions: z.string().max(2500),
  sections: z.array(z.object({ heading: z.string().max(160), body: z.string().max(5000) })).max(20),
  columns: z.array(z.string().trim().min(1).max(120)).max(12),
  rows: z.array(z.array(z.string().max(1500)).max(12)).max(200),
  example: z.array(z.string().max(500)).max(12),
});
export type CanvasContent = z.infer<typeof canvasSchema>;
export function validateCanvas(raw: unknown) {
  const value = canvasSchema.parse(raw);
  if (value.kind === "SPREADSHEET" && (!value.columns.length || value.rows.some(row => row.length !== value.columns.length) || (value.example.length && value.example.length !== value.columns.length))) throw new Error("Confira as colunas da planilha.");
  if (value.kind === "DOCUMENT" && !value.sections.length) throw new Error("Inclua ao menos uma seção no documento.");
  return value;
}
export const interpretationSchema = z.object({
  summary: z.string().max(2000),
  observations: z.array(z.object({ label: z.string().max(160), value: z.string().max(1200), source: z.string().max(300) })).max(40),
  uncertainties: z.array(z.string().max(500)).max(20),
  recommendation: z.string().max(1200),
});
export type Interpretation = z.infer<typeof interpretationSchema>;
export type ArtifactView = {
  id: string; taskId: string | null; threadId: string | null; title: string; kind: string;
  content: CanvasContent | null; interpretation: Interpretation | null;
  originalName: string | null; confirmedAt: string | null; revision: number; updatedAt: string;
};
export const taskNoteSchema = z.object({
  kind: z.literal("TASK_UPDATE"),
  category: z.enum(["CONTEXT", "APPLIED", "RESULT", "BLOCKER"]),
  text: z.string().trim().min(1).max(5000),
});
export const noteLabels = { CONTEXT: "Contexto", APPLIED: "O que foi feito", RESULT: "Resultado observado", BLOCKER: "Dificuldade encontrada" };
export function csvCell(value: string) {
  // Prevent spreadsheet formula execution when a user opens a downloaded CSV.
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function canvasCsv(content: CanvasContent) {
  return "\uFEFF" + [content.columns, ...content.rows].map(row => row.map(csvCell).join(";")).join("\r\n");
}
