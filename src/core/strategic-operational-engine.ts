import {
  STRATEGIC_OPERATIONAL_THEMES,
  type StrategicAnswer,
  type StrategicImpact,
  type StrategicImportance,
  type StrategicMatrixQuadrant,
  type StrategicPerformance,
  type ThemeStatus,
} from "@/core/strategic-operational-method";

export type StrategicAnswerInput = { questionCode: string; prompt: string; pillar: string; value: unknown; notes: string | null };
export type StrategicThemeResult = {
  themeCode: string; area: string; theme: string; description: string;
  status: ThemeStatus; importance: StrategicImportance | null; performance: StrategicPerformance;
  performanceScore: number; maturityLevel: number; impact: StrategicImpact;
  quadrant: StrategicMatrixQuadrant | null; matrixLabel: string; yesCount: number; partialCount: number; noCount: number;
  controlCoveragePercent: number; gapWeight: number; rank: number; priorityOrder: number | null;
  scoreReason: string; deviations: Array<{ questionCode: string; prompt: string; response: "NO" | "PARTIAL"; observation: string | null }>;
  answers: Array<{ questionCode: string; prompt: string; response: StrategicAnswer; observation: string | null }>;
};

const validAnswers = new Set<StrategicAnswer>(["YES", "NO", "PARTIAL"]);
const validImpacts = new Set<StrategicImpact>(["NO_RELEVANT_IMPACT", "LOCAL_WASTE", "BUSINESS_IMPACT", "FLOW_OR_CUSTOMER_IMPACT", "UNKNOWN"]);
const quadrantWeight: Record<StrategicMatrixQuadrant, number> = { URGENT_ACTION: 500, IMPROVEMENTS: 400, EFFICACY: 200, EXCESS: 100, INDIFFERENCE: 0 };
export const MATRIX_LABELS: Record<StrategicMatrixQuadrant, string> = { URGENT_ACTION: "Área de Ação Urgente", IMPROVEMENTS: "Área de Melhorias", EFFICACY: "Área de Eficácia", EXCESS: "Área de Excesso", INDIFFERENCE: "Área de Indiferença" };

export function classifyStrategicMatrix(importance: StrategicImportance, performance: StrategicPerformance): StrategicMatrixQuadrant {
  if (importance === "VERY_IMPORTANT" && performance === "BAD") return "URGENT_ACTION";
  if (importance === "VERY_IMPORTANT" && performance === "VERY_GOOD") return "EFFICACY";
  if (importance === "LITTLE_IMPORTANT" && performance === "BAD") return "INDIFFERENCE";
  if (importance === "LITTLE_IMPORTANT" && performance === "VERY_GOOD") return "EXCESS";
  return "IMPROVEMENTS";
}
export function calculatePerformanceScore(answers: StrategicAnswer[]) {
  if (!answers.length) return 0;
  const total = answers.reduce((sum, answer) => sum + (answer === "YES" ? 100 : answer === "PARTIAL" ? 50 : 0), 0);
  return Math.round((total / answers.length) * 10) / 10;
}
export function classifyPerformance(score: number): StrategicPerformance { return score >= 80 ? "VERY_GOOD" : score >= 50 ? "GOOD" : "BAD"; }
export function calculateThemeStatus(answers: StrategicAnswer[]): ThemeStatus {
  const present = answers.filter((answer) => answer === "YES" || answer === "PARTIAL").length;
  const yes = answers.filter((answer) => answer === "YES").length;
  return answers.length > 0 && present / answers.length >= 0.6 && yes > 0 ? "EXISTS" : "NOT_EXISTS";
}
export function impactToImportance(impact: StrategicImpact): StrategicImportance | null {
  if (impact === "NO_RELEVANT_IMPACT") return "LITTLE_IMPORTANT";
  if (impact === "LOCAL_WASTE") return "IMPORTANT";
  if (impact === "BUSINESS_IMPACT" || impact === "FLOW_OR_CUSTOMER_IMPACT") return "VERY_IMPORTANT";
  return null;
}
function getMaturityLevel(score: number) { return score >= 80 ? 5 : score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : 1; }

export function buildStrategicThemeResults(inputs: StrategicAnswerInput[]): StrategicThemeResult[] {
  const results = STRATEGIC_OPERATIONAL_THEMES.map((theme) => {
    const themeInputs = inputs.filter((input) => input.questionCode.startsWith(`${theme.code}.`));
    const impactInput = themeInputs.find((input) => input.questionCode.endsWith(".IMPACT"));
    if (typeof impactInput?.value !== "string" || !validImpacts.has(impactInput.value as StrategicImpact)) throw new Error(`Impacto ausente para ${theme.code}`);
    const impact = impactInput.value as StrategicImpact;
    const answers = themeInputs.flatMap((input) => input.questionCode.endsWith(".IMPACT") || typeof input.value !== "string" || !validAnswers.has(input.value as StrategicAnswer) ? [] : [{ questionCode: input.questionCode, prompt: input.prompt, response: input.value as StrategicAnswer, observation: input.notes }]);
    const values = answers.map((answer) => answer.response);
    const yesCount = values.filter((value) => value === "YES").length;
    const partialCount = values.filter((value) => value === "PARTIAL").length;
    const noCount = values.filter((value) => value === "NO").length;
    const performanceScore = calculatePerformanceScore(values);
    const performance = classifyPerformance(performanceScore);
    const status = calculateThemeStatus(values);
    const importance = impactToImportance(impact);
    const quadrant = importance ? classifyStrategicMatrix(importance, performance) : null;
    const controlCoveragePercent = Math.round(((yesCount + partialCount) / Math.max(values.length, 1)) * 100);
    const gapWeight = noCount * 2 + partialCount;
    const deviations = answers.flatMap((answer) => answer.response === "NO" || answer.response === "PARTIAL" ? [{ ...answer, response: answer.response }] : []);
    const rank = quadrant ? quadrantWeight[quadrant] + (100 - performanceScore) + (status === "NOT_EXISTS" ? 15 : 0) + noCount * 2 + partialCount : -1;
    return { themeCode: theme.code, area: theme.area, theme: theme.name, description: theme.description, status, importance, performance, performanceScore, maturityLevel: getMaturityLevel(performanceScore), impact, quadrant, matrixLabel: quadrant ? MATRIX_LABELS[quadrant] : "Precisa de evidência", yesCount, partialCount, noCount, controlCoveragePercent, gapWeight, rank, priorityOrder: null, scoreReason: `${yesCount} de ${values.length} controles funcionam, ${partialCount} funcionam parcialmente e ${noCount} não existem ou não são aplicados.`, deviations, answers } satisfies StrategicThemeResult;
  }).sort((left, right) => right.rank - left.rank);
  let priorityOrder = 0;
  return results.map((result) => ({ ...result, priorityOrder: result.quadrant && ["URGENT_ACTION", "IMPROVEMENTS"].includes(result.quadrant) ? ++priorityOrder : null }));
}

export function countMatrixQuadrants(results: StrategicThemeResult[]) {
  return results.reduce<Record<StrategicMatrixQuadrant | "NEEDS_EVIDENCE", number>>((counts, result) => { counts[result.quadrant ?? "NEEDS_EVIDENCE"] += 1; return counts; }, { URGENT_ACTION: 0, IMPROVEMENTS: 0, EFFICACY: 0, EXCESS: 0, INDIFFERENCE: 0, NEEDS_EVIDENCE: 0 });
}
