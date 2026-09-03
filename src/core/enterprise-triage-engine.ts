import {
  ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS,
  ENTERPRISE_DOMAINS,
  type EnterpriseTriageAdaptiveQuestion,
  type EnterpriseDomain,
} from "@/core/enterprise-triage-method";

export type EnterpriseTriageAnswer = {
  domain: EnterpriseDomain;
  score: number | null;
};

export type EnterpriseDomainResult = {
  domain: EnterpriseDomain;
  severity: number | null;
  routingScore: number | null;
  validCount: number;
  unknownCount: number;
};

export type EnterpriseTriggerAnswer = {
  questionCode: string;
  score: number | null;
};

const OUTCOME_SIGNAL: Partial<Record<string, EnterpriseDomain>> = {
  OPERATIONS: "OPERATIONS",
  COMMERCIAL: "COMMERCIAL",
  FINANCE: "FINANCE",
};

export function calculateEnterpriseDomains(
  answers: EnterpriseTriageAnswer[],
  desiredOutcome?: string | null,
) {
  const desiredDomain = desiredOutcome
    ? OUTCOME_SIGNAL[desiredOutcome]
    : undefined;

  return ENTERPRISE_DOMAINS.map((domain) => {
    const values = answers
      .filter((answer) => answer.domain === domain)
      .map((answer) => answer.score);
    const valid = values.filter((value): value is number => value !== null);
    const severity =
      valid.length === 0
        ? null
        : Number(
            (
              valid.reduce((total, value) => total + value, 0) / valid.length
            ).toFixed(2),
          );
    const routingScore =
      severity === null
        ? null
        : Number((severity + (desiredDomain === domain ? 0.25 : 0)).toFixed(2));

    return {
      domain,
      severity,
      routingScore,
      validCount: valid.length,
      unknownCount: values.length - valid.length,
    } satisfies EnterpriseDomainResult;
  }).sort(
    (left, right) => (right.routingScore ?? -1) - (left.routingScore ?? -1),
  );
}

export function getEnterpriseTriageCandidates(
  results: EnterpriseDomainResult[],
  threshold = 0.5,
) {
  const [first, second] = results;
  if (!first || first.routingScore === null) return [];
  if (!second || second.routingScore === null) return [first.domain];

  return first.routingScore - second.routingScore <= threshold
    ? [first.domain, second.domain]
    : [first.domain];
}

export function getTriggeredEnterpriseFollowUps(
  answers: EnterpriseTriggerAnswer[],
): EnterpriseTriageAdaptiveQuestion[] {
  const answerByCode = new Map(
    answers.map((answer) => [answer.questionCode, answer.score]),
  );

  return ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS.filter((question) => {
    const score = answerByCode.get(question.triggerQuestionCode);
    return (
      typeof score === "number" && question.triggerScores.includes(score)
    );
  });
}

export function calculateEnterpriseTriageConfidence({
  validCount,
  totalScoredQuestions,
  evidence,
  tieBroken,
}: {
  validCount: number;
  totalScoredQuestions: number;
  evidence: string;
  tieBroken: boolean;
}) {
  const normalized = evidence.trim().toLocaleLowerCase("pt-BR");
  const coverage =
    totalScoredQuestions === 0 ? 0 : validCount / totalScoredQuestions;
  let confidence = coverage * 0.6;

  if (normalized.length >= 10) confidence += 0.1;
  if (normalized.length >= 30) confidence += 0.05;
  if (/\d|pedido|orçamento|venda|cliente|caixa|margem|atras|semana|m[eê]s/.test(normalized)) {
    confidence += 0.15;
  }
  if (/ontem|hoje|semana|m[eê]s|[uú]ltim|vez|frequ|dia/.test(normalized)) {
    confidence += 0.1;
  }
  if (!tieBroken) confidence -= 0.05;

  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

export function classifyEnterpriseConfidence(value: number) {
  if (value >= 0.75) return "ALTA" as const;
  if (value >= 0.5) return "MEDIA" as const;
  return "BAIXA" as const;
}


