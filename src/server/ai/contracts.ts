import { z } from "zod";

const factSchema = z.object({
  statement: z.string().min(1),
  evidenceIds: z.array(z.string()),
});

const inferenceSchema = z.object({
  statement: z.string().min(1),
  rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const optionSchema = z.object({
  label: z.string().min(1),
  tradeOffs: z.array(z.string()),
  opportunityCost: z.string().min(1),
  shortTermImpact: z.string().min(1),
  longTermImpact: z.string().min(1),
});

const diagnosticDecisionSchema = z
  .object({
    selectedDomain: z.string().nullable(),
    selectedPillar: z.string().nullable(),
    secondaryDomain: z.string().nullable(),
    methodCode: z.string().nullable(),
    confidence: z.number().nullable(),
    confidenceLabel: z.string().nullable(),
    evidence: z.string().nullable(),
    specialistStatus: z.string().nullable(),
    followUpSignals: z.array(
      z.object({
        code: z.string(),
        domain: z.string(),
        prompt: z.string(),
        value: z.string(),
        label: z.string(),
      }),
    ),
  })
  .nullable();

export const consultantResponseSchema = z.object({
  facts: z.array(factSchema),
  inferences: z.array(inferenceSchema),
  options: z.array(optionSchema),
  recommendation: z.object({
    summary: z.string().min(1),
    rationale: z.string().min(1),
    methodCode: z.string().nullable(),
    nextActions: z.array(z.string()),
  }),
  abstained: z.boolean(),
  missingEvidence: z.array(z.string()),
});

export const companyContextSnapshotSchema = z.object({
  company: z.object({
    id: z.string(),
    name: z.string(),
    sector: z.string().nullable(),
      productionType: z.string().nullable(),
      teamSize: z.number().int().nullable(),
      onboardingStatus: z.string(),
      monthlyRevenueRange: z.string().nullable(),
      monthlyOrderVolume: z.string().nullable(),
      onTimeDeliveryRange: z.string().nullable(),
      reworkRange: z.string().nullable(),
      ownerDependency: z.string().nullable(),
      mainGoal: z.string().nullable(),
      biggestChallenge: z.string().nullable(),
      productionStages: z.array(z.string()),
  }),
  diagnostic: z
    .object({
      id: z.string(),
      title: z.string().nullable(),
      domain: z.string(),
      originSessionId: z.string().nullable(),
      status: z.string(),
      overallScore: z.number().nullable(),
      summary: z.string().nullable(),
      decision: diagnosticDecisionSchema,
      completedAt: z.string().nullable(),
    })
    .nullable(),
  diagnosticHistory: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      domain: z.string(),
      originSessionId: z.string().nullable(),
      status: z.string(),
      templateCode: z.string(),
      templateVersion: z.number().int(),
      summary: z.string().nullable(),
      decision: diagnosticDecisionSchema,
      createdAt: z.string(),
      completedAt: z.string().nullable(),
    }),
  ),
  bottlenecks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      description: z.string(),
      impactScore: z.number().int().nullable(),
      urgencyScore: z.number().int().nullable(),
      confidenceScore: z.number().nullable(),
      status: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      rationale: z.string(),
      methodCode: z.string(),
      methodName: z.string(),
      methodVersion: z.number().int(),
      tradeOffs: z.unknown(),
      expectedImpact: z.unknown(),
    }),
  ),
  activePlan: z
    .object({
      id: z.string(),
      title: z.string(),
      objective: z.string(),
      baseline: z.unknown().optional(),
      targetOutcome: z.unknown().optional(),
      status: z.string(),
      dueAt: z.string().nullable(),
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          status: z.string(),
          expectedOutput: z.string().nullable(),
          dueAt: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
  recentEvidence: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      textValue: z.string().nullable(),
      numericValue: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
  checkins: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      summary: z.string().nullable(),
      observedOutcome: z.string().nullable(),
      blockers: z.string().nullable(),
      aiEvaluation: z.string().nullable(),
      nextPriority: z.string().nullable(),
      submittedAt: z.string().nullable(),
      metricSnapshot: z.unknown(),
    }),
  ),
  memories: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      title: z.string(),
      content: z.string(),
      sourceType: z.string(),
      confidence: z.number(),
      validFrom: z.string(),
    }),
  ),
  metrics: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      unit: z.string(),
      direction: z.string(),
      latestMeasurement: z
        .object({
          value: z.number(),
          measuredAt: z.string(),
          source: z.string(),
        })
        .nullable(),
    }),
  ),
});

export const consultantInputSchema = z.object({
  message: z.string().min(1).max(8_000),
  context: companyContextSnapshotSchema,
});

export type CompanyContextSnapshot = z.infer<
  typeof companyContextSnapshotSchema
>;
export type ConsultantInput = z.infer<typeof consultantInputSchema>;
export type ConsultantResponse = z.infer<typeof consultantResponseSchema>;


