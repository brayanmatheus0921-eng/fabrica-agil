import assert from "node:assert/strict";
import test from "node:test";

import {
  consultantResponseSchema,
  type ConsultantResponse,
} from "@/server/ai/contracts";

const abstentionResponse: ConsultantResponse = {
  facts: [],
  inferences: [],
  options: [],
  recommendation: {
    summary: "Coletar dados antes de recomendar um método",
    rationale: "Não há evidência suficiente",
    methodCode: null,
    nextActions: ["Executar o diagnóstico"],
  },
  abstained: true,
  missingEvidence: ["Respostas do diagnóstico"],
};

test("aceita uma resposta que se abstém sem inventar diagnóstico", () => {
  const parsed = consultantResponseSchema.parse(abstentionResponse);

  assert.equal(parsed.abstained, true);
  assert.equal(parsed.recommendation.methodCode, null);
});

test("rejeita inferência com confiança acima de 1", () => {
  assert.throws(() =>
    consultantResponseSchema.parse({
      ...abstentionResponse,
      inferences: [
        {
          statement: "Hipótese sem escala válida",
          rationale: "Teste",
          confidence: 1.2,
        },
      ],
    }),
  );
});


