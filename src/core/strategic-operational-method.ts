export const STRATEGIC_OPERATIONAL_METHOD_CODE =
  "MOVEIS-OPERACIONAL-IDENTIFICACAO-ESTRATEGICA-V2";
export const STRATEGIC_OPERATIONAL_METHOD_VERSION = 2;

export type StrategicAnswer = "YES" | "NO" | "PARTIAL";
export type ThemeStatus = "EXISTS" | "NOT_EXISTS";
export type StrategicImportance =
  | "VERY_IMPORTANT"
  | "IMPORTANT"
  | "LITTLE_IMPORTANT";
export type StrategicPerformance = "VERY_GOOD" | "GOOD" | "BAD";
export type StrategicImpact =
  | "NO_RELEVANT_IMPACT"
  | "LOCAL_WASTE"
  | "BUSINESS_IMPACT"
  | "FLOW_OR_CUSTOMER_IMPACT"
  | "UNKNOWN";
export type StrategicMatrixQuadrant =
  | "URGENT_ACTION"
  | "IMPROVEMENTS"
  | "EFFICACY"
  | "EXCESS"
  | "INDIFFERENCE";

export type StrategicTheme = {
  code: string;
  area: "Produto e Manufatura";
  name: string;
  description: string;
};

export type StrategicDiagnosticQuestion = {
  code: string;
  pillar: string;
  prompt: string;
  helpText: string | null;
  answerType: "SINGLE_SELECT" | "MULTI_SELECT";
  options: unknown;
  weight: number;
  required: boolean;
};

export const STRATEGIC_ANSWER_OPTIONS = ["Sim", "Não", "Parcial"] as const;

export const STRATEGIC_IMPACT_OPTIONS = [
  { value: "NO_RELEVANT_IMPACT", label: "Não gera impacto relevante" },
  { value: "LOCAL_WASTE", label: "Gera perda de tempo ou retrabalho localizado" },
  { value: "BUSINESS_IMPACT", label: "Afeta custo, produtividade, prazo ou capacidade" },
  { value: "FLOW_OR_CUSTOMER_IMPACT", label: "Interrompe a produção, atrasa entregas ou afeta o cliente" },
  { value: "UNKNOWN", label: "Não sabemos ou não medimos" },
] as const;

export const STRATEGIC_OPERATIONAL_THEMES: StrategicTheme[] = [
  {
    code: "PM3.1",
    area: "Produto e Manufatura",
    name: "Ferramentaria",
    description: "Fabricação, manutenção, identificação e localização do ferramental.",
  },
  {
    code: "PM3.2",
    area: "Produto e Manufatura",
    name: "Manutenção",
    description: "Controle dos equipamentos, prevenção, paradas e suporte de manutenção.",
  },
  {
    code: "PM3.3",
    area: "Produto e Manufatura",
    name: "Logística - Compra",
    description: "Fornecedores, compras, recebimento e planejamento de matéria-prima.",
  },
  {
    code: "PM3.4",
    area: "Produto e Manufatura",
    name: "Logística - Armazenamento",
    description: "Armazenamento, movimentação, estoque, comunicação e FIFO.",
  },
  {
    code: "PM3.5",
    area: "Produto e Manufatura",
    name: "Manufatura - Operacional",
    description: "Mecanização, automação, máquinas, ferramentas e configuração da operação.",
  },
  {
    code: "PM3.6",
    area: "Produto e Manufatura",
    name: "Manufatura - Funcional",
    description: "Turnos, fichas, controles, layout, fluxo e planejamento da produção.",
  },
  {
    code: "PM4",
    area: "Produto e Manufatura",
    name: "Qualidade e Indicadores",
    description: "Rejeição, retrabalho, reclamações, padrões e indicadores de qualidade.",
  },
];

