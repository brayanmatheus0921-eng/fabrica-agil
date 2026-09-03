export type DiagnosticPillarResult = {
  pillar: string;
  score: number | null;
  validCount: number;
  unknownCount: number;
};

type JsonRecord = Record<string, unknown>;

export function asDiagnosticRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function formatDiagnosticDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export function buildDiagnosticTitle({
  sequence,
  date,
  priority,
  inProgress = false,
}: {
  sequence: number;
  date: Date;
  priority?: string | null;
  inProgress?: boolean;
}) {
  const state = inProgress ? "Em andamento" : priority || "Resultado salvo";
  return `Diagnóstico #${sequence} · ${state} · ${formatDiagnosticDate(date)}`;
}

export function getDiagnosticSequence(title: string | null | undefined) {
  const match = title?.match(/^Diagnóstico #(\d+)/);
  return match ? Number(match[1]) : null;
}

export function getNextDiagnosticSequence(
  titles: Array<string | null | undefined>,
) {
  const highestSequence = titles.reduce((highest, title) => {
    const sequence = getDiagnosticSequence(title);
    return sequence === null ? highest : Math.max(highest, sequence);
  }, 0);

  return Math.max(highestSequence, titles.length) + 1;
}

export function parseDiagnosticPillars(
  snapshot: unknown,
): DiagnosticPillarResult[] {
  const items = asDiagnosticRecord(snapshot).pillarResults;

  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    const record = asDiagnosticRecord(item);
    if (typeof record.pillar !== "string") return [];

    return [
      {
        pillar: record.pillar,
        score: typeof record.score === "number" ? record.score : null,
        validCount:
          typeof record.validCount === "number" ? record.validCount : 0,
        unknownCount:
          typeof record.unknownCount === "number" ? record.unknownCount : 0,
      },
    ];
  });
}

export function severityToMaturity(score: number | null) {
  if (score === null) return null;
  return Number(Math.max(1, Math.min(5, 6 - score)).toFixed(1));
}

export function getMaturityLabel(value: number | null) {
  if (value === null) return "Sem dados";
  if (value >= 4) return "Mais estável";
  if (value >= 3) return "Em desenvolvimento";
  return "Precisa de atenção";
}

export function getDiagnosticAnswerLabel(
  value: unknown,
  score: number | null,
  options: unknown,
) {
  if (value === "UNKNOWN") return "Não sei / não medimos";
  if (!Array.isArray(options) || !options.every((item) => typeof item === "string")) {
    return score === null ? "Sem resposta" : `Nível ${score}`;
  }

  if (options.length === 4) {
    const index = score === 1 ? 0 : score === 3 ? 1 : score === 5 ? 2 : -1;
    return index >= 0 ? options[index] : "Não sei / não medimos";
  }

  if (typeof value === "string") {
    const categoricalValues = [
      "OPERATIONS",
      "COMMERCIAL",
      "FINANCE",
      "OWNER_TIME",
      "UNKNOWN",
    ];
    const index = categoricalValues.indexOf(value);
    if (index >= 0) return options[index] ?? value;
  }

  if (score !== null && Number.isInteger(score) && score >= 1) {
    return options[score - 1] ?? `Nível ${score}`;
  }

  return "Sem resposta";
}

export function getDiagnosticFlowHref(templateCode: string) {
  return templateCode === "TRIAGEM-EMPRESARIAL-V1"
    ? "/diagnostico/empresa"
    : "/diagnostico/novo";
}



