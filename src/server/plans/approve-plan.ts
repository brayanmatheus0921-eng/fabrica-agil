import type { Prisma } from "../../generated/prisma/client";
import { asDiagnosticRecord } from "../../core/diagnostic-history";
import { readWorkshop } from "../../core/coo-workshop";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Called inside a database transaction. Pending plans cannot activate tasks elsewhere.
export async function activateDraftPlan(tx: Prisma.TransactionClient, companyId: string, planId: string, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;
  const draft = await tx.actionPlan.findFirst({
    where: { id: planId, companyId, status: "DRAFT" },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!draft) return false;
  const baseline = asDiagnosticRecord(draft.baseline);
  if (baseline.source === "COO_COLLABORATIVE") {
    const threadId = String(baseline.threadId);
    await tx.$queryRaw`SELECT id FROM "ConversationThread" WHERE id = ${threadId} FOR UPDATE`;
    const thread = await tx.conversationThread.findFirst({ where: { id: threadId, companyId } });
    const state = readWorkshop(thread?.workflowState);
    if (!state || thread?.generationId || state.stage !== "REVIEW" || state.revision !== baseline.workshopRevision || state.planId !== draft.id) return false;
    await tx.conversationThread.update({ where: { id: threadId }, data: { workflowState: { ...state, stage: "FOLLOW_UP", furthestStage: 6, revision: state.revision + 1, history: [...state.history, { revision: state.revision, stage: state.stage, summary: "Plano aprovado pelo gestor na plataforma.", at: now.toISOString() }] } as never } });
  }
  const deadlines = asDiagnosticRecord(draft.targetOutcome).taskDeadlines;
  // Multiple projects may run at the same time. Approving a new plan no longer pauses the others.
  if (draft.recommendationId) await tx.methodRecommendation.update({
    where: { id: draft.recommendationId }, data: { status: "ACCEPTED", acceptedAt: now },
  });
  await tx.actionPlan.update({ where: { id: draft.id }, data: { status: "ACTIVE", startsAt: now, dueAt: addDays(now, draft.windowDays) } });
  for (const [index, task] of draft.tasks.entries()) {
    const legacyDays = task.dueAt && task.startsAt ? Math.max(1, Math.round((task.dueAt.getTime() - task.startsAt.getTime()) / 86_400_000)) : draft.windowDays;
    const days = Array.isArray(deadlines) && typeof deadlines[index] === "number" ? deadlines[index] : legacyDays;
    await tx.task.update({ where: { id: task.id }, data: {
      status: index < 3 ? "TODO" : "BACKLOG", startsAt: now, dueAt: addDays(now, days),
    } });
  }
  await tx.progressCheckin.create({ data: { companyId, actionPlanId: draft.id, status: "OPEN",
    metricSnapshot: { sequence: 1, week: 1, dueAt: addDays(now, 3).toISOString(), type: "EXECUTION" },
  } });
  return true;
}
