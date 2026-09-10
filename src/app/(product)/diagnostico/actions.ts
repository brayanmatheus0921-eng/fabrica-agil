"use server";

import { requireAuth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateRota30Confidence,
  calculateRota30Pillars,
  calculateRota30Priority,
  classifyRota30Confidence,
  shouldRota30Abstain,
} from "@/core/rota30-engine";
import {
  ROTA30_METHOD_BY_PILLAR,
  ROTA30_METHOD_CODE,
} from "@/core/rota30-diagnostic-method";
import {
  buildDiagnosticTitle,
  getDiagnosticSequence,
  getNextDiagnosticSequence,
} from "@/core/diagnostic-history";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

function rotaFlowHref(
  sessionId: string,
  params: { q?: number; step?: string; error?: string } = {},
) {
  const search = new URLSearchParams({ session: sessionId });
  if (params.q) search.set("q", String(params.q));
  if (params.step) search.set("step", params.step);
  if (params.error) search.set("error", params.error);
  return `/diagnostico/novo?${search.toString()}`;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

async function getRota30Template() {
  return prisma.diagnosticTemplate.findFirst({
    where: { code: ROTA30_METHOD_CODE, status: "ACTIVE" },
    orderBy: { version: "desc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

export async function startDiagnostic(formData?: FormData) {
  const requestedOriginSessionId = String(
    formData?.get("originSessionId") ?? "",
  );
  const originSession = requestedOriginSessionId
    ? await prisma.diagnosticSession.findFirst({
        where: {
          id: requestedOriginSessionId,
          companyId: (await requireAuth()).companyId,
          status: "COMPLETED",
          template: { domain: "ENTERPRISE" },
        },
        select: { id: true, resultSnapshot: true },
      })
    : null;
  const originDecision = asRecord(
    asRecord(originSession?.resultSnapshot).decision,
  );
  const originSessionId =
    originSession && originDecision.selectedDomain === "OPERATIONS"
      ? originSession.id
      : null;
  const template = await getRota30Template();
  if (!template) throw new Error("O Método ROTA 30 ainda não foi publicado no banco.");

  let session = await prisma.diagnosticSession.findFirst({
    where: {
      companyId: (await requireAuth()).companyId,
      templateId: template.id,
      status: { in: ["DRAFT", "IN_PROGRESS"] },
      ...(originSessionId ? { originSessionId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    const existingSessions = await prisma.diagnosticSession.findMany({
      where: {
        companyId: (await requireAuth()).companyId,
        status: { not: "CANCELLED" },
      },
      select: { title: true },
    });
    const startedAt = new Date();
    session = await prisma.diagnosticSession.create({
      data: {
        companyId: (await requireAuth()).companyId,
        templateId: template.id,
        originSessionId,
        title: buildDiagnosticTitle({
          sequence: getNextDiagnosticSequence(
            existingSessions.map((existingSession) => existingSession.title),
          ),
          date: startedAt,
          inProgress: true,
        }),
        status: "IN_PROGRESS",
        startedAt,
        resultSnapshot: { methodCode: ROTA30_METHOD_CODE, methodVersion: template.version },
      },
    });
  }

  redirect(rotaFlowHref(session.id, { q: 1 }));
}

export async function saveDiagnosticAnswer(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const index = Number(formData.get("index"));
  const rawValue = String(formData.get("value") ?? "");
  const score = rawValue === "UNKNOWN" ? null : Number(rawValue);

  if (
    !sessionId ||
    !questionId ||
    !Number.isInteger(index) ||
    (rawValue !== "UNKNOWN" && (!Number.isInteger(score) || Number(score) < 1 || Number(score) > 5))
  ) {
    redirect(
      sessionId
        ? rotaFlowHref(sessionId, {
            q: Number.isInteger(index) ? index + 1 : 1,
            error: "Selecione uma resposta",
          })
        : "/diagnostico/novo",
    );
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: (await requireAuth()).companyId,
      template: { code: ROTA30_METHOD_CODE },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    include: { template: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!session) redirect("/diagnostico/novo");
  if (!session.template.questions.some((question) => question.id === questionId)) redirect("/diagnostico/novo");

  await prisma.diagnosticAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    update: { value: rawValue === "UNKNOWN" ? "UNKNOWN" : Number(rawValue), score, notes: score === null ? "Não sei/não medimos" : null },
    create: { sessionId, questionId, value: rawValue === "UNKNOWN" ? "UNKNOWN" : Number(rawValue), score, notes: score === null ? "Não sei/não medimos" : null },
  });

  if (index < session.template.questions.length - 1) {
    revalidatePath("/diagnostico/novo");
    redirect(rotaFlowHref(session.id, { q: index + 2 }));
  }

  const answers = await prisma.diagnosticAnswer.findMany({
    where: { sessionId },
    include: { question: { select: { pillar: true } } },
  });
  const pillarResults = calculateRota30Pillars(
    answers.map((answer) => ({ pillar: answer.question.pillar, score: answer.score === null ? null : Number(answer.score) })),
  );
  const candidates = pillarResults.slice(0, 2).map((result) => ({ pillar: result.pillar, score: result.score }));

  await prisma.diagnosticSession.update({
    where: { id: sessionId },
    data: {
      resultSnapshot: {
        ...asRecord(session.resultSnapshot),
        pillarResults,
        adaptive: { candidates },
      },
    },
  });
  revalidatePath("/diagnostico/novo");
  redirect(rotaFlowHref(session.id, { step: "adaptativa-1" }));
}

export async function saveAdaptivePriority(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const selectedPillar = String(formData.get("selectedPillar") ?? "");
  const session = await prisma.diagnosticSession.findFirst({ where: { id: sessionId, companyId: (await requireAuth()).companyId, template: { code: ROTA30_METHOD_CODE } } });
  if (!session) redirect("/diagnostico/novo");
  const snapshot = asRecord(session.resultSnapshot);
  const adaptive = asRecord(snapshot.adaptive);
  const candidates = Array.isArray(adaptive.candidates) ? adaptive.candidates.map((item) => asRecord(item).pillar).filter((item): item is string => typeof item === "string") : [];
  if (!candidates.includes(selectedPillar)) {
    redirect(
      rotaFlowHref(session.id, {
        step: "adaptativa-1",
        error: "Escolha uma situação",
      }),
    );
  }

  await prisma.diagnosticSession.update({ where: { id: session.id }, data: { resultSnapshot: { ...snapshot, adaptive: { ...adaptive, selectedPillar } } } });
  redirect(rotaFlowHref(session.id, { step: "adaptativa-2" }));
}

export async function saveAdaptiveImpact(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const consequence = String(formData.get("consequence") ?? "").trim();
  const impact = Number(formData.get("impact"));
  if (!sessionId || consequence.length < 2 || ![1, 2, 3].includes(impact)) {
    redirect(
      sessionId
        ? rotaFlowHref(sessionId, {
            step: "adaptativa-2",
            error: "Informe a consequência e o impacto",
          })
        : "/diagnostico/novo",
    );
  }
  const session = await prisma.diagnosticSession.findFirst({ where: { id: sessionId, companyId: (await requireAuth()).companyId, template: { code: ROTA30_METHOD_CODE } } });
  if (!session) redirect("/diagnostico/novo");
  const snapshot = asRecord(session.resultSnapshot);
  const adaptive = asRecord(snapshot.adaptive);
  await prisma.diagnosticSession.update({ where: { id: session.id }, data: { resultSnapshot: { ...snapshot, adaptive: { ...adaptive, consequence, impact } } } });
  redirect(rotaFlowHref(session.id, { step: "adaptativa-3" }));
}

export async function finishRota30Diagnostic(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!sessionId || evidence.length < 3) {
    redirect(
      sessionId
        ? rotaFlowHref(sessionId, {
            step: "adaptativa-3",
            error: "Conte um exemplo recente",
          })
        : "/diagnostico/novo",
    );
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, companyId: (await requireAuth()).companyId, template: { code: ROTA30_METHOD_CODE }, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    include: { answers: { include: { question: { select: { pillar: true } } } }, template: true },
  });
  if (!session) redirect("/diagnostico/novo");
  const snapshot = asRecord(session.resultSnapshot);
  const adaptive = asRecord(snapshot.adaptive);
  const selectedPillar = String(adaptive.selectedPillar ?? "");
  const consequence = String(adaptive.consequence ?? "");
  const impact = Number(adaptive.impact);
  const pillarResults = calculateRota30Pillars(session.answers.map((answer) => ({ pillar: answer.question.pillar, score: answer.score === null ? null : Number(answer.score) })));
  const selectedResult = pillarResults.find((item) => item.pillar === selectedPillar);
  const methodCode = ROTA30_METHOD_BY_PILLAR[selectedPillar];
  if (
    !selectedResult ||
    selectedResult.score === null ||
    !methodCode ||
    ![1, 2, 3].includes(impact)
  ) {
    redirect(
      rotaFlowHref(session.id, {
        step: "adaptativa-1",
        error: "Confirme a oportunidade",
      }),
    );
  }

  const confidence = calculateRota30Confidence({ validCount: selectedResult.validCount, evidence });
  const confidenceLabel = classifyRota30Confidence(confidence);
  const severity = Math.round(selectedResult.score);
  const priority = calculateRota30Priority(severity, impact);
  const abstained = shouldRota30Abstain({ validCount: selectedResult.validCount, evidence, confidence });
  const methodVersion = abstained ? null : await prisma.methodVersion.findFirst({
    where: { method: { code: methodCode, status: "ACTIVE" }, publishedAt: { not: null } },
    orderBy: { version: "desc" }, include: { method: true },
  });
  if (!abstained && !methodVersion) throw new Error("Método de melhoria não publicado.");

  await prisma.$transaction(async (transaction) => {
    await transaction.bottleneckAssessment.updateMany({ where: { companyId: (await requireAuth()).companyId, status: "ACTIVE" }, data: { status: "MONITORING" } });
    await transaction.methodRecommendation.updateMany({ where: { companyId: (await requireAuth()).companyId, status: "PROPOSED" }, data: { status: "SUPERSEDED" } });

    const bottleneck = await transaction.bottleneckAssessment.create({
      data: {
        companyId: (await requireAuth()).companyId,
        diagnosticSessionId: session.id,
        category: selectedPillar,
        title: abstained ? `Hipótese a confirmar: ${selectedPillar}` : `Oportunidade: ${selectedPillar}`,
        description: abstained
          ? "Ainda faltam evidências para indicar uma intervenção com segurança. O próximo passo é medir e confirmar a hipótese."
          : `As respostas indicam uma oportunidade em ${selectedPillar}. O fato informado foi: ${evidence}`,
        evidenceSnapshot: { pillarResults, consequence, evidence, severity, impact, priority, confidence, confidenceLabel },
        impactScore: impact,
        urgencyScore: priority >= 10 ? 3 : priority >= 6 ? 2 : 1,
        confidenceScore: confidence,
        status: "ACTIVE",
      },
    });

    if (methodVersion) {
      await transaction.methodRecommendation.create({
        data: {
          companyId: (await requireAuth()).companyId,
          diagnosticSessionId: session.id,
          bottleneckId: bottleneck.id,
          methodVersionId: methodVersion.id,
          rationale: `${methodVersion.method.name} corresponde à oportunidade em ${selectedPillar} e será aplicado em um ciclo acompanhado de 30 dias.`,
          tradeOffs: methodVersion.requiredInputs ?? undefined,
          expectedImpact: { pillar: selectedPillar, consequence, severity, impact, priority, confidence },
          status: "PROPOSED",
        },
      });
    }

    await transaction.diagnosticSession.update({
      where: { id: session.id },
      data: {
        title: buildDiagnosticTitle({
          sequence:
            getDiagnosticSequence(session.title) ??
            (await transaction.diagnosticSession.count({
              where: {
                companyId: (await requireAuth()).companyId,
                createdAt: { lte: session.createdAt },
              },
            })),
          date: new Date(),
          priority: selectedPillar,
        }),
        status: "COMPLETED",
        overallScore: null,
        resultSummary: abstained
          ? `Hipótese principal: ${selectedPillar}. Antes de intervir, precisamos confirmar com evidências.`
          : `Oportunidade identificada: ${selectedPillar}. Método indicado: ${methodVersion?.method.name}.`,
        resultSnapshot: {
          ...snapshot,
          methodCode: ROTA30_METHOD_CODE,
          methodVersion: session.template.version,
          pillarResults,
          adaptive: { ...adaptive, evidence },
          decision: { selectedPillar, methodCode: methodVersion ? methodCode : null, consequence, severity, impact, priority, confidence, confidenceLabel, abstained },
        },
        completedAt: new Date(),
      },
    });
    await transaction.company.updateMany({
      where: {
        id: (await requireAuth()).companyId,
        onboardingStatus: "IN_PROGRESS",
      },
      data: { onboardingStatus: "COMPLETED" },
    });
  });

  revalidatePath("/");
  revalidatePath("/onboarding");
  revalidatePath("/diagnostico");
  revalidatePath("/diagnostico/novo");
  revalidatePath("/dashboard");
  revalidatePath("/gargalo");
  revalidatePath("/metodos");
  revalidatePath("/assistente");
  redirect(`/diagnostico/orientacao?id=${session.id}&completed=1`);
}

export async function deleteDiagnostic(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) redirect("/diagnostico");

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: (await requireAuth()).companyId,
    },
    select: { id: true },
  });

  if (!session) redirect("/diagnostico");

  await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM "DiagnosticSession" WHERE id = ${session.id} AND "companyId" = ${(await requireAuth()).companyId} FOR UPDATE`;
    const recommendations = await transaction.methodRecommendation.findMany({
      where: {
        companyId: (await requireAuth()).companyId,
        OR: [
          { diagnosticSessionId: session.id },
          { bottleneck: { diagnosticSessionId: session.id } },
        ],
      },
      select: {
        id: true,
        actionPlans: { select: { id: true } },
      },
    });
    const recommendationIds = recommendations.map(
      (recommendation) => recommendation.id,
    );
      const directPlans = await transaction.actionPlan.findMany({
        where: { companyId: (await requireAuth()).companyId, baseline: { path: ["diagnosticSessionId"], equals: session.id } },
        select: { id: true },
      });
      const actionPlanIds = [...new Set([...directPlans.map((plan) => plan.id), ...recommendations.flatMap((recommendation) =>
        recommendation.actionPlans.map((actionPlan) => actionPlan.id),
      )])];
    const tasks =
      actionPlanIds.length > 0
        ? await transaction.task.findMany({
            where: { actionPlanId: { in: actionPlanIds } },
            select: { id: true },
          })
        : [];
    const checkins =
      actionPlanIds.length > 0
        ? await transaction.progressCheckin.findMany({
            where: { actionPlanId: { in: actionPlanIds } },
            select: { id: true },
          })
        : [];
    const taskIds = tasks.map((task) => task.id);
    const checkinIds = checkins.map((checkin) => checkin.id);

    if (taskIds.length > 0 || checkinIds.length > 0) {
      await transaction.evidenceOutput.deleteMany({
        where: {
          OR: [
            ...(taskIds.length > 0 ? [{ taskId: { in: taskIds } }] : []),
            ...(checkinIds.length > 0
              ? [{ checkinId: { in: checkinIds } }]
              : []),
          ],
        },
      });
    }

    await transaction.metricMeasurement.deleteMany({
      where: {
        OR: [
          { diagnosticSessionId: session.id },
          ...(checkinIds.length > 0
            ? [{ checkinId: { in: checkinIds } }]
            : []),
        ],
      },
    });

    if (checkinIds.length > 0) {
      await transaction.progressCheckin.deleteMany({
        where: { id: { in: checkinIds } },
      });
    }
    if (actionPlanIds.length > 0) {
      await transaction.lessonAssignment.deleteMany({
        where: { actionPlanId: { in: actionPlanIds } },
      });
      await transaction.actionPlan.deleteMany({
        where: { id: { in: actionPlanIds } },
      });
    }
    if (recommendationIds.length > 0) {
      await transaction.methodRecommendation.deleteMany({
        where: { id: { in: recommendationIds } },
      });
    }

    await transaction.bottleneckAssessment.deleteMany({
      where: { diagnosticSessionId: session.id },
    });
    await transaction.companyMemory.deleteMany({
      where: {
        companyId: (await requireAuth()).companyId,
        sourceType: "DIAGNOSTIC",
        sourceId: session.id,
      },
    });
    await transaction.conversationThread.deleteMany({ where: { companyId: (await requireAuth()).companyId, workflowState: { path: ["diagnosticId"], equals: session.id } } });
    await transaction.diagnosticSession.delete({
      where: { id: session.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/diagnostico");
  revalidatePath("/dashboard");
  revalidatePath("/gargalo");
  revalidatePath("/metodos");
  revalidatePath("/plano-de-acao");
  revalidatePath("/tarefas");
  revalidatePath("/acompanhamento");
  revalidatePath("/memoria");
  revalidatePath("/assistente");
  redirect("/diagnostico?deleted=1");
}


