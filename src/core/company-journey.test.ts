import assert from "node:assert/strict";
import test from "node:test";
import { resolveCompanyJourney } from "./company-journey";

const base = { onboardingComplete: true, profileComplete: true, diagnosticId: "diagnostico", workshop: null, activePlan: null };

test("jornada leva do diagnóstico concluído ao plano, nunca a uma tarefa solta", () => {
  const result=resolveCompanyJourney(base);
  const planning=resolveCompanyJourney({ ...base, workshop: { threadId: "chat", stage: "CAUSES" } });
  assert.equal(result.kind, "RESULT");
  assert.equal(result.href, "/plano-de-acao");
  assert.equal(planning.kind, "PLANNING");
  assert.equal(planning.href, "/plano-de-acao/construir?chat=chat");
});

test("jornada só libera execução quando existe plano ativo", () => {
  const step = resolveCompanyJourney({ ...base, activePlan: { id: "plano", nextTaskId: "tarefa", taskCount: 4, completedTasks: 0 } });
  assert.equal(step.kind, "EXECUTION");
  assert.equal(step.href, "/tarefas/tarefa");
});

test("jornada envia plano concluído para acompanhamento", () => {
  assert.equal(resolveCompanyJourney({ ...base, activePlan: { id: "plano", nextTaskId: null, taskCount: 4, completedTasks: 4 } }).kind, "FOLLOW_UP");
});
