import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import {
  buildStrategicThemeResults,
  countMatrixQuadrants,
} from "../src/core/strategic-operational-engine";
import { STRATEGIC_OPERATIONAL_METHOD_CODE } from "../src/core/strategic-operational-method";

loadEnvFile(".env");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const answersByTheme: Record<string, string[]> = {
  "PM3.1": ["YES", "PARTIAL", "YES"],
  "PM3.2": ["PARTIAL", "YES", "NO", "NO", "PARTIAL", "NO", "PARTIAL"],
  "PM3.3": ["YES", "PARTIAL", "YES", "YES", "PARTIAL", "NO", "YES"],
  "PM3.4": ["YES", "NO", "PARTIAL", "NO", "PARTIAL", "NO", "NO", "PARTIAL"],
  "PM3.5": ["YES", "YES", "PARTIAL", "YES", "PARTIAL", "YES", "PARTIAL"],
  "PM3.6": ["PARTIAL", "NO", "NO", "PARTIAL", "PARTIAL", "NO", "YES", "PARTIAL"],
  PM4: ["NO", "NO", "YES", "PARTIAL", "NO", "PARTIAL"],
};
const impactByTheme: Record<string, string> = {
  "PM3.1": "LOCAL_WASTE",
  "PM3.2": "BUSINESS_IMPACT",
  "PM3.3": "BUSINESS_IMPACT",
  "PM3.4": "FLOW_OR_CUSTOMER_IMPACT",
  "PM3.5": "LOCAL_WASTE",
  "PM3.6": "FLOW_OR_CUSTOMER_IMPACT",
  PM4: "BUSINESS_IMPACT",
};
const evidenceByCode: Record<string, string> = {
  "PM3.2.3": "Não existe calendário de preventiva; a manutenção acontece após a quebra.",
  "PM3.2.6": "As paradas não são registradas e o tempo parado não é conhecido.",
  "PM3.3.6": "Os fornecedores são escolhidos por preço, sem avaliação de prazo ou qualidade.",
  "PM3.4.2": "Não existe responsável fixo pelo recebimento e armazenamento.",
  "PM3.4.6": "A produção descobre falta de material somente quando tenta iniciar o pedido.",
  "PM3.4.7": "Não há estoque mínimo definido para ferragens e insumos recorrentes.",
  "PM3.6.2": "As ordens chegam à produção com informações incompletas e prioridades mudam durante o dia.",
  "PM3.6.3": "A capacidade real, as paradas e os tempos não são acompanhados.",
  "PM3.6.6": "O planejamento é feito verbalmente e depende do dono.",
  "PM4.1": "Retrabalho é percebido, mas não é medido por pedido ou setor.",
  "PM4.2": "Não existem estatísticas de defeitos ou causas recorrentes.",
  "PM4.5": "As perdas de espera, movimentação e retrabalho não são analisadas de forma estruturada.",
};

