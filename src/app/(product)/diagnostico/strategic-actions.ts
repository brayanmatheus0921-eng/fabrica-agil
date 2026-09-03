"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DEV_COMPANY_ID } from "@/core/development";
import { buildStrategicThemeResults, countMatrixQuadrants } from "@/core/strategic-operational-engine";
import { STRATEGIC_OPERATIONAL_METHOD_CODE } from "@/core/strategic-operational-method";
import { prisma } from "@/lib/prisma";
import { runStrategicDiagnostic } from "@/server/ai/strategic-diagnostic-agent";

export async function startStrategicDiagnostic() {
  const template = await prisma.diagnosticTemplate.findFirst({
    where: { code: STRATEGIC_OPERATIONAL_METHOD_CODE, status: "ACTIVE" },
    orderBy: { version: "desc" },
  });
  if (!template) redirect("/diagnostico/novo?error=Método não publicado");
  const existing = await prisma.diagnosticSession.findFirst({
    where: { companyId: DEV_COMPANY_ID, templateId: template.id, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
  });
  const session = existing ?? await prisma.diagnosticSession.create({
    data: { companyId: DEV_COMPANY_ID, templateId: template.id, status: "IN_PROGRESS", startedAt: new Date(), title: "Identificação Estratégica Operacional · em andamento" },
  });
  redirect(`/diagnostico/novo?session=${session.id}&q=1`);
}

export async function saveStrategicAnswer(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const index = Number(formData.get("index") ?? 0);
  const questionKind = String(formData.get("questionKind") ?? "ANSWER");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  let value: unknown;
  if (questionKind === "IMPACT") {
    value = String(formData.get("value") ?? "");
    if (!["NO_RELEVANT_IMPACT", "LOCAL_WASTE", "BUSINESS_IMPACT", "FLOW_OR_CUSTOMER_IMPACT", "UNKNOWN"].includes(value as string)) redirect(`/diagnostico/novo?session=${sessionId}&q=${index + 1}&error=Selecione o efeito observado`);
  } else {
    value = String(formData.get("value") ?? "");
    if (!["YES", "NO", "PARTIAL"].includes(value as string)) redirect(`/diagnostico/novo?session=${sessionId}&q=${index + 1}&error=Selecione uma resposta`);
  }
  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, companyId: DEV_COMPANY_ID, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    include: { template: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!session || session.template.code !== STRATEGIC_OPERATIONAL_METHOD_CODE) redirect("/diagnostico/novo");
  const question = session.template.questions.find((item) => item.id === questionId);
  if (!question) redirect(`/diagnostico/novo?session=${sessionId}&q=${index + 1}&error=Pergunta inválida`);
  await prisma.diagnosticAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    update: { value: value as never, notes, score: null },
    create: { sessionId, questionId, value: value as never, notes, score: null },
  });
  const next = index + 1;
  if (next < session.template.questions.length) redirect(`/diagnostico/novo?session=${sessionId}&q=${next + 1}`);
  redirect(`/diagnostico/novo?session=${sessionId}&review=1`);
}

export async function finishStrategicDiagnostic(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, companyId: DEV_COMPANY_ID, status: { in: ["DRAFT", "IN_PROGRESS"] }, template: { code: STRATEGIC_OPERATIONAL_METHOD_CODE } },
    include: { company: true, template: { include: { questions: true } }, answers: { include: { question: true } } },
  });
  if (!session || session.answers.length !== session.template.questions.length) redirect(`/diagnostico/novo?session=${sessionId}&q=1&error=Responda todas as etapas antes de concluir`);
  const themes = buildStrategicThemeResults(session.answers.map((answer) => ({ questionCode: answer.question.code, prompt: answer.question.prompt, pillar: answer.question.pillar, value: answer.value, notes: answer.notes })));
  const matrixCounts = countMatrixQuadrants(themes);
  let analysis: unknown = null;
  let analysisStatus = "COMPLETED";
  let analysisError: string | null = null;
  try {
    analysis = await runStrategicDiagnostic({ company: { name: session.company.name, sector: session.company.sector, productionType: session.company.productionType, teamSize: session.company.teamSize }, themes });
  } catch (error) {
    analysisStatus = "FAILED";
    analysisError = error instanceof Error ? error.message : "Falha ao gerar interpretação";
  }
  const top = themes[0];
  await prisma.$transaction(async (tx) => {
    await tx.bottleneckAssessment.updateMany({ where: { companyId: DEV_COMPANY_ID, status: "ACTIVE" }, data: { status: "MONITORING" } });
    await tx.bottleneckAssessment.create({ data: { companyId: DEV_COMPANY_ID, diagnosticSessionId: session.id, category: top.theme, title: `Oportunidade de melhoria: ${top.theme}`, description: `${top.theme} está em ${top.matrixLabel}, com desempenho de ${top.performanceScore}/100, ${top.noCount} desvios completos e ${top.partialCount} desvios parciais.`, evidenceSnapshot: top as never, urgencyScore: top.quadrant === "URGENT_ACTION" ? 3 : top.quadrant === "IMPROVEMENTS" ? 2 : 1, status: "ACTIVE" } });
    await tx.diagnosticSession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: new Date(), title: `Identificação Estratégica Operacional · ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`, resultSummary: analysisStatus === "COMPLETED" ? `${matrixCounts.URGENT_ACTION} tema(s) em ação urgente e ${matrixCounts.IMPROVEMENTS} em melhorias.` : "Matriz concluída; a leitura do COO precisa ser gerada novamente.", resultSnapshot: { methodCode: STRATEGIC_OPERATIONAL_METHOD_CODE, methodVersion: session.template.version, themes, matrixCounts, analysisStatus, analysisError, analysis } as never } });
    await tx.companyMemory.create({ data: { companyId: DEV_COMPANY_ID, kind: "FACT", title: "Diagnóstico estratégico operacional", content: `Matriz concluída. Primeira oportunidade indicada: ${top.theme}.`, sourceType: "DIAGNOSTIC", sourceId: session.id } });
  });
  revalidatePath("/diagnostico"); revalidatePath("/dashboard"); revalidatePath("/assistente");
  redirect(`/diagnostico?id=${session.id}&completed=1`);
}
