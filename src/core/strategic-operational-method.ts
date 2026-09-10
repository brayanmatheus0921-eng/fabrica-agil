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

export const STRATEGIC_ANSWER_OPTIONS = ["Sim", "Em parte", "Não"] as const;

export const STRATEGIC_IMPACT_OPTIONS = [
  { value: "NO_RELEVANT_IMPACT", label: "Não atrapalha a rotina" },
  { value: "LOCAL_WASTE", label: "Faz perder tempo ou refazer trabalho" },
  { value: "BUSINESS_IMPACT", label: "Aumenta o custo, reduz a produção ou ameaça o prazo" },
  { value: "FLOW_OR_CUSTOMER_IMPACT", label: "Para a produção, atrasa a entrega ou prejudica o cliente" },
  { value: "UNKNOWN", label: "Não sei ou não medimos" },
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
    ["PM3.1.1", "A empresa consegue fabricar ou consertar suas ferramentas e gabaritos?", "Exemplo: um gabarito quebra e a própria equipe consegue reparar sem esperar um fornecedor."],
    ["PM3.1.2", "Cada ferramenta e gabarito tem identificação e instrução de uso?", "Exemplo: a peça tem um código ou etiqueta que mostra onde é usada e como deve ser regulada."],
    ["PM3.1.3", "A equipe encontra rapidamente a ferramenta de que precisa?", "Exemplo: o operador sabe onde buscar uma fresa ou um gabarito sem parar para procurar."],
  ],
  "PM3.2": [
    ["PM3.2.1", "A própria equipe resolve os problemas comuns das máquinas?", "Exemplo: alguém da empresa consegue trocar uma correia, fazer uma regulagem ou corrigir uma falha simples."],
    ["PM3.2.2", "Quando a equipe não resolve, consegue chamar um técnico rapidamente?", "Exemplo: uma máquina apresenta falha elétrica e já existe um profissional externo para atender."],
    ["PM3.2.3", "As revisões preventivas das máquinas são registradas e programadas?", "Exemplo: existe uma ficha ou agenda com a data da última revisão e da próxima manutenção."],
    ["PM3.2.4", "Existe uma rotina definida para lubrificar as máquinas?", "Exemplo: a equipe sabe qual máquina lubrificar, com qual produto e em que dia."],
    ["PM3.2.5", "A empresa sabe qual máquina para mais vezes?", "Exemplo: nos últimos 30 dias, a seccionadora foi a máquina que mais interrompeu a produção."],
    ["PM3.2.6", "A empresa registra quanto tempo as máquinas produzem e ficam paradas?", "Exemplo: anota o início da parada e a hora em que a máquina voltou a produzir."],
    ["PM3.2.7", "A empresa registra os motivos mais comuns das paradas?", "Exemplo: falta de material, quebra, regulagem, limpeza ou espera por operador."],
  ],
  "PM3.3": [
    ["PM3.3.1", "A empresa compara os fornecedores antes de comprar?", "Exemplo: avalia preço, prazo, qualidade e histórico de entrega antes de escolher."],
    ["PM3.3.2", "A empresa sabe quantos dias cada material demora para chegar?", "Exemplo: sabe que uma chapa chega em 2 dias e uma ferragem especial leva 10 dias."],
    ["PM3.3.3", "O transporte e o pagamento do frete são combinados antes da compra?", "Exemplo: antes de fechar, fica definido quem entrega, quanto custa e quem paga o frete."],
    ["PM3.3.4", "A mercadoria é conferida quando chega?", "Exemplo: alguém compara item, quantidade e nota fiscal antes de guardar o material."],
    ["PM3.3.5", "Cada compra fica registrada?", "Exemplo: o pedido fica salvo em uma ordem de compra, sistema, planilha ou mensagem organizada."],
    ["PM3.3.6", "A empresa acompanha quais fornecedores atrasam ou entregam errado?", "Exemplo: registra quando chegam peças faltando, material fora do padrão ou depois do prazo."],
    ["PM3.3.7", "As compras são feitas antes de o material faltar?", "Exemplo: MDF e ferragens são comprados conforme os pedidos e o estoque, evitando compras urgentes."],
  ],
  "PM3.4": [
    ["PM3.4.1", "Cada tipo de material tem um local definido para ser guardado?", "Exemplo: chapas, ferragens e tintas têm áreas marcadas e não ficam espalhadas pela fábrica."],
    ["PM3.4.2", "Existe uma pessoa responsável por receber e descarregar materiais?", "Exemplo: quando o caminhão chega, alguém definido confere e direciona o descarregamento."],
    ["PM3.4.3", "Os materiais de uso frequente ficam próximos de onde serão usados?", "Exemplo: as ferragens do dia ficam separadas perto da montagem, sem misturar com o estoque geral."],
    ["PM3.4.4", "A equipe tem meios adequados para movimentar materiais?", "Exemplo: usa carrinho ou equipamento próprio para transportar chapas e peças com segurança."],
    ["PM3.4.5", "A empresa sabe quanto existe de cada material no estoque?", "Exemplo: consegue verificar quantas chapas e dobradiças estão disponíveis antes de liberar um pedido."],
    ["PM3.4.6", "O estoque avisa o escritório sobre entradas, saídas e faltas?", "Exemplo: uma falta encontrada no estoque chega ao responsável por compras antes de parar a produção."],
    ["PM3.4.7", "Existe uma quantidade mínima definida para os materiais importantes?", "Exemplo: ao chegar a duas caixas de determinada ferragem, uma nova compra é solicitada."],
    ["PM3.4.8", "O material mais antigo é usado antes do material novo?", "Exemplo: a primeira lata de tinta que chegou é usada antes das compras mais recentes."],
  ],
  "PM3.5": [
    ["PM3.5.1", "As etapas da produção e a responsabilidade de cada setor estão definidas?", "Exemplo: projeto, corte, usinagem, acabamento e montagem sabem o que recebem e entregam."],
    ["PM3.5.2", "A empresa define quando um trabalho deve ser manual ou feito por máquina?", "Exemplo: existe um critério para decidir se uma peça será cortada manualmente ou na seccionadora."],
    ["PM3.5.3", "A empresa avalia quais tarefas vale a pena automatizar?", "Exemplo: antes de comprar um equipamento, compara o ganho de tempo com o custo e o volume de trabalho."],
    ["PM3.5.4", "As máquinas atuais atendem à qualidade e ao ritmo exigidos pelos pedidos?", "Exemplo: a máquina entrega o acabamento e a quantidade necessários sem atrasar a produção."],
    ["PM3.5.5", "A empresa sabe quanto tempo leva para trocar e regular ferramentas?", "Exemplo: mede o tempo entre terminar um corte e deixar a máquina pronta para o próximo modelo."],
    ["PM3.5.6", "Na etapa mais lenta, o tempo de troca e regulagem é conhecido?", "Exemplo: se a pintura ou usinagem segura a produção, a empresa sabe quanto tempo perde ao preparar cada lote."],
    ["PM3.5.7", "A empresa sabe quais máquinas fazem uma única tarefa e quais fazem várias?", "Exemplo: identifica a máquina exclusiva do corte e o equipamento usado em diferentes operações."],
  ],
  "PM3.6": [
    ["PM3.6.1", "Os horários e turnos são definidos conforme a quantidade de trabalho?", "Exemplo: um turno extra só é aberto quando os pedidos e a capacidade mostram essa necessidade."],
    ["PM3.6.2", "Cada pedido chega à produção com as informações necessárias?", "Exemplo: a ficha informa o que produzir, a quantidade, o prazo e as ferramentas necessárias."],
    ["PM3.6.3", "A empresa compara o que planejou produzir com o que realmente produziu?", "Exemplo: registra a meta do dia, as peças concluídas, o tempo gasto e as paradas."],
    ["PM3.6.4", "A posição das máquinas e dos materiais evita deslocamentos desnecessários?", "Exemplo: as peças não atravessam a fábrica várias vezes para seguir de uma etapa para outra."],
    ["PM3.6.5", "O pedido avança pelas etapas sem voltar ou ficar esperando com frequência?", "Exemplo: depois do corte, as peças seguem para usinagem sem retornar por falta de informação."],
    ["PM3.6.6", "A equipe sabe quais pedidos serão produzidos e em qual sequência?", "Exemplo: existe uma programação diária ou semanal visível para quem executa."],
    ["PM3.6.7", "A produção consegue lidar com mudanças sem virar uma urgência geral?", "Exemplo: uma alteração de volume ou modelo é reorganizada sem parar todos os outros pedidos."],
    ["PM3.6.8", "A empresa sabe quanto tempo leva para produzir seu principal produto?", "Exemplo: conhece o tempo do início do corte até o produto ficar pronto para expedição."],
  ],
  PM4: [
    ["PM4.1", "A empresa conta quantas peças são rejeitadas ou precisam ser refeitas?", "Exemplo: registra quantas peças voltaram para correção em cada semana."],
    ["PM4.2", "Os registros de qualidade são comparados ao longo do tempo?", "Exemplo: compara o retrabalho deste mês com o mês anterior para saber se melhorou."],
    ["PM4.3", "As reclamações e devoluções de clientes ficam registradas?", "Exemplo: anota o pedido, o problema relatado e o que precisou ser corrigido."],
    ["PM4.4", "A equipe tem um padrão claro para executar e conferir o trabalho?", "Exemplo: existe uma referência de tempo, sequência e qualidade para aprovar uma peça."],
    ["PM4.5", "A empresa procura as principais perdas da rotina de produção?", "Exemplo: identifica espera, transporte desnecessário, excesso de estoque, defeitos e produção além do necessário."],
    ["PM4.6", "A empresa acompanha algum outro número para avaliar a qualidade?", "Exemplo: aprovação na primeira conferência, devoluções ou reclamações por pedido."],
  ],
};

