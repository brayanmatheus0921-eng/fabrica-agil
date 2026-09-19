import type { WorkshopStage } from "./coo-workshop";

export type CooMode = "PLAN_REQUIRED" | "PLANNING" | "PLAN_COMPLETE" | "EXECUTION" | "FOLLOW_UP" | "ADVISORY";

export function resolveCooMode(input: { workshopStage: WorkshopStage | null; hasCompletedDiagnostic: boolean; activeTaskCount: number; pendingTaskCount: number }): CooMode {
  if (input.workshopStage === "FOLLOW_UP") return "PLAN_COMPLETE";
  if (input.workshopStage) return "PLANNING";
  if (input.activeTaskCount > 0) return input.pendingTaskCount > 0 ? "EXECUTION" : "FOLLOW_UP";
  if (input.hasCompletedDiagnostic) return "PLAN_REQUIRED";
  return "ADVISORY";
}

export function cooModeAllowsOperationalTools(mode: CooMode) {
  return mode === "EXECUTION" || mode === "FOLLOW_UP" || mode === "ADVISORY";
}

const actionsThatRequirePlan = new Set(["project.create", "task.create", "artifact.save"]);
export function assertApprovedPlanForAction(hasActivePlan: boolean, action: { type: string }) {
  if (!hasActivePlan && actionsThatRequirePlan.has(action.type)) {
    throw new Error("Finalize e aprove o plano completo antes de criar projetos, tarefas ou ferramentas.");
  }
}
