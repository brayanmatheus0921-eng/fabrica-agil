"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { noteLabels } from "@/core/workspace-artifacts";
export type TaskNoteView = { id: string; text: string; category: keyof typeof noteLabels; at: string };
export function TaskActivity({ taskId, notes: initial, active }: { taskId: string; notes: TaskNoteView[]; active: boolean }) {
  const router = useRouter(), locked = useRef(false);
  const [notes, setNotes] = useState(initial), [text, setText] = useState(""), [category, setCategory] = useState<keyof typeof noteLabels>("CONTEXT");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  async function save() {
    if (locked.current || !text.trim()) return; locked.current = true; setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/tasks/${taskId}/updates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID(), kind: "TASK_UPDATE", category, text }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setNotes(old => [data.note, ...old]); setText(""); setNotice("Registro salvo. O acompanhamento já foi atualizado."); router.refresh();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="rounded-xl border bg-white p-5"><h2 className="text-base font-semibold">Atualizações da tarefa</h2><p className="mt-1 text-xs leading-5 text-muted">Anote o que aconteceu. Estes registros alimentam o acompanhamento, sem precisar preencher tudo de novo.</p><form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); void save(); }}><label className="block text-xs font-semibold">Tipo de registro<select aria-label="Tipo de registro" value={category} onChange={e => setCategory(e.target.value as keyof typeof noteLabels)} className="mt-2 w-full rounded-lg border bg-white p-3 text-sm">{Object.entries(noteLabels).filter(([key]) => active || key === "CONTEXT").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block"><span className="sr-only">Detalhes do registro</span><textarea aria-label="Detalhes do registro" value={text} onChange={e => setText(e.target.value)} maxLength={5000} rows={3} placeholder={category === "RESULT" ? "Ex.: hoje saíram 12 peças. Foram 3 a mais que ontem, no mesmo horário." : category === "BLOCKER" ? "Ex.: a equipe está esperando a aprovação do desenho." : "Escreva uma atualização rápida, contexto ou orientação para a equipe…"} className="w-full rounded-lg border p-3 text-sm focus:border-primary focus:outline-none" /></label><button disabled={busy || !text.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Salvando…" : "Salvar registro"}</button><p role="status" className="text-xs text-muted">{notice}</p></form><ol className="mt-5 space-y-4">{notes.map(note => <li key={note.id} className="border-t pt-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold">{noteLabels[note.category]}</span><time className="text-muted">{new Date(note.at).toLocaleString("pt-BR")}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{note.text}</p></li>)}</ol></section>;
}