const impactExamples: Record<string, string> = {
  "PM3.1": "Exemplo: a produção espera porque uma ferramenta quebrou, sumiu ou não estava identificada.",
  "PM3.2": "Exemplo: uma máquina parada segura os pedidos enquanto a equipe procura a causa ou espera assistência.",
  "PM3.3": "Exemplo: uma ferragem chega atrasada ou errada e o pedido não pode seguir para montagem.",
  "PM3.4": "Exemplo: o material existe, mas ninguém encontra; ou o controle mostra uma quantidade diferente do estoque real.",
  "PM3.5": "Exemplo: uma máquina ou regulagem lenta limita a quantidade produzida e cria fila na etapa seguinte.",
  "PM3.6": "Exemplo: pedidos entram sem sequência, acumulam entre etapas ou voltam por falta de informação.",
  PM4: "Exemplo: o mesmo defeito aparece em várias peças, gera retrabalho e chega a provocar reclamação do cliente.",
};

export const STRATEGIC_OPERATIONAL_QUESTIONS: StrategicDiagnosticQuestion[] =
  STRATEGIC_OPERATIONAL_THEMES.flatMap((theme) => [
    ...questionsByTheme[theme.code].map(([code, prompt, helpText]) => ({
      code,
      pillar: `${theme.code} - ${theme.name}`,
      prompt,
      helpText: helpText ?? null,
      answerType: "SINGLE_SELECT" as const,
      options: STRATEGIC_ANSWER_OPTIONS,
      weight: 1,
      required: true,
    })),
    {
      code: `${theme.code}.IMPACT`,
      pillar: `${theme.code} - ${theme.name}`,
      prompt: `Quando há problemas em ${theme.name.toLowerCase()}, o que acontece na prática?`,
      helpText: impactExamples[theme.code],
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
