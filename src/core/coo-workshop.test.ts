import { test } from "node:test";
import assert from "node:assert/strict";
import { applyWorkshopPatch, newWorkshop, revisitWorkshop } from "./coo-workshop";
const initial = newWorkshop("diagnosis", "Diagnóstico de teste");
test("workshop começa sem plano nem prioridade inventada", () => { assert.equal(initial.stage, "UNDERSTAND"); assert.equal(initial.plan, null); assert.equal(initial.decision, null); });
test("não pula etapas nem aprova pelo modelo", () => {
  assert.throws(() => applyWorkshopPatch(initial, { ...initial, stage: "PLAN" }, [], [], []));
  assert.throws(() => applyWorkshopPatch(initial, { ...initial, stage: "FOLLOW_UP" }, [], [], []));
});
test("fatos e decisão exigem origem em mensagem do gestor", () => {
  assert.throws(() => applyWorkshopPatch(initial, { ...initial, confirmedFacts: [{ statement: "Atrasos", sourceMessageId: "inventado" }] }, [], [], []));
  const state = applyWorkshopPatch(initial, { ...initial, confirmedFacts: [{ statement: "Atrasos declarados", sourceMessageId: "user1" }], stage: "MEASURE" }, ["user1"], [], []);
  assert.equal(state.revision, 1); assert.equal(state.history.length, 1);
  const back = revisitWorkshop(state, "UNDERSTAND"); assert.equal(back.confirmedFacts.length, 1); assert.equal(back.history.length, 2);
});
test("revisão sem decisão e plano completo é rejeitada", () => {
  assert.throws(() => applyWorkshopPatch({ ...initial, stage: "PLAN" }, { ...initial, stage: "REVIEW" }, [], [], []));
});
test("não revisita etapa futura nem altera plano aprovado", () => {
  assert.throws(() => revisitWorkshop(initial, "PLAN"));
  assert.throws(() => revisitWorkshop({ ...initial, stage: "FOLLOW_UP" }, "UNDERSTAND"));
});
