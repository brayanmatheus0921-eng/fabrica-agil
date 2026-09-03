"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateEnterpriseDomains,
  calculateEnterpriseTriageConfidence,
  classifyEnterpriseConfidence,
  getEnterpriseTriageCandidates,
  getTriggeredEnterpriseFollowUps,
} from "@/core/enterprise-triage-engine";
import {
  ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS,
  ENTERPRISE_DOMAIN_LABELS,
  ENTERPRISE_TRIAGE_CODE,
  ENTERPRISE_TRIAGE_METHOD,
  ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
  ENTERPRISE_TRIAGE_QUESTIONS,
  ENTERPRISE_TRIAGE_SCORED_QUESTION_COUNT,
  isEnterpriseDomain,
  type EnterpriseDomain,
} from "@/core/enterprise-triage-method";
import {
  asDiagnosticRecord,
  buildDiagnosticTitle,
  getDiagnosticSequence,
  getNextDiagnosticSequence,
} from "@/core/diagnostic-history";
import { DEV_COMPANY_ID } from "@/core/development";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const TRIAGE_FLOW_PATH = "/diagnostico/empresa";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getFollowUpState(snapshot: Record<string, unknown>) {
  const followUps = asDiagnosticRecord(snapshot.domainFollowUps);
  const requiredCodes = Array.isArray(followUps.requiredCodes)
    ? followUps.requiredCodes.filter(
        (code): code is string => typeof code === "string",
      )
    : [];
  const answers = asDiagnosticRecord(followUps.answers);

  return { followUps, requiredCodes, answers };
}

function getNextAdaptiveHref(
  snapshot: Record<string, unknown>,
  totalMainQuestions: number,
) {
  const { requiredCodes, answers } = getFollowUpState(snapshot);
  const pendingIndex = requiredCodes.findIndex(
    (code) => Object.keys(asDiagnosticRecord(answers[code])).length === 0,
  );

  if (pendingIndex >= 0) {
    return `${TRIAGE_FLOW_PATH}?step=aprofundamento&a=${pendingIndex + 1}`;
  }

  const adaptive = asDiagnosticRecord(snapshot.adaptive);
  const candidates = Array.isArray(adaptive.candidates)
    ? adaptive.candidates.filter(
        (candidate): candidate is EnterpriseDomain =>
          typeof candidate === "string" && isEnterpriseDomain(candidate),
      )
    : [];

  if (candidates.length > 1 && adaptive.confirmed !== true) {
    return `${TRIAGE_FLOW_PATH}?step=desempate`;
  }

  if (
    typeof adaptive.selectedDomain === "string" &&
    isEnterpriseDomain(adaptive.selectedDomain)
  ) {
    return `${TRIAGE_FLOW_PATH}?step=evidencia`;
  }

  return `${TRIAGE_FLOW_PATH}?q=${totalMainQuestions}`;
}