const questionsByTheme: Record<string, Array<[string, string, string?]>> = {
  "PM3.1": [
    ["PM3.1.1", "A fabricação ou manutenção do ferramental é própria?"],
    ["PM3.1.2", "A empresa documenta e codifica o ferramental?"],
    ["PM3.1.3", "O ferramental é fácil de localizar quando necessário?"],
  ],
  "PM3.2": [
    ["PM3.2.1", "A manutenção industrial é própria?"],
    ["PM3.2.2", "É possível terceirizar manutenção elétrica, hidráulica, mecânica ou pneumática quando necessário?"],
    ["PM3.2.3", "Existe ficha de controle dos equipamentos para manutenção preventiva?"],
    ["PM3.2.4", "Existe ficha ou plano de lubrificação?"],
    ["PM3.2.5", "A empresa conhece a máquina que provoca o maior número de paradas?", "Na observação, informe qual máquina se souber."],
    ["PM3.2.6", "A empresa conhece o tempo médio de produção e de paradas?", "Na observação, registre tempos ou período medido."],
    ["PM3.2.7", "A empresa conhece os tipos mais comuns de parada de máquinas?", "Na observação, cite os principais tipos."],
  ],
  "PM3.3": [
    ["PM3.3.1", "Existem critérios para selecionar fornecedores e fazer cotações?"],
    ["PM3.3.2", "A empresa conhece o tempo entre o pedido de compra e o recebimento?", "Na observação, informe o prazo se souber."],
    ["PM3.3.3", "Existem critérios para escolher o transporte e definir quem paga o frete?"],
    ["PM3.3.4", "O recebimento confere mercadoria, pedido e nota fiscal?"],
    ["PM3.3.5", "Existem ordens ou solicitações de compra documentadas?"],
    ["PM3.3.6", "A empresa acompanha o desempenho dos fornecedores?"],
    ["PM3.3.7", "O fornecimento de matéria-prima é planejado?"],
  ],
  "PM3.4": [
    ["PM3.4.1", "Existe um local definido para armazenar os suprimentos?"],
    ["PM3.4.2", "Existe uma pessoa responsável pelo descarregamento?"],
    ["PM3.4.3", "Existe estoque intermediário ou almoxarifado de linha?"],
    ["PM3.4.4", "Existe transporte interno adequado, como carrinhos ou gruas?"],
    ["PM3.4.5", "O estoque é controlado e sua quantidade é conhecida?"],
    ["PM3.4.6", "O armazenamento mantém comunicação com a administração?"],
    ["PM3.4.7", "Existe uma política de estoque mínimo?"],
    ["PM3.4.8", "A empresa usa FIFO, fazendo o primeiro item que entra ser o primeiro que sai?"],
  ],
  "PM3.5": [
    ["PM3.5.1", "Existem critérios de manufatura e setores de produção definidos?", "Na observação, informe os setores."],
    ["PM3.5.2", "Existem critérios para definir o grau de mecanização?"],
    ["PM3.5.3", "Existem critérios para definir o grau de automação?"],
    ["PM3.5.4", "A idade média das máquinas é compatível com as exigências do mercado?"],
    ["PM3.5.5", "O tempo médio de troca de ferramentas é conhecido ou controlado?"],
    ["PM3.5.6", "O tempo de troca de ferramenta no gargalo do produto principal é conhecido?"],
    ["PM3.5.7", "A empresa sabe quais máquinas são dedicadas e quais são multiuso?"],
  ],
  "PM3.6": [
    ["PM3.6.1", "Existem critérios para definir os turnos de operação?"],
    ["PM3.6.2", "São utilizadas fichas de fabricação com quantidade, prazo e ferramental?"],
    ["PM3.6.3", "Existe controle da fabricação com capacidade nominal, capacidade real, paradas e tempos?"],
    ["PM3.6.4", "O layout atual facilita a produção?"],
    ["PM3.6.5", "O fluxo produtivo atual é conveniente?"],
    ["PM3.6.6", "Existe planejamento, programação e controle da produção?"],
    ["PM3.6.7", "A manufatura consegue se adaptar a mudanças de produto ou volume?"],
    ["PM3.6.8", "A empresa conhece o tempo de processamento do principal produto?"],
  ],
  PM4: [
    ["PM4.1", "A empresa calcula o índice de rejeição e retrabalho?"],
    ["PM4.2", "A empresa elabora estatísticas de qualidade a partir dos dados?"],
    ["PM4.3", "A empresa registra reclamações ou devoluções de clientes?"],
    ["PM4.4", "Existem padrões de tempo, processo, operação e qualidade?"],
    ["PM4.5", "A empresa aplica a análise das sete perdas do Sistema Toyota?"],
    ["PM4.6", "A empresa acompanha outros indicadores de qualidade?", "Na observação, informe quais."],
  ],
};

export const STRATEGIC_OPERATIONAL_QUESTIONS: StrategicDiagnosticQuestion[] =
  STRATEGIC_OPERATIONAL_THEMES.flatMap((theme) => [
    ...questionsByTheme[theme.code].map(([code, prompt, helpText]) => ({
      code,
      pillar: `${theme.code} - ${theme.name}`,
      prompt,
      helpText: helpText ?? "Use a observação para registrar exemplos, números, documentos ou situações recentes.",
      answerType: "SINGLE_SELECT" as const,
      options: STRATEGIC_ANSWER_OPTIONS,
      weight: 1,
      required: true,
    })),
    {
      code: `${theme.code}.IMPACT`,
      pillar: `${theme.code} - ${theme.name}`,
      prompt: `Quando ${theme.name.toLowerCase()} apresenta problemas, qual é o efeito mais comum na empresa?`,
      helpText:
        "Responda pelo efeito observado. O sistema calculará importância, desempenho e posição na matriz.",
      answerType: "SINGLE_SELECT" as const,
      options: STRATEGIC_IMPACT_OPTIONS,
      weight: 0,
      required: true,
    },
  ]);

export const STRATEGIC_OPERATIONAL_METHOD = {
  code: STRATEGIC_OPERATIONAL_METHOD_CODE,
  version: STRATEGIC_OPERATIONAL_METHOD_VERSION,
  name: "Identificação Estratégica Operacional — cálculo automático",
  objective:
    "Identificar oportunidades de melhoria em manufatura e chão de fábrica pela matriz de importância e desempenho.",
  questions: STRATEGIC_OPERATIONAL_QUESTIONS,
  themes: STRATEGIC_OPERATIONAL_THEMES,
  sources: [
    "Anexo W.05 - Questões de Identificação Estratégica da Empresa",
    "Anexo W.06 - Identificação Estratégica da Empresa",
    "Anexo W.07 - Matriz de Identificação Estratégica",
  ],
} as const;
