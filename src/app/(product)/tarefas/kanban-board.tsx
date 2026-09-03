"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, GripVertical } from "lucide-react";
import { DragEvent, PointerEvent, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { moveTask, moveTaskFromKanban } from "./actions";

type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";
type DropStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type KanbanTask = { id: string; title: string; description: string | null; priority: Priority; status: TaskStatus; dueAt: string | null };

const priorityLabels: Record<Priority, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" };
const columns: Array<{ key: DropStatus; title: string; statuses: TaskStatus[] }> = [
  { key: "TODO", title: "A fazer", statuses: ["TODO", "BACKLOG"] },
  { key: "IN_PROGRESS", title: "Em andamento", statuses: ["IN_PROGRESS"] },
  { key: "BLOCKED", title: "Bloqueadas / revisão", statuses: ["BLOCKED", "IN_REVIEW"] },
  { key: "DONE", title: "Concluídas", statuses: ["DONE"] },
];

function normalized(status: TaskStatus): DropStatus {
  if (status === "BACKLOG" || status === "CANCELLED") return "TODO";
  if (status === "IN_REVIEW") return "BLOCKED";
  return status;
}

function updateWithMotion(update: () => void) {
  const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (documentWithTransitions.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    documentWithTransitions.startViewTransition(() => flushSync(update));
    return;
  }
  update();
}

export function KanbanBoard({ projectId, active, projectDueAt, initialTasks }: { projectId: string; active: boolean; projectDueAt: string | null; initialTasks: KanbanTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<DropStatus | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [, startTransition] = useTransition();
  const done = tasks.filter((task) => task.status === "DONE").length;
  const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length;

  function moveImmediately(taskId: string, status: DropStatus) {
    updateWithMotion(() => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task)));
  }

  function persistMove(taskId: string, status: DropStatus) {
    const previous = tasks.find((task) => task.id === taskId)?.status;
    if (!previous || normalized(previous) === status || savingIds.includes(taskId)) return;
    moveImmediately(taskId, status);
    setSavingIds((current) => [...current, taskId]);
    setFeedback("Salvando movimentação…");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId); formData.set("projectId", projectId); formData.set("status", status);
      try {
        const result = await moveTaskFromKanban(formData);
        if (!result.ok) {
          updateWithMotion(() => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: previous } : task)));
          setFeedback(result.error);
        } else {
          setFeedback("Movimentação salva");
          router.refresh();
        }
      } catch {
        updateWithMotion(() => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: previous } : task)));
        setFeedback("Não foi possível salvar. A tarefa voltou para a coluna anterior.");
      } finally {
        setSavingIds((current) => current.filter((id) => id !== taskId));
      }
    });
  }

  function startDragging(event: DragEvent<HTMLElement>, taskId: string) {
    if (!active || savingIds.includes(taskId)) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggingId(taskId);
    setFeedback("Arraste para a coluna desejada");
  }

  function drop(event: DragEvent<HTMLElement>, status: DropStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null); setOverColumn(null);
    if (taskId) persistMove(taskId, status);
  }

  function columnAt(x: number, y: number) {
    return document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-kanban-column]")?.dataset.kanbanColumn as DropStatus | undefined;
  }

  function beginPointerDrag(event: PointerEvent<HTMLElement>, taskId: string) {
    if (!active || savingIds.includes(taskId)) return;
    event.preventDefault();
    setDraggingId(taskId);
    setFeedback("Arraste para a coluna desejada");
  }

  function movePointerDrag(event: PointerEvent<HTMLElement>) {
    if (!draggingId) return;
    const column = columnAt(event.clientX, event.clientY);
    setOverColumn(column ?? null);
  }

  function finishPointerDrag(event: PointerEvent<HTMLElement>) {
    if (!draggingId) return;
    const taskId = draggingId;
    const column = columnAt(event.clientX, event.clientY);
    setDraggingId(null); setOverColumn(null);
    if (column) persistMove(taskId, column);
    else setFeedback("");
  }

  return <>
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Progresso" value={`${done}/${tasks.length}`}/><Metric label="Em andamento" value={String(inProgress)}/><Metric label="Prazo do projeto" value={projectDueAt ? new Date(projectDueAt).toLocaleDateString("pt-BR") : "A combinar"}/></section>
    {inProgress > 3 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Atenção:</strong> há {inProgress} tarefas em andamento. Você pode continuar, mas terminar algumas antes de abrir outras tende a reduzir trocas de prioridade.</p> : null}
    <p className="sr-only" aria-live="polite">{feedback}</p>
    <section aria-label="Quadro de tarefas" onPointerMove={movePointerDrag} onPointerUp={finishPointerDrag} onPointerCancel={() => { setDraggingId(null); setOverColumn(null); setFeedback(""); }} className="overflow-x-auto pb-3"><div className="grid min-w-[1040px] grid-cols-4 gap-3">{columns.map((column) => {
      const items = tasks.filter((task) => column.statuses.includes(task.status));
      const receiving = Boolean(draggingId && overColumn === column.key && normalized(tasks.find((task) => task.id === draggingId)?.status ?? "TODO") !== column.key);
      return <div key={column.key} data-kanban-column={column.key} onDragEnter={(event) => { event.preventDefault(); if (active) setOverColumn(column.key); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null); }} onDrop={(event) => drop(event, column.key)} className={`rounded-xl bg-[#f4f5f7] p-3 transition-[background-color,box-shadow,transform] duration-200 ${receiving ? "scale-[1.01] bg-accent-warm ring-2 ring-primary/35 ring-inset" : ""}`}>
        <div className="flex items-center justify-between px-1"><h2 className="text-xs font-semibold">{column.title}</h2><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-muted">{items.length}</span></div>
        <div className={`mt-3 min-h-12 space-y-3 rounded-lg transition-colors duration-200 ${receiving ? "bg-primary/5" : ""}`}>{items.map((task) => <TaskCard key={task.id} task={task} projectId={projectId} active={active} dragging={draggingId === task.id} saving={savingIds.includes(task.id)} onDragStart={(event) => startDragging(event, task.id)} onDragEnd={() => { setDraggingId(null); setOverColumn(null); setFeedback(""); }} onPointerDown={(event) => beginPointerDrag(event, task.id)}/>) }{!items.length ? <div className={`rounded-lg border border-dashed bg-white/60 p-4 text-center text-[10px] text-muted transition-all duration-200 ${receiving ? "border-primary bg-accent-warm text-foreground" : ""}`}>{receiving ? "Solte a tarefa aqui" : "Nenhuma tarefa"}</div> : null}</div>
      </div>;
    })}</div></section>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>; }

