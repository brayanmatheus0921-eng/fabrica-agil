import { loadEnvFile } from "node:process";

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const { Agent, run } = await import("@openai/agents");
  const { consultantResponseSchema } = await import(
    "../src/server/ai/contracts"
  );
  const {
    buildConsultantPrompt,
    INDUSTRIAL_CONSULTANT_INSTRUCTIONS,
  } = await import("../src/server/ai/prompt");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const agent = new Agent({
    name: "Smoke test Fábrica Ágil",
    instructions: INDUSTRIAL_CONSULTANT_INSTRUCTIONS,
    outputType: consultantResponseSchema,
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
  });

  const result = await run(
    agent,
    buildConsultantPrompt({
      message: "Qual método devo aplicar agora?",
      context: {
        company: {
          id: "smoke-company",
          name: "Fábrica de teste",
          sector: "Móveis",
          productionType: null,
          teamSize: null,
          onboardingStatus: "NOT_STARTED",
          monthlyRevenueRange: null,
          monthlyOrderVolume: null,
          onTimeDeliveryRange: null,
          reworkRange: null,
          ownerDependency: null,
          mainGoal: null,
          biggestChallenge: null,
          productionStages: [],
        },
        diagnostic: null,
        diagnosticHistory: [],
        bottlenecks: [],
        recommendations: [],
        activePlan: null,
        recentEvidence: [],
        checkins: [],
        memories: [],
        metrics: [],
      },
    }),
  );

  if (!result.finalOutput) {
    throw new Error("Smoke test sem saída estruturada");
  }

  console.log(
    JSON.stringify({
      status: "ok",
      abstained: result.finalOutput.abstained,
      methodCode: result.finalOutput.recommendation.methodCode,
      missingEvidenceCount: result.finalOutput.missingEvidence.length,
    }),
  );
}

main().catch((error: unknown) => {
  const details =
    error instanceof Error
      ? { name: error.name }
      : { name: "UnknownError" };

  console.error(JSON.stringify({ status: "error", ...details }));
  process.exitCode = 1;
});