async function getEnterpriseTriageTemplate() {
  return prisma.diagnosticTemplate.findFirst({
    where: {
      code: ENTERPRISE_TRIAGE_CODE,
      status: "ACTIVE",
      domain: "ENTERPRISE",
    },
    orderBy: { version: "desc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

export async function startEnterpriseTriage() {
  const template = await getEnterpriseTriageTemplate();
  if (!template) {
    throw new Error("O diagnóstico de setor ainda não foi publicado no banco.");
  }

  let session = await prisma.diagnosticSession.findFirst({
    where: {
      companyId: DEV_COMPANY_ID,
      templateId: template.id,
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    const existingSessions = await prisma.diagnosticSession.findMany({
      where: {
        companyId: DEV_COMPANY_ID,
        status: { not: "CANCELLED" },
      },
      select: { title: true },
    });
    const startedAt = new Date();
    session = await prisma.diagnosticSession.create({
      data: {
        companyId: DEV_COMPANY_ID,
        templateId: template.id,
        title: buildDiagnosticTitle({
          sequence: getNextDiagnosticSequence(
            existingSessions.map((existingSession) => existingSession.title),
          ),
          date: startedAt,
          inProgress: true,
        }),
        status: "IN_PROGRESS",
        startedAt,
        resultSnapshot: {
          triageCode: ENTERPRISE_TRIAGE_CODE,
          triageVersion: template.version,
        },
      },
    });
  }

  const answerCount = await prisma.diagnosticAnswer.count({
    where: { sessionId: session.id },
  });
  if (answerCount >= template.questions.length) {
    redirect(
      getNextAdaptiveHref(
        asDiagnosticRecord(session.resultSnapshot),
        template.questions.length,
      ),
    );
  }

  redirect(
    `${TRIAGE_FLOW_PATH}?q=${Math.min(answerCount + 1, template.questions.length)}`,
  );
}

export async function saveEnterpriseTriageAnswer(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const index = Number(formData.get("index"));
  const rawValue = String(formData.get("value") ?? "");

  if (!sessionId || !questionId || !Number.isInteger(index)) {
    redirect(`${TRIAGE_FLOW_PATH}?q=1&error=Selecione+uma+resposta`);
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: DEV_COMPANY_ID,
      template: {
        code: ENTERPRISE_TRIAGE_CODE,
        domain: "ENTERPRISE",
      },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    include: {
      template: {
        include: { questions: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!session) redirect(TRIAGE_FLOW_PATH);

  const question = session.template.questions.find(
    (item) => item.id === questionId,
  );
  if (!question) redirect(TRIAGE_FLOW_PATH);

  const isOutcome = question.code === "TRIAGE-OUTCOME";
  const allowedOutcomeValues = ENTERPRISE_TRIAGE_OUTCOME_OPTIONS.map(
    (option) => option.value,
  );
  const numericScore = rawValue === "UNKNOWN" ? null : Number(rawValue);
  const validValue = isOutcome
    ? allowedOutcomeValues.includes(
        rawValue as (typeof ENTERPRISE_TRIAGE_OUTCOME_OPTIONS)[number]["value"],
      )
    : rawValue === "UNKNOWN" ||
      (Number.isInteger(numericScore) && [1, 3, 5].includes(Number(numericScore)));

  if (!validValue) {
    redirect(
      `${TRIAGE_FLOW_PATH}?q=${index + 1}&error=Selecione+uma+resposta`,
    );
  }

  await prisma.diagnosticAnswer.upsert({
    where: {
      sessionId_questionId: {
        sessionId: session.id,
        questionId: question.id,
      },
    },
    update: {
      value: rawValue,
      score: isOutcome || rawValue === "UNKNOWN" ? null : numericScore,
      notes: rawValue === "UNKNOWN" ? "Não sei / não medimos" : null,
    },
    create: {
      sessionId: session.id,
      questionId: question.id,
      value: rawValue,
      score: isOutcome || rawValue === "UNKNOWN" ? null : numericScore,
      notes: rawValue === "UNKNOWN" ? "Não sei / não medimos" : null,
    },
  });

  if (index < session.template.questions.length - 1) {
    revalidatePath(TRIAGE_FLOW_PATH);
    redirect(`${TRIAGE_FLOW_PATH}?q=${index + 2}`);
  }

  const answers = await prisma.diagnosticAnswer.findMany({
    where: { sessionId: session.id },
    include: { question: { select: { code: true } } },
  });
  const answerByCode = new Map(
    answers.map((answer) => [answer.question.code, answer]),
  );
  const desiredOutcomeValue = answerByCode.get("TRIAGE-OUTCOME")?.value;
  const desiredOutcome =
    typeof desiredOutcomeValue === "string" ? desiredOutcomeValue : null;
  const domainAnswers = ENTERPRISE_TRIAGE_QUESTIONS.flatMap((definition) => {
    if (definition.domain === "OUTCOME") return [];
    const answer = answerByCode.get(definition.code);
    return [
      {
        domain: definition.domain,
        score: answer?.score === null || !answer ? null : Number(answer.score),
      },
    ];
  });
  const domainResults = calculateEnterpriseDomains(
    domainAnswers,
    desiredOutcome,
  );
  const candidates = getEnterpriseTriageCandidates(
    domainResults,
    ENTERPRISE_TRIAGE_METHOD.tieThreshold,
  );
  const selectedDomain = candidates.length === 1 ? candidates[0] : null;
  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const triggeredFollowUps = getTriggeredEnterpriseFollowUps(
    answers.map((answer) => ({
      questionCode: answer.question.code,
      score: answer.score === null ? null : Number(answer.score),
    })),
  );
  const existingFollowUpAnswers = getFollowUpState(snapshot).answers;
  const retainedFollowUpAnswers = Object.fromEntries(
    triggeredFollowUps.flatMap((question) => {
      const stored = asDiagnosticRecord(existingFollowUpAnswers[question.code]);
      return Object.keys(stored).length > 0
        ? [[question.code, stored] as const]
        : [];
    }),
  );
  const nextSnapshot = {
    ...snapshot,
    desiredOutcome,
    domainResults,
    domainFollowUps: {
      requiredCodes: triggeredFollowUps.map((question) => question.code),
      answers: retainedFollowUpAnswers,
    },
    adaptive: {
      candidates,
      selectedDomain,
      confirmed: candidates.length === 1,
    },
  };

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      resultSnapshot: toInputJson(nextSnapshot),
    },
  });

  revalidatePath(TRIAGE_FLOW_PATH);
  redirect(
    getNextAdaptiveHref(nextSnapshot, session.template.questions.length),
  );
}

export async function saveEnterpriseFollowUp(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionCode = String(formData.get("questionCode") ?? "");
  const rawValue = String(formData.get("value") ?? "");
  const index = Number(formData.get("index"));

  if (
    !sessionId ||
    !questionCode ||
    !rawValue ||
    !Number.isInteger(index)
  ) {
    redirect(
      `${TRIAGE_FLOW_PATH}?step=aprofundamento&a=${Math.max(index + 1, 1)}&error=Selecione+uma+resposta`,
    );
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: DEV_COMPANY_ID,
      template: {
        code: ENTERPRISE_TRIAGE_CODE,
        domain: "ENTERPRISE",
      },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    include: { template: true },
  });
  if (!session) redirect(TRIAGE_FLOW_PATH);

  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const { requiredCodes, answers } = getFollowUpState(snapshot);
  const expectedCode = requiredCodes[index];
  const question = ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS.find(
    (definition) =>
      definition.code === questionCode && definition.code === expectedCode,
  );
  const selectedOption = question?.options.find(
    (option) => option.value === rawValue,
  );

  if (!question || !selectedOption) {
    redirect(
      `${TRIAGE_FLOW_PATH}?step=aprofundamento&a=${index + 1}&error=Selecione+uma+resposta`,
    );
  }

  const nextSnapshot = {
    ...snapshot,
    domainFollowUps: {
      requiredCodes,
      answers: {
        ...answers,
        [question.code]: {
          code: question.code,
          domain: question.domain,
          prompt: question.prompt,
          value: selectedOption.value,
          label: selectedOption.label,
        },
      },
    },
  };

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: { resultSnapshot: toInputJson(nextSnapshot) },
  });

  revalidatePath(TRIAGE_FLOW_PATH);
  redirect(
    getNextAdaptiveHref(nextSnapshot, ENTERPRISE_TRIAGE_QUESTIONS.length),
  );
}

export async function saveEnterpriseTieBreaker(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const selectedDomain = String(formData.get("selectedDomain") ?? "");
  if (!sessionId || !isEnterpriseDomain(selectedDomain)) {
    redirect(`${TRIAGE_FLOW_PATH}?step=desempate&error=Escolha+uma+situação`);
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: DEV_COMPANY_ID,
      template: { code: ENTERPRISE_TRIAGE_CODE },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
  });
  if (!session) redirect(TRIAGE_FLOW_PATH);

  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const adaptive = asDiagnosticRecord(snapshot.adaptive);
  const candidates = Array.isArray(adaptive.candidates)
    ? adaptive.candidates.filter(
        (candidate): candidate is EnterpriseDomain =>
          typeof candidate === "string" && isEnterpriseDomain(candidate),
      )
    : [];

  if (!candidates.includes(selectedDomain)) {
    redirect(`${TRIAGE_FLOW_PATH}?step=desempate&error=Escolha+uma+situação`);
  }

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      resultSnapshot: {
        ...snapshot,
        adaptive: {
          ...adaptive,
          candidates,
          selectedDomain,
          confirmed: true,
        },
      },
    },
  });

  redirect(`${TRIAGE_FLOW_PATH}?step=evidencia`);
}

