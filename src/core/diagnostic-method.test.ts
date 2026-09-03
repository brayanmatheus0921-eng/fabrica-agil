import assert from "node:assert/strict";
import test from "node:test";

import { parseDiagnosticMethodDefinition } from "@/core/diagnostic-method";

const validMethod = {
  code: "MOVEIS-V1",
  name: "Diagnóstico inicial",
  version: 1,
  objective: "Identificar o gargalo prioritário",
  appliesTo: ["Fábricas de móveis"],
  doesNotApplyTo: [],
  questions: [
    {
      code: "FLUXO-001",
      pillar: "Fluxo",
      prompt: "Existe fila entre operações?",
      helpText: null,
      answerType: "BOOLEAN",
      options: null,
      required: true,
      weight: 1,
      scoringRule: "Sim aumenta o sinal de restrição",
    },
  ],
  bottleneckRules: [
    {
      code: "RESTRICAO-FLUXO",
      name: "Restrição de fluxo",
      definition: "Acúmulo recorrente antes de uma operação",
      supportingSignals: ["Fila recorrente"],
      requiredEvidence: ["Observação da fila"],
      contradictingEvidence: ["Capacidade ociosa em toda a linha"],
      decisionRule: "Concluir apenas com evidência mínima",
      minimumConfidence: 0.8,
      followUpQuestions: ["Em quais dias a fila aparece?"],
    },
  ],
  abstentionRules: ["Não concluir sem evidência mínima"],
  methods: [
    {
      code: "TOC",
      name: "Teoria das Restrições",
      version: 1,
      description: "Explorar e elevar a restrição prioritária",
      applicabilityRules: ["Restrição confirmada"],
      contraindications: [],
      tradeOffs: ["Exige foco em uma restrição por vez"],
      steps: [
        {
          order: 1,
          title: "Confirmar a restrição",
          description: "Medir a fila por cinco dias",
          suggestedOwner: "Gestor de produção",
          dueInDays: 5,
          expectedOutput: "Registro diário da fila",
          indicator: "Tempo médio de espera",
          requiredEvidence: "Planilha preenchida",
        },
      ],
      successCriteria: ["Redução do tempo médio de espera"],
    },
  ],
} as const;

test("aceita um método completo e versionado", () => {
  const parsed = parseDiagnosticMethodDefinition(validMethod);

  assert.equal(parsed.code, "MOVEIS-V1");
  assert.equal(parsed.methods[0].steps[0].order, 1);
});

test("rejeita confiança fora da faixa de 0 a 1", () => {
  const invalidMethod = {
    ...validMethod,
    bottleneckRules: [
      {
        ...validMethod.bottleneckRules[0],
        minimumConfidence: 1.4,
      },
    ],
  };

  assert.throws(() => parseDiagnosticMethodDefinition(invalidMethod));
});


