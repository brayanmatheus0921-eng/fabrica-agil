import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEV_COMPANY_ID,
  DEV_MEMBERSHIP_ID,
  DEV_USER_ID,
} from "../src/core/development";
import { buildDiagnosticTitle } from "../src/core/diagnostic-history";
import {
  ENTERPRISE_TRIAGE_METHOD,
  ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
} from "../src/core/enterprise-triage-method";
import { ROTA30_DIAGNOSTIC_METHOD } from "../src/core/rota30-diagnostic-method";
import { STRATEGIC_OPERATIONAL_METHOD } from "../src/core/strategic-operational-method";

loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.diagnosticTemplate.updateMany({
    where: { code: "MOVEIS-OPERACIONAL-V1", status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });
  await prisma.improvementMethod.updateMany({
    where: {
      code: {
        in: [
          "FLUXO-FIFO-V1",
          "GARGALO-CAPACIDADE-V1",
          "QUALIDADE-DMAIC-V1",
          "MATERIAIS-PUXADA-V1",
          "PADRAO-GESTAO-V1",
        ],
      },
      status: "ACTIVE",
    },
    data: { status: "ARCHIVED" },
  });

  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {
      name: "Gestor de desenvolvimento",
      email: "gestor.dev@fabrica-agil.local",
    },
    create: {
      id: DEV_USER_ID,
      name: "Gestor de desenvolvimento",
      email: "gestor.dev@fabrica-agil.local",
    },
  });

  await prisma.company.upsert({
    where: { id: DEV_COMPANY_ID },
    update: {},
    create: {
      id: DEV_COMPANY_ID,
      name: "Minha fábrica",
      onboardingStatus: "NOT_STARTED",
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userId: {
        companyId: DEV_COMPANY_ID,
        userId: DEV_USER_ID,
      },
    },
    update: { role: "OWNER" },
    create: {
      id: DEV_MEMBERSHIP_ID,
      companyId: DEV_COMPANY_ID,
      userId: DEV_USER_ID,
      role: "OWNER",
    },
  });

  const enterpriseTriage = ENTERPRISE_TRIAGE_METHOD;
  const enterpriseTemplate = await prisma.diagnosticTemplate.upsert({
    where: {
      code_version: {
        code: enterpriseTriage.code,
        version: enterpriseTriage.version,
      },
    },
    update: {
      name: enterpriseTriage.name,
      description: enterpriseTriage.description,
      domain: "ENTERPRISE",
      status: "ACTIVE",
      scoringConfig: {
        tieThreshold: enterpriseTriage.tieThreshold,
        outcomeOptions: ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
        adaptiveQuestions: enterpriseTriage.adaptiveQuestions,
        destinations: ["OPERATIONS", "COMMERCIAL", "FINANCE"],
        sourceOfTruth: enterpriseTriage.sourceOfTruth,
      },
      publishedAt: new Date(),
    },
    create: {
      code: enterpriseTriage.code,
      name: enterpriseTriage.name,
      description: enterpriseTriage.description,
      domain: "ENTERPRISE",
      version: enterpriseTriage.version,
      status: "ACTIVE",
      scoringConfig: {
        tieThreshold: enterpriseTriage.tieThreshold,
        outcomeOptions: ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
        adaptiveQuestions: enterpriseTriage.adaptiveQuestions,
        destinations: ["OPERATIONS", "COMMERCIAL", "FINANCE"],
        sourceOfTruth: enterpriseTriage.sourceOfTruth,
      },
      publishedAt: new Date(),
    },
  });

  await prisma.diagnosticTemplate.updateMany({
    where: {
      code: enterpriseTriage.code,
      version: { not: enterpriseTriage.version },
      status: "ACTIVE",
    },
    data: { status: "ARCHIVED" },
  });

  for (const [order, question] of enterpriseTriage.questions.entries()) {
    await prisma.diagnosticQuestion.upsert({
      where: {
        templateId_code: {
          templateId: enterpriseTemplate.id,
          code: question.code,
        },
      },
      update: {
        pillar: question.pillar,
        prompt: question.prompt,
        helpText: question.helpText,
        answerType: "SINGLE_SELECT",
        options: question.options,
        weight: question.domain === "OUTCOME" ? 0 : 1,
        order,
        required: true,
      },
      create: {
        templateId: enterpriseTemplate.id,
        pillar: question.pillar,
        code: question.code,
        prompt: question.prompt,
        helpText: question.helpText,
        answerType: "SINGLE_SELECT",
        options: question.options,
        weight: question.domain === "OUTCOME" ? 0 : 1,
        order,
        required: true,
      },
    });
  }

  const diagnosticMethod = STRATEGIC_OPERATIONAL_METHOD;
  const methodLibrary = ROTA30_DIAGNOSTIC_METHOD.methods;
  const template = await prisma.diagnosticTemplate.upsert({
    where: {
      code_version: {
        code: diagnosticMethod.code,
        version: diagnosticMethod.version,
      },
    },
    update: {
      name: diagnosticMethod.name,
      description: diagnosticMethod.objective,
      domain: "OPERATIONS",
      status: "ACTIVE",
      scoringConfig: {
        methodology: "Identificação Estratégica da Empresa",
        themes: diagnosticMethod.themes,
        sources: diagnosticMethod.sources,
        matrixCalculatedByPlatform: true,
        sourceOfTruth: "metodo/identificacao-estrategica-operacional.md",
      },
      publishedAt: new Date(),
    },
    create: {
      code: diagnosticMethod.code,
      name: diagnosticMethod.name,
      description: diagnosticMethod.objective,
      domain: "OPERATIONS",
      version: diagnosticMethod.version,
      status: "ACTIVE",
      scoringConfig: {
        methodology: "Identificação Estratégica da Empresa",
        themes: diagnosticMethod.themes,
        sources: diagnosticMethod.sources,
        matrixCalculatedByPlatform: true,
        sourceOfTruth: "metodo/identificacao-estrategica-operacional.md",
      },
      publishedAt: new Date(),
    },
  });

  await prisma.diagnosticTemplate.updateMany({
    where: {
      domain: "OPERATIONS",
      NOT: { code: diagnosticMethod.code, version: diagnosticMethod.version },
      status: "ACTIVE",
    },
    data: { status: "ARCHIVED" },
  });

  for (const [order, question] of diagnosticMethod.questions.entries()) {
    await prisma.diagnosticQuestion.upsert({
      where: {
        templateId_code: {
          templateId: template.id,
          code: question.code,
        },
      },
      update: {
        pillar: question.pillar,
        prompt: question.prompt,
        helpText: question.helpText,
        answerType: question.answerType,
        options: question.options ?? undefined,
        weight: question.weight,
        order,
        required: question.required,
      },
      create: {
        templateId: template.id,
        pillar: question.pillar,
        code: question.code,
        prompt: question.prompt,
        helpText: question.helpText,
        answerType: question.answerType,
        options: question.options ?? undefined,
        weight: question.weight,
        order,
        required: question.required,
      },
    });
  }

  for (const method of methodLibrary) {
    const savedMethod = await prisma.improvementMethod.upsert({
      where: { code: method.code },
      update: {
        name: method.name,
        description: method.description,
        category: "PRODUCTIVITY",
        status: "ACTIVE",
      },
      create: {
        code: method.code,
        name: method.name,
        description: method.description,
        category: "PRODUCTIVITY",
        status: "ACTIVE",
      },
    });

    await prisma.methodVersion.upsert({
      where: {
        methodId_version: {
          methodId: savedMethod.id,
          version: method.version,
        },
      },
      update: {
        rationale: method.description,
        requiredInputs: {
          indicators: method.indicators,
          minimumEvidence: method.minimumEvidence,
          tradeOffs: method.tradeOffs,
          abandonmentRules: method.abandonmentRules,
        },
        applicabilityRules: method.applicabilityRules,
        contraindications: method.contraindications,
        steps: method.steps,
        successCriteria: method.successCriteria,
        publishedAt: new Date(),
      },
      create: {
        methodId: savedMethod.id,
        version: method.version,
        rationale: method.description,
        requiredInputs: {
          indicators: method.indicators,
          minimumEvidence: method.minimumEvidence,
          tradeOffs: method.tradeOffs,
          abandonmentRules: method.abandonmentRules,
        },
        applicabilityRules: method.applicabilityRules,
        contraindications: method.contraindications,
        steps: method.steps,
        successCriteria: method.successCriteria,
        publishedAt: new Date(),
      },
    });
  }

  const savedDiagnostics = await prisma.diagnosticSession.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: [{ companyId: "asc" }, { createdAt: "asc" }],
    include: {
      bottlenecks: {
        orderBy: { detectedAt: "desc" },
        take: 1,
        select: { category: true },
      },
    },
  });
  const diagnosticSequence = new Map<string, number>();

  for (const diagnostic of savedDiagnostics) {
    const sequence = (diagnosticSequence.get(diagnostic.companyId) ?? 0) + 1;
    diagnosticSequence.set(diagnostic.companyId, sequence);

    if (!diagnostic.title) {
      await prisma.diagnosticSession.update({
        where: { id: diagnostic.id },
        data: {
          title: buildDiagnosticTitle({
            sequence,
            date:
              diagnostic.completedAt ??
              diagnostic.startedAt ??
              diagnostic.createdAt,
            priority: diagnostic.bottlenecks[0]?.category,
            inProgress: diagnostic.status !== "COMPLETED",
          }),
        },
      });
    }
  }

  const activePlan = await prisma.actionPlan.findFirst({
    where: { companyId: DEV_COMPANY_ID, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, _count: { select: { checkins: true } } },
  });
  if (activePlan && activePlan._count.checkins === 0) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);
    await prisma.progressCheckin.create({
      data: {
        companyId: DEV_COMPANY_ID,
        actionPlanId: activePlan.id,
        status: "OPEN",
        metricSnapshot: {
          sequence: 1,
          week: 1,
          dueAt: dueAt.toISOString(),
          type: "EXECUTION",
        },
      },
    });
  }

  console.log(
    JSON.stringify({
      status: "ok",
      companyId: DEV_COMPANY_ID,
      environment: "development",
      diagnosticTemplate: diagnosticMethod.code,
      enterpriseTriage: enterpriseTriage.code,
      questions: diagnosticMethod.questions.length,
      methods: methodLibrary.length,
    }),
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: "error",
        error: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    process.exitCode = 1;
  });