export async function finishEnterpriseTriage(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();
  const skipEvidence = String(formData.get("skipEvidence") ?? "") === "1";
  if (!sessionId || (!skipEvidence && evidence.length < 3)) {
    redirect(
      `${TRIAGE_FLOW_PATH}?step=evidencia&error=Conte+um+exemplo+ou+use+"Não+tenho+agora"`,
    );
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: DEV_COMPANY_ID,
      template: { code: ENTERPRISE_TRIAGE_CODE },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    include: {
      answers: true,
      template: true,
    },
  });
  if (!session) redirect(TRIAGE_FLOW_PATH);

  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const adaptive = asDiagnosticRecord(snapshot.adaptive);
  const selectedDomainValue = adaptive.selectedDomain;
  if (
    typeof selectedDomainValue !== "string" ||
    !isEnterpriseDomain(selectedDomainValue)
  ) {
    redirect(`${TRIAGE_FLOW_PATH}?step=desempate`);
  }
  const selectedDomain = selectedDomainValue;
  const rawDomainResults = Array.isArray(snapshot.domainResults)
    ? snapshot.domainResults
    : [];
  const domainResults = rawDomainResults.flatMap((item) => {
    const record = asDiagnosticRecord(item);
    if (
      typeof record.domain !== "string" ||
      !isEnterpriseDomain(record.domain)
    ) {
      return [];
    }
    return [
      {
        domain: record.domain,
        severity:
          typeof record.severity === "number" ? record.severity : null,
        routingScore:
          typeof record.routingScore === "number" ? record.routingScore : null,
        validCount:
          typeof record.validCount === "number" ? record.validCount : 0,
        unknownCount:
          typeof record.unknownCount === "number" ? record.unknownCount : 0,
      },
    ];
  });
  const validCount = domainResults.reduce(
    (total, result) => total + result.validCount,
    0,
  );
  const candidates = Array.isArray(adaptive.candidates)
    ? adaptive.candidates
    : [];
  const followUpSignals = Object.values(
    getFollowUpState(snapshot).answers,
  ).flatMap((item) => {
    const record = asDiagnosticRecord(item);
    if (
      typeof record.code !== "string" ||
      typeof record.domain !== "string" ||
      !isEnterpriseDomain(record.domain) ||
      typeof record.prompt !== "string" ||
      typeof record.value !== "string" ||
      typeof record.label !== "string"
    ) {
      return [];
    }

    return [
      {
        code: record.code,
        domain: record.domain,
        prompt: record.prompt,
        value: record.value,
        label: record.label,
      },
    ];
  });
  const confidence = calculateEnterpriseTriageConfidence({
    validCount,
    totalScoredQuestions: ENTERPRISE_TRIAGE_SCORED_QUESTION_COUNT,
    evidence,
    tieBroken: candidates.length <= 1 || adaptive.confirmed === true,
  });
  const confidenceLabel = classifyEnterpriseConfidence(confidence);
  const selectedResult = domainResults.find(
    (result) => result.domain === selectedDomain,
  );
  const secondaryResult = domainResults.find(
    (result) => result.domain !== selectedDomain,
  );
  const completedAt = new Date();
  const sequence =
    getDiagnosticSequence(session.title) ??
    (await prisma.diagnosticSession.count({
      where: {
        companyId: DEV_COMPANY_ID,
        createdAt: { lte: session.createdAt },
      },
    }));
  const selectedLabel = ENTERPRISE_DOMAIN_LABELS[selectedDomain];

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      title: buildDiagnosticTitle({
        sequence,
        date: completedAt,
        priority: selectedLabel,
      }),
      status: "COMPLETED",
      resultSummary: `área prioritária provável: ${selectedLabel}. Confiança ${confidenceLabel.toLocaleLowerCase("pt-BR")}.`,
      resultSnapshot: {
        ...snapshot,
        domainResults,
        adaptive: {
          ...adaptive,
          selectedDomain,
          confirmed: true,
        },
        decision: {
          selectedDomain,
          selectedLabel,
          secondaryDomain: secondaryResult?.domain ?? null,
          severity: selectedResult?.severity ?? null,
          confidence,
          confidenceLabel,
          evidence: skipEvidence ? null : evidence,
          evidenceMissing: skipEvidence,
          followUpSignals,
          nextTemplateCode:
            selectedDomain === "OPERATIONS"
              ? "MOVEIS-OPERACIONAL-ROTA-V1"
              : null,
          specialistStatus:
            selectedDomain === "OPERATIONS" ? "AVAILABLE" : "PENDING",
        },
      },
      completedAt,
    },
  });

  revalidatePath("/diagnostico");
  revalidatePath("/dashboard");
  revalidatePath("/assistente");
  redirect(`/diagnostico/proximo?triagem=${session.id}`);
}

export async function continueWithEnterpriseInvestigation(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: DEV_COMPANY_ID,
      status: "COMPLETED",
      template: {
        code: ENTERPRISE_TRIAGE_CODE,
        domain: "ENTERPRISE",
      },
    },
    select: { id: true, resultSnapshot: true },
  });
  if (!session) redirect("/diagnostico");

  const decision = asDiagnosticRecord(
    asDiagnosticRecord(session.resultSnapshot).decision,
  );
  if (
    decision.selectedDomain !== "COMMERCIAL" &&
    decision.selectedDomain !== "FINANCE"
  ) {
    redirect(`/diagnostico/proximo?triagem=${session.id}`);
  }

  await prisma.company.updateMany({
    where: {
      id: DEV_COMPANY_ID,
      onboardingStatus: "IN_PROGRESS",
    },
    data: { onboardingStatus: "COMPLETED" },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/assistente");
  redirect(`/assistente?diagnostico=${session.id}&onboarding=1`);
}


