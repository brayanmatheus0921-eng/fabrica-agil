export const productionTypeOptions = [
  "Sob medida",
  "Seriada ou modulada",
  "Mista",
] as const;

export const monthlyRevenueOptions = [
  "Até R$ 150 mil",
  "De R$ 150 mil a R$ 500 mil",
  "Acima de R$ 500 mil",
  "Não sei ou prefiro não informar",
] as const;

export const monthlyOrderOptions = [
  "Até 10 pedidos",
  "De 11 a 30 pedidos",
  "Mais de 30 pedidos",
  "Não sei",
] as const;

export const onTimeDeliveryOptions = [
  "Quase todos no prazo",
  "Parte no prazo e parte atrasada",
  "Muitos pedidos atrasam",
  "Não sei ou não medimos",
] as const;

export const reworkOptions = [
  "Raro",
  "Acontece toda semana",
  "Acontece quase todos os dias",
  "Não sei ou não registramos",
] as const;

export const ownerDependencyOptions = [
  "A equipe decide e executa",
  "Algumas decisões dependem do dono",
  "Sem o dono, a operação trava",
] as const;

export const mainGoalOptions = [
  "Entregar mais pedidos no prazo",
  "Reduzir retrabalho e custos",
  "Produzir mais com a mesma estrutura",
  "Fazer a empresa depender menos do dono",
] as const;

export const companyProfileQuestions = [
  {
    key: "name",
    title: "Qual é o nome da empresa?",
    hint: "Use o nome pelo qual sua equipe conhece a fábrica.",
    placeholder: "Ex.: Móveis Horizonte",
    type: "text",
  },
  {
    key: "productionType",
    title: "Como sua fábrica produz?",
    hint: "Escolha a opção que melhor representa a maior parte dos pedidos.",
    type: "choice",
    options: productionTypeOptions,
  },
  {
    key: "teamSize",
    title: "Quantas pessoas trabalham na empresa?",
    hint: "Considere produção, projeto, administrativo e gestão.",
    placeholder: "Ex.: 18",
    type: "number",
  },
  {
    key: "monthlyRevenueRange",
    title: "Qual é a faixa de faturamento mensal?",
    hint: "Uma faixa já é suficiente. Você não precisa informar o valor exato.",
    type: "choice",
    options: monthlyRevenueOptions,
  },
  {
    key: "monthlyOrderVolume",
    title: "Quantos pedidos a fábrica entrega por mês?",
    hint: "Use uma média aproximada dos últimos três meses.",
    type: "choice",
    options: monthlyOrderOptions,
  },
  {
    key: "onTimeDeliveryRange",
    title: "Como estão as entregas hoje?",
    hint: "Considere os pedidos concluídos nos últimos 30 dias.",
    type: "choice",
    options: onTimeDeliveryOptions,
  },
  {
    key: "reworkRange",
    title: "Com que frequência existe retrabalho?",
    hint: "Considere peças refeitas, correções e retorno de pedidos.",
    type: "choice",
    options: reworkOptions,
  },
  {
    key: "ownerDependency",
    title: "Quanto a operação depende do dono?",
    hint: "Pense no que acontece quando o dono passa um dia fora.",
    type: "choice",
    options: ownerDependencyOptions,
  },
  {
    key: "mainGoal",
    title: "Qual resultado mais importa nos próximos 90 dias?",
    hint: "Escolha somente o principal. Os demais podem entrar em ciclos futuros.",
    type: "choice",
    options: mainGoalOptions,
  },
] as const;

export type CompanyProfileQuestionKey =
  (typeof companyProfileQuestions)[number]["key"];

export type CompanyProfileValues = {
  name: string;
  productionType: string;
  teamSize: number | null;
  monthlyRevenueRange: string;
  monthlyOrderVolume: string;
  onTimeDeliveryRange: string;
  reworkRange: string;
  ownerDependency: string;
  mainGoal: string;
};



