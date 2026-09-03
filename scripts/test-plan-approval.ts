import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { activateDraftPlan } from "../src/server/plans/approve-plan";

async function main() {
loadEnvFile(".env");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const rollback = new Error("ROLLBACK_QA");
try {
  await prisma.$transaction(async (tx) => {
    const plan = await tx.actionPlan.create({ data: {
      companyId: DEV_COMPANY_ID, title: "QA — aprovação isolada", objective: "Teste transacional", status: "DRAFT", windowDays: 30,
      targetOutcome: { taskDeadlines: [5, 10, 20, 30] },
      tasks: { create: [1, 2, 3, 4].map((n) => ({ companyId: DEV_COMPANY_ID, title: `QA ${n}`, status: "BACKLOG", sortOrder: n })) },
    }, include: { tasks: true } });
    assert.ok(plan.tasks.every((task) => task.status === "BACKLOG" && task.dueAt === null));
    assert.equal(await activateDraftPlan(tx, "wrong-company", plan.id), false);
    const now = new Date("2026-08-30T12:00:00Z");
    assert.equal(await activateDraftPlan(tx, DEV_COMPANY_ID, plan.id, now), true);
    assert.equal(await activateDraftPlan(tx, DEV_COMPANY_ID, plan.id, now), false);
    const approved = await tx.actionPlan.findUniqueOrThrow({ where: { id: plan.id }, include: { tasks: { orderBy: { sortOrder: "asc" } }, checkins: true } });
    assert.equal(approved.status, "ACTIVE");
    assert.deepEqual(approved.tasks.map((task) => task.status), ["TODO", "TODO", "TODO", "BACKLOG"]);
    assert.equal(approved.checkins.length, 1);
    assert.equal(approved.tasks[0].dueAt!.toISOString(), "2026-09-04T12:00:00.000Z");
    assert.equal(await tx.actionPlan.count({ where: { companyId: DEV_COMPANY_ID, status: "ACTIVE" } }), 1);
    throw rollback;
  }, { timeout: 15000 });
} catch (error) {
  if (error !== rollback) throw error;
  console.log("PASS: aprovação, isolamento da empresa, limite de 3 tarefas, prazos e idempotência. Todas as alterações de QA revertidas pela transação.");
} finally {
  await prisma.$disconnect();
}
}
main().catch(() => { console.error("Falha no teste de aprovação; confira o banco local e as asserções."); process.exitCode = 1; });
