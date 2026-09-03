import { z } from "zod";
import { executionGuideSchema } from "./task-execution";

export const WORKSHOP_STAGES = ["UNDERSTAND", "MEASURE", "CAUSES", "PRIORITIZE", "PLAN", "REVIEW", "FOLLOW_UP"] as const;
export const STAGE_LABELS: Record<WorkshopStage, string> = { UNDERSTAND: "Entender", MEASURE: "Medir", CAUSES: "Investigar causas", PRIORITIZE: "Combinar prioridades", PLAN: "Construir ações", REVIEW: "Revisar plano", FOLLOW_UP: "Acompanhar" };
export type WorkshopStage = typeof WORKSHOP_STAGES[number];
export const cooActionSchema = z.object({
  what: z.string().min(1), why: z.string().min(1), who: z.string().min(1),
  whenDays: z.number().int().min(1).max(365), where: z.string().min(1), how: z.string().min(1),
  howMuch: z.string().min(1), indicator: z.string().min(1), baseline: z.string().min(1),
  target: z.string().min(1), proof: z.string().min(1), reviewCadence: z.string().min(1),
  execution: executionGuideSchema.optional(),
});
export const cooPlanSchema = z.object({
  objective: z.string().min(1),
  initiatives: z.array(z.object({
    title: z.string().min(1), kind: z.enum(["PRIMARY", "SECONDARY"]),
    facts: z.string().min(1), hypothesis: z.string().min(1), evidenceCodes: z.array(z.string()).min(1),
    methodCode: z.string().nullable(), actions: z.array(cooActionSchema).min(1).max(3),
  })).min(1).max(3),
});
export const workshopPatchSchema = z.object({
  stage: z.enum(WORKSHOP_STAGES), summary: z.string().min(1).max(6000),
  confirmedFacts: z.array(z.object({ statement: z.string(), sourceMessageId: z.string() })).max(40),
  hypotheses: z.array(z.string()).max(20),
  decision: z.object({ primaryTitle: z.string().min(1), reason: z.string().min(1), basis: z.enum(["MATRIX", "NEW_EVIDENCE", "PREFERENCE"]), confirmedByMessageId: z.string() }).nullable(),
  plan: cooPlanSchema.nullable(),
});
export const executableCooPlanSchema=cooPlanSchema.extend({initiatives:z.array(cooPlanSchema.shape.initiatives.element.extend({actions:z.array(cooActionSchema.extend({execution:executionGuideSchema})).min(1).max(3)})).min(1).max(3)});
export const executableWorkshopPatchSchema=workshopPatchSchema.extend({plan:executableCooPlanSchema.nullable()});
export type WorkshopPatch = z.infer<typeof workshopPatchSchema>;
export type CooPlan = z.infer<typeof cooPlanSchema>;
export type WorkshopState = WorkshopPatch & {
  skillVersion: 1; diagnosticId: string; diagnosticTitle: string; revision: number;
  furthestStage: number; planId: string | null;
  history: Array<{ revision: number; stage: WorkshopStage; summary: string; at: string }>;
};
export function readWorkshop(value: unknown): WorkshopState | null {
  const parsed = workshopPatchSchema.extend({
    skillVersion: z.literal(1), diagnosticId: z.string().min(1), diagnosticTitle: z.string(), revision: z.number().int().nonnegative(),
    furthestStage: z.number().int().min(0).max(6), planId: z.string().nullable(),
    history: z.array(z.object({ revision: z.number().int(), stage: z.enum(WORKSHOP_STAGES), summary: z.string(), at: z.string() })),
  }).safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function newWorkshop(diagnosticId: string, diagnosticTitle: string): WorkshopState {
  return { skillVersion: 1, diagnosticId, diagnosticTitle, stage: "UNDERSTAND", revision: 0, furthestStage: 0, summary: "Aguardando confirmação do momento atual da fábrica.", confirmedFacts: [], hypotheses: [], decision: null, plan: null, planId: null, history: [] };
}
export function applyWorkshopPatch(current: WorkshopState, raw: unknown, userIds: string[], evidenceCodes: string[], methodCodes: string[]): WorkshopState {
  const patch = workshopPatchSchema.parse(raw);
  const nextIndex = WORKSHOP_STAGES.indexOf(patch.stage);
  if (patch.stage === "FOLLOW_UP" || current.stage === "FOLLOW_UP") throw new Error("O acompanhamento é liberado pela aprovação, não pelo COO.");
  if (nextIndex > WORKSHOP_STAGES.indexOf(current.stage) + 1) throw new Error("Confirme a etapa atual antes de avançar.");
  if (patch.confirmedFacts.some((fact) => !userIds.includes(fact.sourceMessageId))) throw new Error("Fato sem mensagem do gestor.");
  if (patch.decision && !userIds.includes(patch.decision.confirmedByMessageId)) throw new Error("Prioridade sem confirmação do gestor.");
  if (patch.plan) {
    if (patch.plan.initiatives.filter((item) => item.kind === "PRIMARY").length !== 1) throw new Error("Defina uma iniciativa principal.");
    for (const item of patch.plan.initiatives) {
      if (item.methodCode && !methodCodes.includes(item.methodCode)) throw new Error("Método fora do catálogo.");
      if (item.evidenceCodes.some((code) => !evidenceCodes.includes(code) && !userIds.includes(code))) throw new Error("Evidência fora deste diagnóstico ou conversa.");
    }
  }
  if (patch.stage === "REVIEW" && (!patch.plan || !patch.decision || patch.plan.initiatives.find((item) => item.kind === "PRIMARY")?.title !== patch.decision.primaryTitle)) throw new Error("Confirme a iniciativa principal e complete o plano antes da revisão.");
  return { ...current, ...patch, revision: current.revision + 1, furthestStage: Math.max(current.furthestStage, nextIndex), history: [...current.history, { revision: current.revision, stage: current.stage, summary: current.summary, at: new Date().toISOString() }] };
}
export function revisitWorkshop(current: WorkshopState, stage: WorkshopStage): WorkshopState {
  const index = WORKSHOP_STAGES.indexOf(stage);
  if (current.stage === "FOLLOW_UP" || index < 0 || index > current.furthestStage || index >= WORKSHOP_STAGES.indexOf("REVIEW")) throw new Error("Esta etapa não pode ser reaberta agora.");
  return { ...current, stage, revision: current.revision + 1, history: [...current.history, { revision: current.revision, stage: current.stage, summary: current.summary, at: new Date().toISOString() }] };
}