async function main() {
  const template = await prisma.diagnosticTemplate.findFirstOrThrow({
    where: { code: STRATEGIC_OPERATIONAL_METHOD_CODE, status: "ACTIVE" },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const counters = new Map<string, number>();
  const inputs = template.questions.map((question) => {
    const themeCode = question.code === "PM4.IMPACT" || question.code.startsWith("PM4.")
      ? "PM4"
      : question.code.split(".").slice(0, 2).join(".");
    if (question.code.endsWith(".IMPACT")) {
      return { question, value: impactByTheme[themeCode], notes: null as string | null };
    }
    const index = counters.get(themeCode) ?? 0;
    counters.set(themeCode, index + 1);
    return {
      question,
      value: answersByTheme[themeCode][index],
      notes: evidenceByCode[question.code] ?? null,
    };
  });

  const themes = buildStrategicThemeResults(inputs.map(({ question, value, notes }) => ({
    questionCode: question.code,
    prompt: question.prompt,
    pillar: question.pillar,
    value,
    notes,
  })));
  const analysis = {
    priorities: [
      {
        name: "Organizar o planejamento e o fluxo diário da produção",
        area: "Manufatura - Funcional",
        situation: "O planejamento é verbal, as prioridades mudam durante o dia e os tempos reais não são acompanhados.",
        evidenceCodes: ["PM3.6.2", "PM3.6.3", "PM3.6.6"],
        impact: "Pedidos entram em produção sem sequência estável, gerando espera, urgências e atraso de entrega.",
        probableRootCause: "Ausência de uma rotina simples e visível de programação e controle da produção.",
        priorityLevel: "URGENTE",
        improvementObjective: "Criar uma sequência diária confiável e tornar desvios visíveis antes que afetem a entrega.",
        recommendedActions: ["Criar um quadro diário com pedidos, etapa, responsável e prazo.", "Definir uma reunião diária de 10 minutos para confirmar sequência e impedimentos.", "Registrar planejado versus realizado por uma semana."],
        suggestedOwner: "Responsável pela produção",
        suggestedDeadline: "Primeira rotina funcionando em 7 dias",
        trackingIndicator: "Percentual de ordens concluídas na sequência planejada",
        suggestedTarget: "Atingir pelo menos 80% em 30 dias",
      },
      {
        name: "Evitar falta de materiais durante a produção",
        area: "Logística - Armazenamento e Compra",
        situation: "Não há estoque mínimo, comunicação regular com a produção nem avaliação consistente dos fornecedores.",
        evidenceCodes: ["PM3.3.6", "PM3.4.6", "PM3.4.7"],
        impact: "Pedidos podem parar depois de iniciados, ampliando prazo e movimentação desnecessária.",
        probableRootCause: "Compras e estoque trabalham de forma reativa, sem sinal antecipado da necessidade.",
        priorityLevel: "URGENTE",
        improvementObjective: "Garantir os materiais críticos antes de liberar cada pedido para produção.",
        recommendedActions: ["Listar os dez materiais que mais interrompem pedidos.", "Definir estoque mínimo inicial para itens recorrentes.", "Criar uma conferência de materiais antes da liberação do pedido."],
        suggestedOwner: "Compras ou almoxarifado",
        suggestedDeadline: "Lista e conferência em 15 dias",
        trackingIndicator: "Pedidos parados por falta de material",
        suggestedTarget: "Reduzir as paradas em 50% em 60 dias",
      },
      {
        name: "Implantar manutenção preventiva básica",
        area: "Manutenção",
        situation: "A fábrica atua principalmente após a quebra e não conhece o tempo perdido nas paradas.",
        evidenceCodes: ["PM3.2.3", "PM3.2.6"],
        impact: "Quebras inesperadas reduzem capacidade e tornam o prazo de entrega imprevisível.",
        probableRootCause: "Falta de cadastro simples das máquinas, rotina preventiva e registro das ocorrências.",
        priorityLevel: "ALTA",
        improvementObjective: "Reduzir paradas inesperadas das máquinas mais críticas.",
        recommendedActions: ["Identificar as três máquinas mais críticas.", "Criar calendário básico de inspeção e lubrificação.", "Registrar motivo e duração de cada parada."],
        suggestedOwner: "Líder de manutenção ou produção",
        suggestedDeadline: "Controle inicial em 30 dias",
        trackingIndicator: "Horas de parada não planejada",
        suggestedTarget: "Reduzir em 30% em 90 dias",
      },
      {
        name: "Medir e atacar as principais causas de retrabalho",
        area: "Qualidade e Indicadores",
        situation: "O retrabalho é percebido, mas não há estatística por defeito, setor ou causa.",
        evidenceCodes: ["PM4.1", "PM4.2", "PM4.5"],
        impact: "A fábrica consome material e capacidade para corrigir peças, sem saber onde agir primeiro.",
        probableRootCause: "Defeitos são corrigidos individualmente, sem registro comum e análise de recorrência.",
        priorityLevel: "ALTA",
        improvementObjective: "Tornar as causas recorrentes visíveis e eliminar primeiro a de maior impacto.",
        recommendedActions: ["Registrar todo retrabalho por sete dias.", "Agrupar ocorrências por tipo e setor.", "Aplicar Pareto para escolher a primeira causa a tratar."],
        suggestedOwner: "Responsável pela qualidade ou produção",
        suggestedDeadline: "Primeiro Pareto em 15 dias",
        trackingIndicator: "Horas ou valor gasto em retrabalho",
        suggestedTarget: "Reduzir a principal causa em 40% em 60 dias",
      },
    ],
    executiveDiagnosis: {
      strengths: ["A operação possui máquinas e critérios básicos de manufatura.", "Parte dos controles de compras e ferramentaria já é aplicada."],
      weaknesses: ["Planejamento e controle da produção dependem de comunicação verbal.", "Paradas, retrabalho e falta de material não são medidos de forma consistente."],
      risks: ["Continuar aceitando pedidos sem capacidade e material confirmados.", "Aumentar o volume e multiplicar atrasos, urgências e retrabalho."],
      opportunities: ["Criar gestão visual simples sem implantar um sistema complexo.", "Usar os registros iniciais para atacar poucas causas com maior impacto."],
      recommendedPriorities: ["Planejamento e fluxo", "Materiais", "Manutenção preventiva", "Retrabalho"],
    },
    actionPlan: {
      shortTerm: [
        { what: "Implantar quadro diário de produção", why: "Dar uma sequência única para a equipe", leader: "Responsável pela produção", measurement: "Ordens realizadas na sequência planejada" },
        { what: "Conferir materiais antes de liberar pedidos", why: "Evitar começar o que não poderá terminar", leader: "Compras ou almoxarifado", measurement: "Pedidos parados por falta de material" },
        { what: "Registrar paradas e retrabalhos", why: "Trocar percepção por evidência", leader: "Líderes dos setores", measurement: "Horas e causas registradas" },
      ],
      mediumTerm: [
        { what: "Padronizar a programação semanal", why: "Reduzir mudança constante de prioridades", leader: "Produção", measurement: "Aderência ao plano semanal" },
        { what: "Atacar a principal causa do Pareto de retrabalho", why: "Recuperar capacidade e material rapidamente", leader: "Qualidade e produção", measurement: "Recorrência da causa escolhida" },
        { what: "Executar preventiva nas máquinas críticas", why: "Reduzir quebras inesperadas", leader: "Manutenção", measurement: "Horas de parada não planejada" },
      ],
      longTerm: [
        { what: "Revisar capacidade e promessa de prazo", why: "Vender dentro da capacidade real", leader: "Direção, comercial e produção", measurement: "Entregas no prazo e carteira atrasada" },
        { what: "Revisar metas após 90 dias", why: "Manter somente rotinas que geraram resultado", leader: "Direção", measurement: "Evolução das notas e indicadores prioritários" },
      ],
    },
    insufficientData: [],
  };

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.diagnosticSession.create({
      data: {
        companyId: DEV_COMPANY_ID,
        templateId: template.id,
        title: "Diagnóstico 01 — Exemplo operacional · novo ciclo",
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        resultSummary: "Dados fictícios para testar maturidade e construir um plano do zero com o COO. Nenhum plano foi criado ou aprovado.",
        resultSnapshot: {
          methodCode: STRATEGIC_OPERATIONAL_METHOD_CODE,
          methodVersion: template.version,
          themes,
          matrixCounts: countMatrixQuadrants(themes),
          analysisStatus: "COMPLETED",
          analysis,
          demo: true,
        },
      },
    });
    await tx.diagnosticAnswer.createMany({
      data: inputs.map(({ question, value, notes }) => ({
        sessionId: created.id,
        questionId: question.id,
        value,
        notes,
      })),
    });
    return created;
  });
  console.log(session.id);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
