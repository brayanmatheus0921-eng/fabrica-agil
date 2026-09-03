import { z } from "zod";

export const answerTypeSchema = z.enum([
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "SCALE",
]);

export const diagnosticQuestionDefinitionSchema = z.object({
  code: z.string().min(1),
  pillar: z.string().min(1),
  prompt: z.string().min(1),
  helpText: z.string().nullable(),
  answerType: answerTypeSchema,
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  weight: z.number().positive(),
  scoringRule: z.string().min(1),
});

export const bottleneckRuleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  definition: z.string().min(1),
  supportingSignals: z.array(z.string()),
  requiredEvidence: z.array(z.string()),
  contradictingEvidence: z.array(z.string()),
  decisionRule: z.string().min(1),
  minimumConfidence: z.number().min(0).max(1),
  followUpQuestions: z.array(z.string()),
});

export const methodStepSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestedOwner: z.string().min(1),
  dueInDays: z.number().int().nonnegative(),
  expectedOutput: z.string().min(1),
  indicator: z.string().min(1),
  requiredEvidence: z.string().min(1),
});

export const improvementMethodDefinitionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().min(1),
  applicabilityRules: z.array(z.string()),
  contraindications: z.array(z.string()),
  tradeOffs: z.array(z.string()),
  indicators: z.array(z.string()).default([]),
  minimumEvidence: z.array(z.string()).default([]),
  abandonmentRules: z.array(z.string()).default([]),
  steps: z.array(methodStepSchema).min(1),
  successCriteria: z.array(z.string()).min(1),
});

export const diagnosticMethodDefinitionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  objective: z.string().min(1),
  appliesTo: z.array(z.string()).min(1),
  doesNotApplyTo: z.array(z.string()),
  cycleDays: z.number().int().positive().default(30),
  maxActiveTasks: z.number().int().positive().default(3),
  adaptiveQuestions: z
    .array(
      z.object({
        code: z.string().min(1),
        prompt: z.string().min(1),
        helpText: z.string().nullable(),
        options: z.array(z.string()).nullable(),
      }),
    )
    .default([]),
  questions: z.array(diagnosticQuestionDefinitionSchema).min(1),
  bottleneckRules: z.array(bottleneckRuleSchema).min(1),
  abstentionRules: z.array(z.string()).min(1),
  methods: z.array(improvementMethodDefinitionSchema).min(1),
});

export type DiagnosticMethodDefinition = z.infer<
  typeof diagnosticMethodDefinitionSchema
>;

export function parseDiagnosticMethodDefinition(input: unknown) {
  return diagnosticMethodDefinitionSchema.parse(input);
}


