import assert from "node:assert/strict";
import test from "node:test";
import { assertApprovedPlanForAction, cooModeAllowsOperationalTools, resolveCooMode } from "./coo-mode";

test("modo planejamento tem prioridade até o plano ser aprovado", () => {
  assert.equal(resolveCooMode({ workshopStage: "PLAN", hasCompletedDiagnostic: true, activeTaskCount: 0, pendingTaskCount: 0 }), "PLANNING");
  assert.equal(resolveCooMode({ workshopStage: null, hasCompletedDiagnostic: true, activeTaskCount: 0, pendingTaskCount: 0 }), "PLAN_REQUIRED");
});

test("execução e acompanhamento dependem das tarefas do plano ativo", () => {
  assert.equal(resolveCooMode({ workshopStage: "FOLLOW_UP", hasCompletedDiagnostic: true, activeTaskCount: 4, pendingTaskCount: 2 }), "PLAN_COMPLETE");
  assert.equal(resolveCooMode({ workshopStage: null, hasCompletedDiagnostic: true, activeTaskCount: 4, pendingTaskCount: 2 }), "EXECUTION");
  assert.equal(resolveCooMode({ workshopStage: null, hasCompletedDiagnostic: true, activeTaskCount: 4, pendingTaskCount: 0 }), "FOLLOW_UP");
});

test("COO não cria projeto, tarefa ou ferramenta antes do plano aprovado", () => {
  for (const mode of ["PLAN_REQUIRED", "PLANNING", "PLAN_COMPLETE"] as const) assert.equal(cooModeAllowsOperationalTools(mode), false);
  assert.equal(cooModeAllowsOperationalTools("EXECUTION"), true);
  for (const type of ["project.create", "task.create", "artifact.save"]) assert.throws(() => assertApprovedPlanForAction(false, { type }), /Finalize e aprove/);
  assert.doesNotThrow(() => assertApprovedPlanForAction(true, { type: "task.create" }));
  assert.doesNotThrow(() => assertApprovedPlanForAction(false, { type: "company.update" }));
});
