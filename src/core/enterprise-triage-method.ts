export const ENTERPRISE_TRIAGE_CODE = "TRIAGEM-EMPRESARIAL-V1";
export const ENTERPRISE_TRIAGE_VERSION = 1;

export const ENTERPRISE_DOMAINS = [
  "OPERATIONS",
  "COMMERCIAL",
  "FINANCE",
] as const;

export type EnterpriseDomain = (typeof ENTERPRISE_DOMAINS)[number];

export const ENTERPRISE_DOMAIN_LABELS: Record<EnterpriseDomain, string> = {
  OPERATIONS: "Operacional",
  COMMERCIAL: "Comercial",
  FINANCE: "Financeiro",
};

export const ENTERPRISE_DOMAIN_DESCRIPTIONS: Record<EnterpriseDomain, string> = {
  OPERATIONS:
    "Prazo, produtividade, capacidade, retrabalho, materiais e rotina da fábrica.",
  COMMERCIAL:
    "Demanda, orçamentos, conversão, qualidade das vendas, mix e promessas ao cliente.",
  FINANCE:
    "Margem, formação de preço, caixa, custos, estoque e capital de giro.",
};

export type EnterpriseTriageQuestion = {
  code: string;
  pillar: string;
  domain: EnterpriseDomain | "OUTCOME";
  prompt: string;
  helpText: string;
  options: string[];
};

export type EnterpriseTriageAdaptiveQuestion = {
  code: string;
  domain: EnterpriseDomain;
  triggerQuestionCode: string;
  triggerScores: readonly number[];
  prompt: string;
  helpText: string;
  options: ReadonlyArray<{
    value: string;
    label: string;
  }>;
};

export const ENTERPRISE_TRIAGE_OUTCOME_OPTIONS = [
  { value: "OPERATIONS", label: "Produzir e entregar melhor" },
  { value: "COMMERCIAL", label: "Vender melhor e com mais previsibilidade" },
  { value: "FINANCE", label: "Melhorar lucro, margem ou caixa" },
  { value: "OWNER_TIME", label: "Parar de depender tanto de mim" },
  { value: "UNKNOWN", label: "Ainda não sei dizer" },
] as const;

