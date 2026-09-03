import "server-only";

import { Agent, run } from "@openai/agents";

import { env } from "@/lib/env";
import {
  consultantInputSchema,
  consultantResponseSchema,
  type ConsultantInput,
} from "@/server/ai/contracts";
import {
  buildConsultantPrompt,
  INDUSTRIAL_CONSULTANT_INSTRUCTIONS,
} from "@/server/ai/prompt";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

export function createIndustrialConsultantAgent() {
  return new Agent({
    name: "Consultor industrial Fábrica ágil",
    instructions: INDUSTRIAL_CONSULTANT_INSTRUCTIONS,
    outputType: consultantResponseSchema,
    model: env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
  });
}

export async function runIndustrialConsultant(input: ConsultantInput) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Integração OpenAI não configurada");
  }

  const validatedInput = consultantInputSchema.parse(input);
  const result = await run(
    createIndustrialConsultantAgent(),
    buildConsultantPrompt(validatedInput),
  );

  if (!result.finalOutput) {
    throw new Error("O consultor não retornou uma saída estruturada");
  }

  return result.finalOutput;
}



