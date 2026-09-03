import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { asDiagnosticRecord } from "../src/core/diagnostic-history";
import { validateDiagnosticPlan, type RankedPlanTheme } from "../src/core/diagnostic-plan";
import { DEV_COMPANY_ID } from "../src/core/development";

async function main() {
  loadEnvFile(".env");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const plan = await db.actionPlan.findFirstOrThrow({ where: { companyId: DEV_COMPANY_ID, status: "DRAFT", baseline: { path: ["source"], equals: "COO_DIAGNOSTIC_PLAN" } }, orderBy: { createdAt: "desc" }, include: { tasks: true, checkins: true } });
    const id = String(asDiagnosticRecord(plan.baseline).diagnosticSessionId);
    const session = await db.diagnosticSession.findUniqueOrThrow({ where: { id }, include: { answers: { include: { question: true } } } });
    const snapshot = asDiagnosticRecord(session.resultSnapshot);
    const themes: RankedPlanTheme[] = (Array.isArray(snapshot.themes) ? snapshot.themes : []).map(asDiagnosticRecord).map((theme) => ({ themeCode: String(theme.themeCode), priorityOrder: typeof theme.priorityOrder === "number" ? theme.priorityOrder : null, quadrant: typeof theme.quadrant === "string" ? theme.quadrant : null, evidenceCodes: (Array.isArray(theme.answers) ? theme.answers : []).map((a) => String(asDiagnosticRecord(a).questionCode)) }));
    const methods = await db.improvementMethod.findMany({ where: { status: "ACTIVE" }, select: { code: true } });
    const output = validateDiagnosticPlan(plan.targetOutcome, session.answers.map((answer) => answer.question.code), methods.map((method) => method.code), themes);
    assert.equal(plan.companyId, session.companyId);
    assert.equal(plan.tasks.length, output.priorities.flatMap((p) => p.actions).length);
    assert.ok(plan.tasks.every((task) => task.status === "BACKLOG" && !task.startsAt && !task.dueAt));
    assert.equal(plan.checkins.length, 0);
    assert.equal(await db.actionPlan.count({ where: { companyId: DEV_COMPANY_ID, baseline: { path: ["diagnosticSessionId"], equals: id } } }), 1);
    console.log(JSON.stringify({ status: "PASS", diagnosisId: id, priorities: output.priorities.length, pendingTasks: plan.tasks.length, checkins: 0, duplicatePlans: false }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Falha na verificação do plano pendente."); process.exitCode = 1; });