function TaskCard({ task, projectId, active, dragging, saving, onDragStart, onDragEnd, onPointerDown }: { task: KanbanTask; projectId: string; active: boolean; dragging: boolean; saving: boolean; onDragStart: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onPointerDown: (event: PointerEvent<HTMLElement>) => void }) {
  return <article draggable={active && !saving} onDragStart={onDragStart} onDragEnd={onDragEnd} style={{ viewTransitionName: `kanban-task-${task.id}` }} className={`group rounded-xl border bg-white p-4 shadow-[0_2px_8px_rgba(11,19,32,0.035)] transition-[opacity,transform,box-shadow,border-color] duration-200 ease-out ${active ? "cursor-grab active:cursor-grabbing" : ""} ${dragging ? "scale-[0.97] rotate-[0.5deg] border-primary opacity-40 shadow-xl" : "hover:-translate-y-0.5 hover:shadow-md"} ${saving ? "pointer-events-none opacity-65" : ""}`}>
    <div className="flex items-start justify-between gap-2"><span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${task.priority === "URGENT" ? "text-red-700" : task.priority === "HIGH" ? "text-amber-700" : "text-muted"}`}>{priorityLabels[task.priority]}</span><div className="flex items-center gap-2">{task.dueAt ? <span className="inline-flex items-center gap-1 text-[9px] text-muted"><CalendarDays className="size-3"/>{new Date(task.dueAt).toLocaleDateString("pt-BR")}</span> : null}<button type="button" aria-label={`Arrastar ${task.title}`} disabled={!active || saving} onPointerDown={onPointerDown} className={`touch-none rounded-md p-0.5 text-muted transition-[opacity,background-color] hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary ${active ? "cursor-grab opacity-55 group-hover:opacity-100 active:cursor-grabbing" : "pointer-events-none opacity-0"}`}><GripVertical aria-hidden="true" className="size-4"/></button></div></div>
    <Link href={`/tarefas/${task.id}`} draggable={false} className="mt-2 block text-sm font-semibold leading-5 hover:text-[#0b3156]">{task.title}</Link>{task.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{task.description}</p> : null}
    <form action={moveTask} className="mt-4 flex gap-2"><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="projectId" value={projectId}/><select key={task.status} name="status" defaultValue={normalized(task.status)} disabled={!active || saving} aria-label={`Status de ${task.title}`} className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-2 text-[10px]"><option value="TODO">A fazer</option><option value="IN_PROGRESS">Em andamento</option><option value="BLOCKED">Bloqueada</option><option value="IN_REVIEW">Em revisão</option><option value="DONE">Concluída</option></select><button disabled={!active || saving} aria-label={`Atualizar ${task.title}`} className="grid size-9 place-items-center rounded-lg border disabled:opacity-40"><ArrowRight className="size-3.5"/></button></form>
  </article>;
}
