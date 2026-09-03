export type Rota30Answer = {
  pillar: string;
  score: number | null;
};

export type Rota30PillarResult = {
  pillar: string;
  score: number | null;
  validCount: number;
  unknownCount: number;
};

export type Rota30ConfidenceInput = {
  validCount: number;
  evidence: string;
  coherentWithContext?: boolean;
  contradiction?: boolean;
};

export function calculateRota30Pillars(
  answers: Rota30Answer[],
): Rota30PillarResult[] {
  const grouped = new Map<string, Array<number | null>>();

  for (const answer of answers) {
    const values = grouped.get(answer.pillar) ?? [];
    values.push(answer.score);
    grouped.set(answer.pillar, values);
  }

  return [...grouped.entries()]
    .map(([pillar, values]) => {
      const valid = values.filter((value): value is number => value !== null);
      return {
        pillar,
        score:
          valid.length === 0
            ? null
            : valid.reduce((sum, value) => sum + value, 0) / valid.length,
        validCount: valid.length,
        unknownCount: values.length - valid.length,
      };
    })
    .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
}

export function calculateRota30Priority(severity: number, impact: number) {
  return Math.max(1, Math.min(5, severity)) * Math.max(1, Math.min(3, impact));
}

export function calculateRota30Confidence({
  validCount,
  evidence,
  coherentWithContext = true,
  contradiction = false,
}: Rota30ConfidenceInput) {
  const normalized = evidence.trim().toLocaleLowerCase("pt-BR");
  let confidence = 0;

  if (validCount >= 4) confidence += 0.2;
  else if (validCount === 3) confidence += 0.1;
  if (normalized.length >= 20) confidence += 0.25;
  if (/\d|foto|planilha|registro|pedido|ordem|nota|relat[oó]rio/.test(normalized)) {
    confidence += 0.3;
  }
  if (/dia|semana|m[eê]s|vez|frequ|sempre|ontem|hoje|[uú]ltim/.test(normalized)) {
    confidence += 0.15;
  }
  if (coherentWithContext) confidence += 0.1;
  if (contradiction) confidence -= 0.25;

  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

export function classifyRota30Confidence(confidence: number) {
  if (confidence >= 0.75) return "ALTA" as const;
  if (confidence >= 0.5) return "MEDIA" as const;
  return "BAIXA" as const;
}

export function shouldRota30Abstain(input: {
  validCount: number;
  evidence: string;
  confidence: number;
}) {
  return (
    input.validCount < 3 ||
    input.evidence.trim().length < 10 ||
    input.confidence < 0.5
  );
}


