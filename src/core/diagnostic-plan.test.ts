import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticPlanId, validateDiagnosticPlan, type RankedPlanTheme } from "./diagnostic-plan";

const themes: RankedPlanTheme[] = [1, 2, 3, 4].map((n) => ({ themeCode: `T${n}`, priorityOrder: n, quadrant: n < 4 ? "URGENT_ACTION" : "IMPROVEMENTS", evidenceCodes: [`Q${n}`] }));
function fixture() {
  return { objective: "Melhorar o fluxo", missingEvidence: [], priorities: [1, 2, 3].map((n) => ({
    title: `Prioridade ${n}`, area: `Área ${n}`, themeCodes: [`T${n}`], evidenceCodes: [`Q${n}`],
    facts: "Resposta registrada", inference: "Hipótese a confirmar", rationale: "Área urgente", methodCode: "PADRAO",
    suggestedOwner: "Gestor", indicator: "Horas", suggestedTarget: "Medir por 7 dias",
    actions: [{ title: "Medir", what: "Registrar tempo", why: "Confirmar", expectedOutput: "Registro", dueInDays: 7 }],
  })) };
}
test("plano exige exatamente três prioridades", () => {
  const plan = fixture(); plan.priorities.pop();
  assert.throws(() => validateDiagnosticPlan(plan, ["Q1", "Q2", "Q3"], ["PADRAO"]));
});
test("rejeita métodos e evidências inventados", () => {
  const plan = fixture();
  assert.throws(() => validateDiagnosticPlan(plan, ["Q1"], ["PADRAO"]));
  assert.throws(() => validateDiagnosticPlan(plan, ["Q1", "Q2", "Q3"], ["OUTRO"]));
});
test("ordena pela matriz e não pela ordem proposta pelo COO", () => {
  const plan = fixture(); plan.priorities.reverse();
  const result = validateDiagnosticPlan(plan, ["Q1", "Q2", "Q3"], ["PADRAO"], themes);
  assert.deepEqual(result.priorities.map((p) => p.themeCodes[0]), ["T1", "T2", "T3"]);
});
test("não pula tema urgente para atender melhoria", () => {
  const plan = fixture(); plan.priorities[2].themeCodes = ["T4"]; plan.priorities[2].evidenceCodes = ["Q4"];
  assert.throws(() => validateDiagnosticPlan(plan, ["Q1", "Q2", "Q4"], ["PADRAO"], themes));
});
test("identidade do plano separa os ciclos e permite geração idempotente", () => {
  assert.equal(diagnosticPlanId("a"), diagnosticPlanId("a"));
  assert.notEqual(diagnosticPlanId("a"), diagnosticPlanId("b"));
});
test("prioridade sem método pode pedir medição, sem inventar biblioteca", () => {
  const plan = fixture(); const input = { ...plan, priorities: plan.priorities.map((p) => ({ ...p, methodCode: null })) };
  assert.equal(validateDiagnosticPlan(input, ["Q1", "Q2", "Q3"], [], themes).priorities.length, 3);
});
