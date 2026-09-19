import { z } from "zod";
import { canvasSchema } from "./workspace-artifacts";
import { executableWorkshopPatchSchema, type WorkshopState } from "./coo-workshop";
import { productionEventSchema } from "./task-execution";
export { assertApprovedPlanForAction } from "./coo-mode";

const id = z.string().trim().min(1).max(200);
const title = z.string().trim().min(3).max(180);
const description = z.string().trim().max(5000);
const ownerName = z.string().trim().min(1).max(120).nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.").nullable();
const priority = z.enum(["HIGH", "MEDIUM", "LOW", "URGENT"]);
const projectStatus = z.enum(["ACTIVE", "PAUSED", "COMPLETED"]);
const taskScope = z.enum(["PLAN", "AD_HOC"]);

// Update fields are optional: omitted preserves the value; nullable fields can be explicitly cleared.
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("project.create"), title, objective: z.string().trim().min(3).max(2000), horizonDays: z.number().int().min(1).max(365) }).strict(),
  z.object({ type: z.literal("project.update"), planId: id, title: title.optional(), goal: z.string().trim().min(3).max(2000).optional(), status: projectStatus.optional(), horizonDays: z.number().int().min(1).max(365).optional() }).strict(),
  z.object({ type: z.literal("task.create"), scope: taskScope.default("PLAN"), planId: id.nullable(), title, description, ownerName, dueDate: date, priority }).strict(),
  z.object({ type: z.literal("task.update"), taskId: id, title: title.optional(), description: description.nullable().optional(), ownerName: ownerName.optional(), dueDate: date.optional(), priority: priority.optional(), expectedOutput: description.optional(), planId: id.optional() }).strict(),
  z.object({ type: z.literal("task.status"), taskId: id, status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"]), report: z.string().trim().max(5000).nullable() }).strict(),
  z.object({ type: z.literal("task.note"), taskId: id, category: z.enum(["CONTEXT", "APPLIED", "RESULT", "BLOCKER"]), text: z.string().trim().min(3).max(5000) }).strict(),
  z.object({ type:z.literal("task.record"), taskId:id, intent:z.enum(["SAVE","UNDO"]), values:z.record(z.string(),z.string()).nullable(), event:productionEventSchema.nullable() }).strict(),
  z.object({ type: z.literal("plan.approve"), planId: id }).strict(),
  z.object({ type: z.literal("workshop.start"), diagnosticId: id }).strict(),
  z.object({ type: z.literal("workshop.patch"), patch: executableWorkshopPatchSchema }).strict(),
  z.object({ type: z.literal("artifact.save"), content: canvasSchema, taskId: id.nullable(), replaceArtifactId: id.nullable() }).strict(),
  z.object({ type: z.literal("checkin.save"), planId: id, checkinId: id.nullable(), summary: z.string().trim().min(3).max(1500), observedOutcome: z.string().trim().min(2).max(1500), blockers: z.string().trim().max(1000), evidence: z.string().trim().min(2).max(1500) }).strict(),
  z.object({ type: z.literal("evidence.correct"), evidenceId: id, text: z.string().trim().min(3).max(5000), reason: z.string().trim().min(3).max(1000) }).strict(),
  z.object({ type: z.literal("metric.record"), metricId: id, value: z.number().finite(), measuredDate: date.unwrap(), source: z.string().trim().min(3).max(1000) }).strict(),
  z.object({ type: z.literal("memory.save"), memoryId: id.nullable(), title, content: z.string().trim().min(3).max(5000), kind: z.enum(["FACT", "DECISION", "ASSUMPTION", "OUTCOME", "PREFERENCE"]) }).strict(),
  z.object({ type: z.literal("company.update"), field: z.enum(["name", "sector", "productionType", "teamSize", "monthlyRevenueRange", "monthlyOrderVolume", "onTimeDeliveryRange", "reworkRange", "ownerDependency", "mainGoal", "biggestChallenge", "productionStages"]), value: z.string().trim().min(1).max(2000) }).strict(),
]);
export type CooAction = z.infer<typeof actionSchema>;
export function assertCooWorkflow(state:WorkshopState|null,action:CooAction){
  if(action.type==="artifact.save" && !action.taskId)throw Error("Vincule a ferramenta a uma tarefa do plano aprovado.");
  if(!state)return;
  if(state.stage!=="FOLLOW_UP" && action.type!=="workshop.patch")throw Error("Finalize e aprove o plano completo antes de criar ferramentas ou iniciar a execução.");
}
export type CooActionResult = { message: string; href: string; artifactId?: string };
export type CooProposalView = {
  id: string; threadId: string; sourceMessageId: string; summary: string; details: string[];
  status: "PENDING" | "APPLIED" | "REJECTED" | "EXPIRED" | "STALE";
  createdAt: string; result?: CooActionResult; resumeInterview: boolean;
};

// A saved preparation is not a manager answer or final plan approval.
export function interviewResumeEligible(action: unknown, proposalId: string, latestUserMetadata: unknown, alreadyContinued: boolean): boolean {
  if (alreadyContinued || !action || typeof action !== "object" || !latestUserMetadata || typeof latestUserMetadata !== "object") return false;
  const a = action as { type?: string; patch?: { stage?: string } };
  const approval = latestUserMetadata as { proposalId?: string; decision?: string };
  return approval.proposalId === proposalId && approval.decision === "approve" &&
    (a.type === "workshop.start" || (a.type === "workshop.patch" && Boolean(a.patch?.stage)));
}

export function validateCooAction(raw: unknown): CooAction {
  const action = actionSchema.parse(raw);
  if (action.type === "task.create" && action.scope === "PLAN" && !action.planId) throw new Error("Escolha o plano da tarefa.");
  if (action.type === "task.create" && action.scope === "AD_HOC" && action.planId) throw new Error("Tarefa avulsa não pode ser vinculada ao plano.");
  if ((action.type === "project.update" || action.type === "task.update") && Object.keys(action).length <= 2) throw new Error("Informe o que deseja alterar.");
  if (action.type === "task.status" && action.status === "DONE" && (!action.report || action.report.length < 10 || action.report.split(/\s+/).length < 3)) throw new Error("Conte o que foi feito antes de concluir a tarefa.");
  if (action.type === "company.update" && action.field === "teamSize" && (!/^\d+$/.test(action.value) || Number(action.value) < 1 || Number(action.value) > 100000)) throw new Error("Informe um tamanho de equipe válido.");
  return action;
}

export const taskStatusLabels = { BACKLOG: "Planejada", TODO: "A fazer", IN_PROGRESS: "Em andamento", BLOCKED: "Bloqueada", IN_REVIEW: "Em revisão", DONE: "Concluída", CANCELLED: "Cancelada" };
export const projectStatusLabels = { ACTIVE: "Ativo", PAUSED: "Pausado", COMPLETED: "Concluído" };
export const priorityLabels = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa", URGENT: "Urgente" };

// Only unqualified replies can confirm the one visible proposal. Mixed/conditional
// instructions always go through the consultant to produce a new proposal.
export function approvalIntent(text: string): "approve" | "reject" | null {
  const value=text.trim().toLowerCase().replace(/[.!]+$/, "").trim();
  if (["sim","aprovo","confirmo","pode fazer","pode executar","pode salvar","pode criar","sim, pode fazer"].includes(value)) return "approve";
  if (["não","nao","recuso","não faça","nao faca","cancelar ação"].includes(value)) return "reject";
  return null;
}
