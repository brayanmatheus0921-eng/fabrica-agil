import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readAccessConfig, sessionTokenHash } from "../src/core/access-credentials";
import { AUTH_COOKIE_NAME } from "../src/core/auth-config";
import { newWorkshop } from "../src/core/coo-workshop";
import { planThreadId } from "../src/core/plan-thread";

loadEnvFile(".env.local");
loadEnvFile(".env");
assert.equal(new URL(process.env.DATABASE_URL!).hostname, "127.0.0.1", "QA aceita somente banco local");
const config = readAccessConfig(process.env);
assert.ok(config && process.env.OPENAI_API_KEY, "Ambiente local incompleto");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const base = "http://127.0.0.1:3000";
const runId = randomUUID().slice(0, 8);

async function send(threadId: string, message: string, cookie: string) {
  const response = await fetch(`${base}/api/assistant/chat`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie }, body: JSON.stringify({ threadId, requestId: randomUUID(), message }) });
  const body = await response.text();
  assert.equal(response.status, 200, body);
  const events = body.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  return { text: events.filter(event => event.type === "delta").map(event => event.text).join(""), proposal: events.findLast(event => event.type === "done")?.proposal };
}

async function main() {
  const brayan = await db.user.findFirstOrThrow({ where: { OR: [{ name: { contains: "brayan", mode: "insensitive" } }, { email: { contains: "brayan", mode: "insensitive" } }] }, include: { memberships: true } });
  assert.equal(brayan.memberships.length, 1, "QA deve usar uma única empresa do Brayan");
  const companyId = brayan.memberships[0].companyId;
  const template = await db.diagnosticTemplate.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const token = randomBytes(32).toString("base64url");
  const auth = await db.authSession.create({ data: { userId: brayan.id, tokenHash: sessionTokenHash(token, config!), expiresAt: new Date(Date.now() + 3600_000) } });
  const cookie = `${AUTH_COOKIE_NAME}=${token}`;
  const diagnosis = await db.diagnosticSession.create({ data: { companyId, templateId: template.id, title: `QA plano separado ${runId}`, status: "COMPLETED", completedAt: new Date(), resultSummary: "Diagnóstico temporário para validar a área exclusiva de planos." } });
  const planning = await db.conversationThread.create({ data: { id: planThreadId(diagnosis.id), companyId, title: `Plano de ação · QA ${runId}`, workflowState: newWorkshop(diagnosis.id, diagnosis.title!) as never, messages: { create: { role: "ASSISTANT", content: "Vamos montar somente o plano deste diagnóstico." } } } });
  const operational = await db.conversationThread.create({ data: { companyId, title: `QA classificação ${runId}` } });
  const activePlan = await db.actionPlan.create({ data: { companyId, title: `QA plano ativo ${runId}`, objective: "Validar classificação de tarefas", status: "ACTIVE", windowDays: 7, startsAt: new Date(), baseline: { source: "QA" }, targetOutcome: { source: "QA" }, tasks: { create: { companyId, title: "Tarefa base de QA", status: "TODO", priority: "LOW", sortOrder: 1 } } } });
  const adHocBefore = await db.actionPlan.findUnique({ where: { id: `coo-adhoc-${companyId}` }, select: { id: true, status: true } });
  let createdTaskId: string | null = null;
  try {
    const hub = await fetch(`${base}/plano-de-acao`, { headers: { Cookie: cookie } }).then(response => response.text());
    assert.match(hub, /Planos por diagnóstico/);
    assert.match(hub, new RegExp(`QA plano separado ${runId}`));
    assert.match(hub, /Continuar plano/);
    const workspace = await fetch(`${base}/plano-de-acao/construir?chat=${encodeURIComponent(planning.id)}`, { headers: { Cookie: cookie } }).then(response => response.text());
    for (const text of ["Somente planejamento", "Plano primeiro", "Voltar aos diagnósticos"]) assert.match(workspace, new RegExp(text));
    assert.doesNotMatch(workspace, /Ferramentas e arquivos|Nova conversa/);
    const coo = await fetch(`${base}/assistente`, { headers: { Cookie: cookie } }).then(response => response.text());
    assert.doesNotMatch(coo, new RegExp(`Plano de ação · QA ${runId}`));

    const ambiguous = await send(operational.id, `Adicione a tarefa Conferir pedido QA ${runId}. A descrição é conferir as medidas antes do corte.`, cookie);
    assert.equal(ambiguous.proposal, null);
    assert.match(ambiguous.text.toLocaleLowerCase("pt-BR"), /plano|avulsa/);
    const classified = await send(operational.id, `É avulsa, fora do plano. Crie “Conferir pedido QA ${runId}”, descrição “Conferir as medidas antes do corte”, responsável Brayan, sem prazo e prioridade média.`, cookie);
    assert.ok(classified.proposal?.id, classified.text);
    const proposal = await db.cooActionProposal.findUniqueOrThrow({ where: { id: classified.proposal.id } });
    const action = proposal.action as Record<string, unknown>;
    assert.equal(action.type, "task.create");
    assert.equal(action.scope, "AD_HOC");
    assert.equal(action.planId, null);
    assert.equal(action.title, `Conferir pedido QA ${runId}`);
    assert.equal(action.ownerName, "Brayan");
    assert.equal(action.dueDate, null);
    assert.equal(action.priority, "MEDIUM");
    const decision = await fetch(`${base}/api/assistant/proposals`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie }, body: JSON.stringify({ id: proposal.id, decision: "approve" }) });
    const decisionBody = await decision.text();
    assert.equal(decision.status, 200, decisionBody);
    const created = await db.task.findFirstOrThrow({ where: { companyId, title: `Conferir pedido QA ${runId}` }, include: { actionPlan: true } });
    createdTaskId = created.id;
    assert.equal((created.actionPlan.baseline as { source?: string }).source, "COO_AD_HOC");
    const revisedGoal = `Objetivo revisado QA ${runId}`;
    const revision = await send(operational.id, `Altere o objetivo do plano “${activePlan.title}” para “${revisedGoal}”.`, cookie);
    assert.ok(revision.proposal?.id, revision.text);
    const revisionProposal = await db.cooActionProposal.findUniqueOrThrow({ where: { id: revision.proposal.id } });
    const revisionAction = revisionProposal.action as Record<string, unknown>;
    assert.equal(revisionAction.type, "project.update");
    assert.equal(revisionAction.planId, activePlan.id);
    assert.equal(revisionAction.goal, revisedGoal);
    assert.equal((await db.actionPlan.findUniqueOrThrow({ where: { id: activePlan.id } })).objective, "Validar classificação de tarefas");
    const rejected = await fetch(`${base}/api/assistant/proposals`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie }, body: JSON.stringify({ id: revisionProposal.id, decision: "reject" }) });
    const rejectedBody = await rejected.text();
    assert.equal(rejected.status, 200, rejectedBody);
    assert.equal((await db.actionPlan.findUniqueOrThrow({ where: { id: activePlan.id } })).objective, "Validar classificação de tarefas");
    console.log(JSON.stringify({ result: "PASS", diagnosticsHub: true, isolatedWorkspace: true, cooHistorySeparated: true, ambiguousTaskAsked: true, adHocTaskSeparated: true, planChangeRequiresApproval: true }));
  } finally {
    if (createdTaskId) await db.task.deleteMany({ where: { id: createdTaskId, companyId } });
    if (!adHocBefore) await db.actionPlan.deleteMany({ where: { id: `coo-adhoc-${companyId}`, companyId } });
    else await db.actionPlan.updateMany({ where: { id: adHocBefore.id, companyId }, data: { status: adHocBefore.status } });
    await db.conversationThread.deleteMany({ where: { id: { in: [planning.id, operational.id] }, companyId } });
    await db.actionPlan.deleteMany({ where: { id: activePlan.id, companyId } });
    await db.diagnosticSession.deleteMany({ where: { id: diagnosis.id, companyId } });
    await db.authSession.deleteMany({ where: { id: auth.id } });
  }
}

main().finally(() => db.$disconnect());
