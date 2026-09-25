import { taskNoteSchema, interpretationSchema } from "./workspace-artifacts";
import { readRecords } from "./task-records";
export function taskProgress(tasks: Array<{ id: string; title: string; status: string; evidence: Array<{ id: string; metadata: unknown }> }>, artifacts: Array<{ id: string; title: string; taskId: string | null; confirmedAt: Date | string | null; interpretation: unknown }>) {
  const included = tasks.filter(t => t.status !== "CANCELLED");
  const notes = included.flatMap(task => task.evidence.flatMap(e => { const note = taskNoteSchema.safeParse(e.metadata); return note.success && !Object(e.metadata).voided ? [{ ...note.data, taskId: task.id, taskTitle: task.title }] : []; }));
  const records = included.flatMap(task => readRecords(task.evidence).filter(record => !record.voided).map(record => ({ ...record, taskId: task.id, taskTitle: task.title })));
  const confirmed = artifacts.filter(a => a.confirmedAt && included.some(t => t.id === a.taskId)).flatMap(a => { const p = interpretationSchema.safeParse(a.interpretation); return p.success ? [{ ...p.data, id: a.id, title: a.title, taskId: a.taskId! }] : []; });
  const completed = included.filter(t => t.status === "DONE").length;
  const blocked = included.filter(t => t.status === "BLOCKED").length;
  const inProgress = included.filter(t => t.status === "IN_PROGRESS").length;
  const recentRecords = records.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
  const assessment = blocked ? `${blocked} ${blocked === 1 ? "tarefa bloqueada" : "tarefas bloqueadas"}. Confira o impedimento antes de avançar.`
    : included.length && completed === included.length ? "Todas as tarefas foram concluídas. Compare os resultados observados com a meta antes de encerrar o ciclo."
    : inProgress ? `${inProgress} ${inProgress === 1 ? "tarefa em andamento" : "tarefas em andamento"}. Confira os registros e a próxima entrega do plano.`
    : records.length ? "Há registros de execução. Confira o que foi observado antes de iniciar a próxima tarefa."
    : "Ainda não há execução registrada neste plano.";
  return { completed, total: included.length, percent: included.length ? Math.round(completed / included.length * 100) : 0,
    blocked, inProgress, assessment, recordCount: records.length, recentRecords, notes, applied: notes.filter(n => n.category === "APPLIED"), results: notes.filter(n => n.category === "RESULT"), blockers: notes.filter(n => n.category === "BLOCKER"), confirmed,
    nextTask: included.find(t => t.status === "BLOCKED") ?? included.find(t => t.status === "IN_PROGRESS") ?? included.find(t => t.status === "TODO"),
  };
}

export function executionContext(planId: string, progress: ReturnType<typeof taskProgress>) {
  return {
    planId,
    assessment: progress.assessment,
    completed: progress.completed,
    total: progress.total,
    percent: progress.percent,
    blocked: progress.blocked,
    inProgress: progress.inProgress,
    recordCount: progress.recordCount,
    nextTask: progress.nextTask ? { id: progress.nextTask.id, title: progress.nextTask.title, status: progress.nextTask.status } : null,
    recentRecords: progress.recentRecords,
    applied: progress.applied.slice(-10),
    results: progress.results.slice(-10),
    blockers: progress.blockers.slice(-10),
    confirmed: progress.confirmed.slice(-10),
  };
}
