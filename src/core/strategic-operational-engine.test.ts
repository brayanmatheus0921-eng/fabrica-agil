import assert from "node:assert/strict";
import test from "node:test";
import { calculatePerformanceScore, calculateThemeStatus, classifyPerformance, classifyStrategicMatrix, impactToImportance } from "./strategic-operational-engine";

test("classifica os quatro cantos da matriz conforme o anexo W.07", () => {
  assert.equal(classifyStrategicMatrix("VERY_IMPORTANT", "BAD"), "URGENT_ACTION");
  assert.equal(classifyStrategicMatrix("VERY_IMPORTANT", "VERY_GOOD"), "EFFICACY");
  assert.equal(classifyStrategicMatrix("LITTLE_IMPORTANT", "BAD"), "INDIFFERENCE");
  assert.equal(classifyStrategicMatrix("LITTLE_IMPORTANT", "VERY_GOOD"), "EXCESS");
});

test("calcula status e desempenho sem pedir classificação ao usuário", () => {
  assert.equal(calculateThemeStatus(["YES", "PARTIAL", "NO"]), "EXISTS");
  assert.equal(calculateThemeStatus(["PARTIAL", "PARTIAL", "NO"]), "NOT_EXISTS");
  assert.equal(calculatePerformanceScore(["YES", "PARTIAL", "NO"]), 50);
  assert.equal(classifyPerformance(50), "GOOD");
});

test("transforma impacto factual em importância antes da matriz", () => {
  assert.equal(impactToImportance("NO_RELEVANT_IMPACT"), "LITTLE_IMPORTANT");
  assert.equal(impactToImportance("LOCAL_WASTE"), "IMPORTANT");
  assert.equal(impactToImportance("BUSINESS_IMPACT"), "VERY_IMPORTANT");
  assert.equal(impactToImportance("UNKNOWN"), null);
});

test("classifica combinações intermediárias como área de melhorias", () => {
  assert.equal(classifyStrategicMatrix("IMPORTANT", "BAD"), "IMPROVEMENTS");
  assert.equal(classifyStrategicMatrix("VERY_IMPORTANT", "GOOD"), "IMPROVEMENTS");
  assert.equal(classifyStrategicMatrix("LITTLE_IMPORTANT", "GOOD"), "IMPROVEMENTS");
});
