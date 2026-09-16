import type { Prisma } from "@/generated/prisma/client";
import type { WorkshopState } from "@/core/coo-workshop";

export async function persistWorkshopPlan(tx: Prisma.TransactionClient, companyId: string, threadId: string, state: WorkshopState) {
  if (state.stage !== "REVIEW" || !state.plan) return state;
  const id = state.planId ?? `coo-plan-${threadId}`;
  const existing = await tx.actionPlan.findUnique({ where: { id } });
  if (existing && existing.status !== "DRAFT") throw new Error("Plano já aprovado; crie um novo ciclo para alterá-lo.");
  if (existing) {
    const taskIds = (await tx.task.findMany({where:{actionPlanId:id,companyId},select:{id:true}})).map(t=>t.id);
    const evidence = await tx.evidenceOutput.count({where:{companyId,taskId:{in:taskIds}}});
    const artifacts = await tx.workspaceArtifact.count({where:{companyId,taskId:{in:taskIds}}});
    if (evidence || artifacts) throw new Error("Este rascunho já tem registros ou arquivos vinculados. Preserve este ciclo e crie uma nova conversa para reconstruir o plano.");
  }
  const actions = state.plan.initiatives.flatMap(initiative => initiative.actions.map(action => ({ initiative, action })));
  const data = {
    title: `Plano · ${state.diagnosticTitle}`, objective: state.plan.objective,
    windowDays: Math.max(...actions.map(x => x.action.whenDays)),
    baseline: { source: "COO_COLLABORATIVE", diagnosticSessionId: state.diagnosticId, threadId, workshopRevision: state.revision },
    targetOutcome: { ...state.plan, decision: state.decision, taskDeadlines: actions.map(x => x.action.whenDays) } as never,
  };
  await tx.actionPlan.upsert({ where: { id }, update: data, create: { id, companyId, status: "DRAFT", ...data } });
  await tx.task.deleteMany({ where: { actionPlanId: id, companyId } });
  await tx.task.createMany({ data: actions.map(({ initiative, action: a }, index) => ({
    companyId, actionPlanId: id, title: a.what, ownerName: a.who, status: "BACKLOG" as const, priority: initiative.kind === "PRIMARY" ? "HIGH" as const : "MEDIUM" as const, sortOrder: index + 1,
    description: `${initiative.title}\nPor quê: ${a.why}\nQuem: ${a.who}\nOnde: ${a.where}\nComo: ${a.how}\nCusto: ${a.howMuch}\nPrazo sugerido: ${a.whenDays} dias após aprovação\nIndicador: ${a.indicator}\nPonto de partida: ${a.baseline}\nMeta: ${a.target}\nRevisão: ${a.reviewCadence}`,
    expectedOutput: a.proof, executionGuide: a.execution as never,
  })) });
  return { ...state, planId: id };
}
