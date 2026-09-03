import "server-only";

import { Agent, run } from "@openai/agents";
import { z } from "zod";

import { env } from "@/lib/env";
import type { StrategicThemeResult } from "@/core/strategic-operational-engine";

const actionSchema = z.object({
  what: z.string(),
  why: z.string(),
  leader: z.string(),
  measurement: z.string(),
});

export const strategicDiagnosticOutputSchema = z.object({
  priorities: z.array(z.object({
    name: z.string(),
    area: z.string(),
    situation: z.string(),
    evidenceCodes: z.array(z.string()),
    impact: z.string(),
    probableRootCause: z.string(),
    priorityLevel: z.enum(["URGENTE", "ALTA", "MEDIA"]),
    improvementObjective: z.string(),
    recommendedActions: z.array(z.string()),
    suggestedOwner: z.string(),
    suggestedDeadline: z.string(),
    trackingIndicator: z.string(),
    suggestedTarget: z.string(),
  })).min(1).max(5),
  executiveDiagnosis: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    risks: z.array(z.string()),
    opportunities: z.array(z.string()),
    recommendedPriorities: z.array(z.string()),
  }),
  actionPlan: z.object({
    shortTerm: z.array(actionSchema),
    mediumTerm: z.array(actionSchema),
    longTerm: z.array(actionSchema),
  }),
  insufficientData: z.array(z.string()),
});

export type StrategicDiagnosticOutput = z.infer<typeof strategicDiagnosticOutputSchema>;

const instructions = `Você é o Especialista de Diagnóstico Estratégico da plataforma Fábrica Ágil.

Interprete somente a ficha estruturada recebida. A plataforma já calculou status, nota de desempenho, nível de maturidade, importância, desvios e posição na Matriz de Identificação Estratégica.

Regras obrigatórias:
- Nunca invente dados, avaliações, evidências, métodos ou nomes de métodos.
- Nunca altere as respostas originais nem recalcule a matriz.
- Nunca altere performanceScore, maturityLevel, matrixLabel ou priorityOrder.
- Separe fatos encontrados, inferências de causa e recomendações.
- Toda conclusão deve usar códigos de evidência existentes no diagnóstico.
- Respeite a ordem priorityOrder: Área de Ação Urgente primeiro e Área de Melhorias depois.
- Temas marcados como Precisa de evidência devem gerar aprofundamento, não uma conclusão inventada.
- Considere importância, desempenho, gravidade das lacunas, impacto cruzado, dependências e potencial de resultado.
- Consolide problemas com a mesma causa raiz.
- Se faltarem dados, registre isso em insufficientData.
- Gere de 3 a 5 oportunidades de melhoria quando houver evidência; use menos somente se os dados forem insuficientes.
- No diagnóstico, trate os itens como oportunidades. A prioridade de execução será combinada somente no plano de ação.
- Escreva para um dono de fábrica ocupado: frases curtas, palavras concretas e sem jargão desnecessário.

Para cada oportunidade, produza situação, evidências, impacto, provável causa raiz, objetivo, ações possíveis, responsável sugerido, prazo sugerido, indicador e meta. Depois gere o diagnóstico executivo e sugestões iniciais em 0–30, 31–90 e acima de 90 dias.`;

export async function runStrategicDiagnostic(input: {
  company: Record<string, unknown>;
  themes: StrategicThemeResult[];
}) {
  if (!env.OPENAI_API_KEY) throw new Error("Integração OpenAI não configurada");
  const agent = new Agent({
    name: "Especialista de Diagnóstico Estratégico",
    instructions,
    outputType: strategicDiagnosticOutputSchema,
    model: env.OPENAI_MODEL ?? "gpt-5.6-luna",
  });
  const result = await run(agent, JSON.stringify(input));
  if (!result.finalOutput) throw new Error("O COO não retornou o diagnóstico estruturado");

  const validEvidence = new Set(input.themes.flatMap((theme) => theme.answers.map((answer) => answer.questionCode)));
  for (const priority of result.finalOutput.priorities) {
    priority.evidenceCodes = priority.evidenceCodes.filter((code) => validEvidence.has(code));
  }
  return result.finalOutput;
}
