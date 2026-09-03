import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEnterpriseDomains,
  calculateEnterpriseTriageConfidence,
  getEnterpriseTriageCandidates,
  getTriggeredEnterpriseFollowUps,
} from "@/core/enterprise-triage-engine";
import {
  ENTERPRISE_TRIAGE_QUESTIONS,
  ENTERPRISE_TRIAGE_SCORED_QUESTION_COUNT,
} from "@/core/enterprise-triage-method";

test("version 1 keeps thirteen main questions and twelve scored questions", () => {
  assert.equal(ENTERPRISE_TRIAGE_QUESTIONS.length, 13);
  assert.equal(ENTERPRISE_TRIAGE_SCORED_QUESTION_COUNT, 12);
});

test("routes to the domain with the highest observed severity", () => {
  const results = calculateEnterpriseDomains([
    { domain: "OPERATIONS", score: 5 },
    { domain: "OPERATIONS", score: 5 },
    { domain: "OPERATIONS", score: 3 },
    { domain: "COMMERCIAL", score: 1 },
    { domain: "COMMERCIAL", score: 3 },
    { domain: "COMMERCIAL", score: 1 },
    { domain: "FINANCE", score: 3 },
    { domain: "FINANCE", score: 3 },
    { domain: "FINANCE", score: 1 },
  ]);

  assert.equal(results[0]?.domain, "OPERATIONS");
  assert.deepEqual(getEnterpriseTriageCandidates(results), ["OPERATIONS"]);
});

test("does not score unknown answers", () => {
  const results = calculateEnterpriseDomains([
    { domain: "OPERATIONS", score: null },
    { domain: "OPERATIONS", score: 5 },
    { domain: "OPERATIONS", score: null },
  ]);
  const operations = results.find((result) => result.domain === "OPERATIONS");

  assert.equal(operations?.severity, 5);
  assert.equal(operations?.validCount, 1);
  assert.equal(operations?.unknownCount, 2);
});

test("keeps the two leading domains when their scores are close", () => {
  const results = calculateEnterpriseDomains([
    { domain: "OPERATIONS", score: 5 },
    { domain: "COMMERCIAL", score: 5 },
    { domain: "FINANCE", score: 1 },
  ]);

  assert.deepEqual(getEnterpriseTriageCandidates(results), [
    "OPERATIONS",
    "COMMERCIAL",
  ]);
});

test("confidence grows with coverage and concrete evidence", () => {
  const confidence = calculateEnterpriseTriageConfidence({
    validCount: 9,
    totalScoredQuestions: 9,
    evidence: "Na última semana, 8 pedidos atrasaram e dois clientes reclamaram.",
    tieBroken: true,
  });

  assert.ok(confidence >= 0.85);
});

test("shows only the follow-ups triggered by attention or critical signals", () => {
  const questions = getTriggeredEnterpriseFollowUps([
    { questionCode: "TRIAGE-OPS-CAPACITY", score: 3 },
    { questionCode: "TRIAGE-COM-FORECAST", score: 1 },
    { questionCode: "TRIAGE-FIN-PROFIT", score: 5 },
  ]);

  assert.deepEqual(
    questions.map((question) => question.code),
    ["TRIAGE-ADP-OPS-PRESSURE", "TRIAGE-ADP-FIN-PROFIT"],
  );
});

test("does not add a follow-up for controlled or unknown trigger answers", () => {
  const questions = getTriggeredEnterpriseFollowUps([
    { questionCode: "TRIAGE-OPS-CAPACITY", score: 1 },
    { questionCode: "TRIAGE-COM-FORECAST", score: null },
    { questionCode: "TRIAGE-FIN-PROFIT", score: 1 },
  ]);

  assert.deepEqual(questions, []);
});