export const ENTERPRISE_TRIAGE_QUESTIONS: EnterpriseTriageQuestion[] = [
  {
    code: "TRIAGE-OUTCOME",
    pillar: "Resultado desejado",
    domain: "OUTCOME",
    prompt: "O que mais precisa melhorar na empresa agora?",
    helpText:
      "Escolha o resultado que mais aliviaria a situação da fábrica nos próximos meses.",
    options: ENTERPRISE_TRIAGE_OUTCOME_OPTIONS.map((option) => option.label),
  },
  {
    code: "TRIAGE-OPS-DELIVERY",
    pillar: "Operacional",
    domain: "OPERATIONS",
    prompt: "Os pedidos são entregues no prazo combinado?",
    helpText: "Considere os últimos 30 dias, não apenas a melhor semana.",
    options: [
      "Quase todos no prazo",
      "Alguns atrasam",
      "Atrasos são frequentes",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-OPS-CAPACITY",
    pillar: "Operacional",
    domain: "OPERATIONS",
    prompt:
      "Pensando nos pedidos já confirmados, a fábrica consegue entregar nos prazos prometidos sem viver no limite?",
    helpText:
      "Considere correria, horas extras, renegociação de prazo, pedidos recusados e atrasos prováveis.",
    options: [
      "Sim, com uma folga segura",
      "Consegue, mas depende de correria ou hora extra",
      "Não consegue; precisamos alongar prazos, atrasar ou recusar pedidos",
      "Não sei / não planejamos a capacidade",
    ],
  },
  {
    code: "TRIAGE-OPS-REWORK",
    pillar: "Operacional",
    domain: "OPERATIONS",
    prompt: "Quanto retrabalho e correção voltam para a produção?",
    helpText:
      "Inclua erros de medida, corte, usinagem, montagem, acabamento e instalação.",
    options: [
      "Pouco e sob controle",
      "Acontece com alguma frequência",
      "Consome bastante tempo e material",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-OPS-FLOW",
    pillar: "Operacional",
    domain: "OPERATIONS",
    prompt: "A produção perde tempo esperando, mudando prioridade ou procurando material e informação?",
    helpText: "Pense em pedidos parados entre uma etapa e outra.",
    options: [
      "Raramente",
      "Acontece em alguns pedidos",
      "É parte da rotina",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-COM-DEMAND",
    pillar: "Comercial",
    domain: "COMMERCIAL",
    prompt: "A empresa recebe oportunidades suficientes para ocupar a capacidade de forma saudável?",
    helpText: "Considere oportunidades com perfil e orçamento compatéveis.",
    options: [
      "Sim, com boa regularidade",
      "Oscila bastante",
      "Frequentemente faltam boas oportunidades",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-COM-FORECAST",
    pillar: "Comercial",
    domain: "COMMERCIAL",
    prompt:
      "Você consegue prever com alguma segurança quantos pedidos a empresa deverá fechar nos próximos 30 a 60 dias?",
    helpText:
      "Considere oportunidades acompanhadas, propostas em negociação e a regularidade das vendas.",
    options: [
      "Sim, temos oportunidades acompanhadas e boa previsibilidade",
      "Temos alguma visibilidade, mas varia bastante",
      "Vendemos sem previsibilidade; alguns meses enchem e outros ficam vazios",
      "Não sei / não acompanhamos",
    ],
  },
  {
    code: "TRIAGE-COM-CONVERSION",
    pillar: "Comercial",
    domain: "COMMERCIAL",
    prompt: "Os orçamentos qualificados viram pedidos na proporção esperada?",
    helpText: "Não conte contatos sem perfil ou sem intenção real de compra.",
    options: [
      "Sim, a conversão é saudável",
      "Convertem menos do que gostaríamos",
      "Muitos orçamentos não viram pedido",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-COM-QUALITY",
    pillar: "Comercial",
    domain: "COMMERCIAL",
    prompt: "As vendas chegam rentáveis e com prazo, escopo e informação compatéveis com a fábrica?",
    helpText:
      "Uma venda ruim pode gerar atraso, retrabalho ou prejuízo mesmo aumentando o faturamento.",
    options: [
      "Na maioria das vezes",
      "Há exceções que atrapalham",
      "É comum vender com margem, prazo ou informação ruins",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-FIN-MARGIN",
    pillar: "Financeiro",
    domain: "FINANCE",
    prompt: "A empresa sabe quanto realmente sobra em cada pedido ou família de produto?",
    helpText:
      "Considere material, mão de obra variável, comissão, frete, instalação e retrabalho.",
    options: [
      "Sim, acompanhamos a margem",
      "Temos uma estimativa parcial",
      "Não sabemos com segurança",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-FIN-PROFIT",
    pillar: "Financeiro",
    domain: "FINANCE",
    prompt:
      "No fechamento do mês, a empresa sabe se teve lucro real depois de pagar todas as despesas e retiradas?",
    helpText:
      "Lucro real é diferente de faturamento, saldo no banco ou margem estimada de um pedido.",
    options: [
      "Sim, acompanhamos o lucro mensal com segurança",
      "Temos apenas uma estimativa",
      "Olhamos principalmente faturamento ou saldo bancário",
      "Não sei / não fazemos fechamento",
    ],
  },
  {
    code: "TRIAGE-FIN-PRICE",
    pillar: "Financeiro",
    domain: "FINANCE",
    prompt: "Os preços são atualizados quando custos e condições do pedido mudam?",
    helpText:
      "Inclua ferragens, chapas, serviços, impostos, prazo e complexidade.",
    options: [
      "Sim, com uma regra clara",
      "Atualizamos de forma irregular",
      "O preço costuma ficar desatualizado ou ser definido no feeling",
      "Não sei / não medimos",
    ],
  },
  {
    code: "TRIAGE-FIN-CASH",
    pillar: "Financeiro",
    domain: "FINANCE",
    prompt: "Mesmo vendendo, falta caixa para pagar compromissos ou financiar os pedidos?",
    helpText:
      "Pense em compras, folha, impostos, parcelas e prazo de recebimento.",
    options: [
      "Raramente",
      "Acontece em alguns períodos",
      "É um problema recorrente",
      "Não sei / não medimos",
    ],
  },
];

export const ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS: EnterpriseTriageAdaptiveQuestion[] =
  [
    {
      code: "TRIAGE-ADP-OPS-PRESSURE",
      domain: "OPERATIONS",
      triggerQuestionCode: "TRIAGE-OPS-CAPACITY",
      triggerScores: [3, 5],
      prompt: "Quando a fábrica fica sobrecarregada, o que mais impede entregar?",
      helpText:
        "Escolha a situação que mais aparece. O ROTA 30 confirmará a causa antes de recomendar uma mudança.",
      options: [
        { value: "PEOPLE", label: "Falta de pessoas ou de conhecimento" },
        {
          value: "DEMAND",
          label: "O volume vendido fica acima da capacidade",
        },
        {
          value: "PROCESS",
          label: "Fluxo, prioridades ou retrabalho desorganizam a produção",
        },
        { value: "RESOURCE", label: "Uma máquina ou setor não acompanha" },
        {
          value: "INPUTS",
          label: "Falta material, projeto ou informação",
        },
        { value: "UNKNOWN", label: "Não sei identificar" },
      ],
    },
    {
      code: "TRIAGE-ADP-COM-FORECAST",
      domain: "COMMERCIAL",
      triggerQuestionCode: "TRIAGE-COM-FORECAST",
      triggerScores: [3, 5],
      prompt: "O que mais prejudica a previsibilidade das vendas hoje?",
      helpText:
        "Escolha o sinal mais frequente. Esta resposta direciona a investigação, mas não fecha o diagnóstico.",
      options: [
        {
          value: "LOW_OPPORTUNITIES",
          label: "Chegam poucas oportunidades ou dependemos de indicação",
        },
        {
          value: "SLOW_QUOTES",
          label: "Demoramos para enviar e acompanhar orçamentos",
        },
        { value: "LOW_CONVERSION", label: "Muitos orçamentos não fecham" },
        {
          value: "POOR_FIT",
          label: "Chegam clientes ou pedidos fora do perfil ideal",
        },
        {
          value: "CONCENTRATION",
          label: "Dependemos de poucos clientes ou canais",
        },
        { value: "UNKNOWN", label: "Não sei identificar" },
      ],
    },
    {
      code: "TRIAGE-ADP-FIN-PROFIT",
      domain: "FINANCE",
      triggerQuestionCode: "TRIAGE-FIN-PROFIT",
      triggerScores: [3, 5],
      prompt: "Onde o dinheiro parece ficar mais preso ou desaparecer?",
      helpText:
        "Escolha a percepção mais próxima. A investigação financeira deverá confirmar isso com números.",
      options: [
        { value: "MARGIN", label: "Preço ou margem insuficiente" },
        { value: "INVENTORY", label: "Estoque e materiais parados" },
        {
          value: "CASH_CYCLE",
          label: "Compramos antes e recebemos muito depois",
        },
        { value: "FIXED_COSTS", label: "Custos fixos elevados" },
        {
          value: "EXPENSES",
          label: "Retiradas ou despesas sem controle claro",
        },
        { value: "UNKNOWN", label: "Não sei identificar" },
      ],
    },
  ];

export const ENTERPRISE_TRIAGE_SCORED_QUESTION_COUNT =
  ENTERPRISE_TRIAGE_QUESTIONS.filter(
    (question) => question.domain !== "OUTCOME",
  ).length;

export const ENTERPRISE_TRIAGE_METHOD = {
  code: ENTERPRISE_TRIAGE_CODE,
  version: ENTERPRISE_TRIAGE_VERSION,
  name: "Diagnóstico da Empresa",
  description:
    "Triagem curta e adaptativa que indica se a principal oportunidade está na operação, no comercial ou no financeiro antes de abrir um diagnóstico especializado.",
  questions: ENTERPRISE_TRIAGE_QUESTIONS,
  adaptiveQuestions: ENTERPRISE_TRIAGE_ADAPTIVE_QUESTIONS,
  tieThreshold: 0.5,
  sourceOfTruth: "metodo/triagem-empresarial-v1.md",
} as const;

export function isEnterpriseDomain(value: string): value is EnterpriseDomain {
  return ENTERPRISE_DOMAINS.includes(value as EnterpriseDomain);
}


