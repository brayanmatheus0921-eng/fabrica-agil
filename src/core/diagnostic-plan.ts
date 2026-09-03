import { z } from "zod";

export const diagnosticPlanSchema = z.object({
  objective: z.string().min(1),
  priorities: z.array(z.object({
    title: z.string().min(1),
    area: z.string().min(1),
    themeCodes: z.array(z.string()),
    evidenceCodes: z.array(z.string()).min(1),
    facts: z.string().min(1),
    inference: z.string().min(1),
    rationale: z.string().min(1),
    methodCode: z.string().nullable(),
    suggestedOwner: z.string().min(1),
    indicator: z.string().min(1),
    suggestedTarget: z.string().min(1),
    actions: z.array(z.object({
      title: z.string().min(1),
      what: z.string().min(1),
      why: z.string().min(1),
      expectedOutput: z.string().min(1),
      dueInDays: z.number().int().min(1).max(365),
    })).min(1).max(3),
  })).length(3),
  missingEvidence: z.array(z.string()),
});

export type DiagnosticPlan = z.infer<typeof diagnosticPlanSchema>;
export const diagnosticPlanId = (sessionId: string) => `diagnostic-plan-${sessionId}`;

export type RankedPlanTheme = { themeCode: string; priorityOrder: number | null; quadrant: string | null; evidenceCodes: string[] };

export function validateDiagnosticPlan(value: unknown, evidenceCodes: string[], methodCodes: string[], themes: RankedPlanTheme[] = []) {
  const plan = diagnosticPlanSchema.parse(value);
  const evidence = new Set(evidenceCodes);
  const methods = new Set(methodCodes);
  if (new Set(plan.priorities.map((priority) => priority.title.trim().toLowerCase())).size !== 3) {
    throw new Error("O COO repetiu uma prioridade. Tente gerar novamente.");
  }
  for (const priority of plan.priorities) {
    if (priority.evidenceCodes.some((code) => !evidence.has(code))) throw new Error("O COO citou evidências fora deste diagnóstico. Tente novamente.");
    if (priority.methodCode && !methods.has(priority.methodCode)) throw new Error("O COO citou um método fora da biblioteca. Tente novamente.");
    if (themes.length) {
      if (!priority.themeCodes.length || priority.themeCodes.some((code) => !themes.some((theme) => theme.themeCode === code))) throw new Error("O COO citou uma área fora da matriz.");
      for (const code of priority.themeCodes) {
        const theme = themes.find((item) => item.themeCode === code)!;
        if (!priority.evidenceCodes.some((evidence) => theme.evidenceCodes.includes(evidence))) throw new Error("Área sem evidência vinculada.");
      }
    }
  }
  if (themes.length) {
    const selected = new Set(plan.priorities.flatMap((priority) => priority.themeCodes));
    const ranked = themes.filter((theme) => theme.priorityOrder !== null).sort((a, b) => a.priorityOrder! - b.priorityOrder!);
    if (ranked[0] && !selected.has(ranked[0].themeCode)) throw new Error("O plano ignorou a primeira prioridade da matriz.");
    const missingUrgent = themes.some((theme) => theme.quadrant === "URGENT_ACTION" && !selected.has(theme.themeCode));
    const includesImprovement = themes.some((theme) => theme.quadrant === "IMPROVEMENTS" && selected.has(theme.themeCode));
    if (missingUrgent && includesImprovement) throw new Error("O plano pulou uma área urgente para tratar uma melhoria.");
    const order = (codes: string[]) => Math.min(...themes.filter((theme) => codes.includes(theme.themeCode)).map((theme) => theme.priorityOrder ?? 999));
    plan.priorities.sort((a, b) => order(a.themeCodes) - order(b.themeCodes));
  }
  return plan;
}
