import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRota30Confidence,
  calculateRota30Pillars,
  calculateRota30Priority,
  classifyRota30Confidence,
  shouldRota30Abstain,
} from "./rota30-engine";

test("ignora respostas desconhecidas na média do pilar", () => {
  const [result] = calculateRota30Pillars([
    { pillar: "Fluxo", score: 5 },
    { pillar: "Fluxo", score: null },
    { pillar: "Fluxo", score: 3 },
  ]);
  assert.equal(result.score, 4);
  assert.equal(result.validCount, 2);
  assert.equal(result.unknownCount, 1);
});

test("calcula prioridade separando severidade e impacto", () => {
  assert.equal(calculateRota30Priority(4, 3), 12);
});

test("evidência específica gera confiança alta", () => {
  const confidence = calculateRota30Confidence({
    validCount: 5,
    evidence: "Na última semana, 7 pedidos ficaram dois dias na fila do corte.",
  });
  assert.equal(classifyRota30Confidence(confidence), "ALTA");
  assert.equal(shouldRota30Abstain({ validCount: 5, evidence: "Na última semana, 7 pedidos ficaram dois dias na fila do corte.", confidence }), false);
});

test("baixa evidência causa abstenção", () => {
  const confidence = calculateRota30Confidence({ validCount: 1, evidence: "Acho que sim" });
  assert.equal(classifyRota30Confidence(confidence), "BAIXA");
  assert.equal(shouldRota30Abstain({ validCount: 1, evidence: "Acho que sim", confidence }), true);
});


