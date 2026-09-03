import { taskNoteSchema, interpretationSchema } from "./workspace-artifacts";
import { readRecords } from "./task-records";
export function taskProgress(tasks: Array<{ id: string; title: string; status: string; evidence: Array<{ id: string; metadata: unknown }> }>, artifacts: Array<{ id: string; title: string; taskId: string | null; confirmedAt: Date | string | null; interpretation: unknown }>) {
  const included = tasks.filter(t => t.status !== "CANCELLED");
  const notes = included.flatMap(task => task.evidence.flatMap(e => { const note = taskNoteSchema.safeParse(e.metadata); return note.success ? [{ ...note.data, taskId: task.id, taskTitle: task.title }] : []; }));
  const records = included.flatMap(t => readRecords(t.evidence).filter(r => !r.voided));
  const confirmed = artifacts.filter(a => a.confirmedAt && included.some(t => t.id === a.taskId)).flatMap(a => { const p = interpretationSchema.safeParse(a.interpretation); return p.success ? [{ ...p.data, id: a.id, title: a.title, taskId: a.taskId! }] : []; });
  const completed = included.filter(t => t.status === "DONE").length;
  return { completed, total: included.length, percent: included.length ? Math.round(completed / included.length * 100) : 0,
    recordCount: records.length, notes, applied: notes.filter(n => n.category === "APPLIED"), results: notes.filter(n => n.category === "RESULT"), blockers: notes.filter(n => n.category === "BLOCKER"), confirmed,
    nextTask: included.find(t => t.status === "IN_PROGRESS") ?? included.find(t => t.status === "TODO") ?? included.find(t => t.status === "BLOCKED"),
  };
}
