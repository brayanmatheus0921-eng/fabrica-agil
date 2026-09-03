import "server-only";

import { prisma } from "@/lib/prisma";
import { companyContextSnapshotSchema } from "@/server/ai/contracts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeDiagnosticDecision(snapshot: unknown) {
  const decision = asRecord(asRecord(snapshot).decision);
  const stringOrNull = (key: string) =>
    typeof decision[key] === "string" ? String(decision[key]) : null;
  const numberOrNull = (key: string) =>
    typeof decision[key] === "number" ? Number(decision[key]) : null;
  const followUpSignals = Array.isArray(decision.followUpSignals)
    ? decision.followUpSignals.flatMap((item) => {
        const record = asRecord(item);
        if (
          typeof record.code !== "string" ||
          typeof record.domain !== "string" ||
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
      })
    : [];

  if (Object.keys(decision).length === 0) return null;

  return {
    selectedDomain: stringOrNull("selectedDomain"),
    selectedPillar: stringOrNull("selectedPillar"),
    secondaryDomain: stringOrNull("secondaryDomain"),
    methodCode: stringOrNull("methodCode"),
    confidence: numberOrNull("confidence"),
    confidenceLabel: stringOrNull("confidenceLabel"),
    evidence: stringOrNull("evidence"),
    specialistStatus: stringOrNull("specialistStatus"),
    followUpSignals,
  };
}

export async function loadCompanyContext(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      sector: true,
      productionType: true,
      teamSize: true,
      onboardingStatus: true,
      onboardingData: true,
      diagnostics: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          originSessionId: true,
          status: true,
          overallScore: true,
          resultSummary: true,
          resultSnapshot: true,
          createdAt: true,
          completedAt: true,
          template: {
            select: {
              code: true,
              domain: true,
              version: true,
            },
          },
        },
      },
      bottlenecks: {
        where: { status: { in: ["ACTIVE", "MONITORING"] } },
        orderBy: { detectedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          impactScore: true,
          urgencyScore: true,
          confidenceScore: true,
          status: true,
        },
      },
      recommendations: {
        where: { status: { in: ["PROPOSED", "ACCEPTED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          rationale: true,
          tradeOffs: true,
          expectedImpact: true,
          methodVersion: {
            select: {
              version: true,
              method: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      actionPlans: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          objective: true,
          baseline: true,
          targetOutcome: true,
          status: true,
          dueAt: true,
          tasks: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              status: true,
              expectedOutput: true,
              dueAt: true,
            },
          },
        },
      },
      evidence: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          label: true,
          textValue: true,
          numericValue: true,
          createdAt: true,
        },
      },
      checkins: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          summary: true,
          observedOutcome: true,
          blockers: true,
          aiEvaluation: true,
          nextPriority: true,
          submittedAt: true,
          metricSnapshot: true,
        },
      },
      memories: {
        where: { invalidatedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          kind: true,
          title: true,
          content: true,
          sourceType: true,
          confidence: true,
          validFrom: true,
        },
      },
      metrics: {
        orderBy: { name: "asc" },
        select: {
          code: true,
          name: true,
          unit: true,
          direction: true,
          measurements: {
            orderBy: { measuredAt: "desc" },
            take: 1,
            select: {
              value: true,
              measuredAt: true,
              source: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    throw new Error("Empresa não encontrada");
  }

  const diagnostic =
    company.diagnostics.find((item) => item.status === "COMPLETED") ??
    company.diagnostics[0] ??
    null;
  const activePlan = company.actionPlans[0] ?? null;
  const onboardingData =
    company.onboardingData &&
    typeof company.onboardingData === "object" &&
    !Array.isArray(company.onboardingData)
      ? (company.onboardingData as Record<string, unknown>)
      : {};
  const profileText = (key: string) =>
    typeof onboardingData[key] === "string"
      ? String(onboardingData[key])
      : null;
  const productionStages = Array.isArray(onboardingData.productionStages)
    ? onboardingData.productionStages.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  return companyContextSnapshotSchema.parse({
    company: {
      id: company.id,
      name: company.name,
      sector: company.sector,
      productionType: company.productionType,
      teamSize: company.teamSize,
      onboardingStatus: company.onboardingStatus,
      monthlyRevenueRange: profileText("monthlyRevenueRange"),
      monthlyOrderVolume: profileText("monthlyOrderVolume"),
      onTimeDeliveryRange: profileText("onTimeDeliveryRange"),
      reworkRange: profileText("reworkRange"),
      ownerDependency: profileText("ownerDependency"),
      mainGoal: profileText("mainGoal"),
      biggestChallenge: profileText("biggestChallenge"),
      productionStages,
    },
    diagnostic: diagnostic
      ? {
          id: diagnostic.id,
          title: diagnostic.title,
          domain: diagnostic.template.domain,
          originSessionId: diagnostic.originSessionId,
          status: diagnostic.status,
          overallScore:
            diagnostic.overallScore === null
              ? null
              : Number(diagnostic.overallScore),
          summary: diagnostic.resultSummary,
          decision: normalizeDiagnosticDecision(diagnostic.resultSnapshot),
          completedAt: diagnostic.completedAt?.toISOString() ?? null,
        }
      : null,
    diagnosticHistory: company.diagnostics.map((item) => ({
      id: item.id,
      title: item.title,
      domain: item.template.domain,
      originSessionId: item.originSessionId,
      status: item.status,
      templateCode: item.template.code,
      templateVersion: item.template.version,
      summary: item.resultSummary,
      decision: normalizeDiagnosticDecision(item.resultSnapshot),
      createdAt: item.createdAt.toISOString(),
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
    bottlenecks: company.bottlenecks.map((bottleneck) => ({
      ...bottleneck,
      confidenceScore:
        bottleneck.confidenceScore === null
          ? null
          : Number(bottleneck.confidenceScore),
    })),
    recommendations: company.recommendations.map((recommendation) => ({
      id: recommendation.id,
      status: recommendation.status,
      rationale: recommendation.rationale,
      methodCode: recommendation.methodVersion.method.code,
      methodName: recommendation.methodVersion.method.name,
      methodVersion: recommendation.methodVersion.version,
      tradeOffs: recommendation.tradeOffs,
      expectedImpact: recommendation.expectedImpact,
    })),
    activePlan: activePlan
      ? {
          ...activePlan,
          dueAt: activePlan.dueAt?.toISOString() ?? null,
          tasks: activePlan.tasks.map((task) => ({
            ...task,
            dueAt: task.dueAt?.toISOString() ?? null,
          })),
        }
      : null,
    recentEvidence: company.evidence.map((evidence) => ({
      ...evidence,
      numericValue:
        evidence.numericValue === null ? null : Number(evidence.numericValue),
      createdAt: evidence.createdAt.toISOString(),
    })),
    checkins: company.checkins.map((checkin) => ({
      ...checkin,
      submittedAt: checkin.submittedAt?.toISOString() ?? null,
    })),
    memories: company.memories.map((memory) => ({
      ...memory,
      confidence: Number(memory.confidence),
      validFrom: memory.validFrom.toISOString(),
    })),
    metrics: company.metrics.map((metric) => {
      const latestMeasurement = metric.measurements[0] ?? null;

      return {
        code: metric.code,
        name: metric.name,
        unit: metric.unit,
        direction: metric.direction,
        latestMeasurement: latestMeasurement
          ? {
              value: Number(latestMeasurement.value),
              measuredAt: latestMeasurement.measuredAt.toISOString(),
              source: latestMeasurement.source,
            }
          : null,
      };
    }),
  });
}


