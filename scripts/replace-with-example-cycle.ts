import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { executableCooPlanSchema, type WorkshopState } from "../src/core/coo-workshop";
import { persistWorkshopPlan } from "../src/server/ai/workshop-persistence";
import { activateDraftPlan } from "../src/server/plans/approve-plan";

loadEnvFile(".env");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada");
const url = new URL(connectionString);
if (!(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "5433")) {
  throw new Error("Este script só pode substituir dados no banco local de desenvolvimento (127.0.0.1:5433).");
}
if (!process.argv.includes("--replace-current-cycle")) {
  throw new Error("Confirme a substituição com --replace-current-cycle.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const suffix = Date.now().toString(36);
const threadId = `coo-simulation-${suffix}`;

const plan = executableCooPlanSchema.parse({
  objective: "Criar uma rotina simples para cumprir a sequência dos pedidos e tornar os principais desvios visíveis antes de ampliar as mudanças.",
  initiatives: [
    {
      title: "Estabilizar a programação diária da produção",
      kind: "PRIMARY",
      facts: "O diagnóstico registrou planejamento verbal, mudança de prioridades durante o dia e ausência de acompanhamento dos tempos reais.",
      hypothesis: "Uma sequência diária visível e uma revisão curta podem reduzir urgências; o efeito ainda precisa ser medido.",
      evidenceCodes: ["PM3.6.2", "PM3.6.3", "PM3.6.6"],
      methodCode: "ROTA-TRABALHO-PADRONIZADO",
      actions: [{
        what: "Testar um quadro diário de produção por 7 dias",
        why: "Dar uma única sequência para a equipe e descobrir por que o planejado muda.",
        who: "Responsável pela produção",
        whenDays: 7,
        where: "Reunião de início do turno e quadro visível da produção",
        how: "Escolher os pedidos do dia, registrar a ordem, marcar o realizado e anotar apenas o motivo de cada desvio.",
        howMuch: "Sem compra de sistema; usar o formulário simples da própria tarefa.",
        indicator: "Percentual de pedidos concluídos na sequência planejada",
        baseline: "Ainda não medido; o diagnóstico mostra que o planejamento é verbal.",
        target: "Completar 7 dias de registro e usar a primeira medição para definir uma meta realista; referência inicial sugerida: 80% em 30 dias.",
        proof: "Sete registros diários com planejado, realizado e motivo dos desvios.",
        reviewCadence: "Revisão rápida diária e checagem do gestor nos dias 3 e 7.",
        execution: {
          steps: [
            { title: "Escolha a sequência", instruction: "Antes do turno, liste os pedidos que realmente cabem no dia e coloque-os em ordem.", doneWhen: "A equipe consegue apontar qual pedido vem primeiro, segundo e terceiro." },
            { title: "Atualize sem burocracia", instruction: "No fim do turno, marque o que saiu e escreva uma frase somente quando houver desvio.", doneWhen: "Planejado, realizado e motivo do desvio estão registrados." },
            { title: "Revise no sétimo dia", instruction: "Conte quantos pedidos seguiram a sequência e agrupe os motivos que mais se repetiram.", doneWhen: "O percentual e o principal motivo de desvio estão visíveis." },
          ],
          recording: {
            kind: "FORM", title: "Registro diário da sequência", unit: "dia",
            instructions: "Preencha uma linha curta no fim de cada turno; não escreva relatório.",
            fields: [
              { key: "data", label: "Data", hint: "Dia do registro", example: "31/08/2026", type: "TEXT", required: true },
              { key: "pedidos_planejados", label: "Pedidos planejados", hint: "Códigos na ordem combinada", example: "145, 148, 151", type: "TEXT", required: true },
              { key: "pedidos_concluidos", label: "Pedidos concluídos", hint: "Códigos concluídos na ordem", example: "145, 148", type: "TEXT", required: true },
              { key: "motivo_desvio", label: "Motivo do desvio", hint: "Uma frase curta; deixe vazio se não houve", example: "Faltou ferragem do pedido 151", type: "TEXT", required: false },
            ],
          },
          completionCriteria: "Há um registro por dia durante 7 dias, sem lacunas na sequência planejada e realizada.",
          improvementCriteria: "A fábrica conhece a aderência à sequência e o motivo de desvio mais recorrente.",
          reviewQuestion: "Qual motivo mais tirou os pedidos da sequência combinada?",
        },
      }],
    },
    {
      title: "Liberar pedidos apenas com materiais conferidos",
      kind: "SECONDARY",
      facts: "O diagnóstico registrou que faltas são descobertas quando a produção tenta iniciar e que não há estoque mínimo para itens recorrentes.",
      hypothesis: "Uma conferência curta antes da liberação pode evitar pedidos iniciados sem condição de terminar.",
      evidenceCodes: ["PM3.4.6", "PM3.4.7"],
      methodCode: "ROTA-LIBERACAO-COMPLETA",
      actions: [{
        what: "Conferir materiais antes de liberar cada pedido piloto",
        why: "Evitar iniciar um pedido que ficará parado por falta de material ou informação.",
        who: "Compras ou almoxarifado, com validação da produção",
        whenDays: 14,
        where: "Na liberação do pedido para o chão de fábrica",
        how: "Usar uma lista curta dos materiais e informações essenciais do próprio pedido e marcar disponível, faltando ou aguardando confirmação.",
        howMuch: "Sem custo de software; formulário incluído na tarefa.",
        indicator: "Quantidade de pedidos parados por falta de material após a liberação",
        baseline: "Ainda não medida; o diagnóstico registra ocorrência sem quantidade.",
        target: "Conferir 100% dos pedidos piloto por 7 dias e então definir uma meta de redução com a linha de base observada.",
        proof: "Checklists dos pedidos piloto e lista das faltas encontradas antes da liberação.",
        reviewCadence: "Revisão a cada dois dias durante o piloto.",
        execution: {
          steps: [
            { title: "Escolha o pedido piloto", instruction: "Comece pelos pedidos previstos para os próximos sete dias, sem tentar revisar toda a carteira.", doneWhen: "Os pedidos do piloto estão identificados." },
            { title: "Confira antes de liberar", instruction: "Valide materiais, projeto e ferragens; registre somente o item que impediria o início ou a conclusão.", doneWhen: "Cada pedido está marcado como liberado ou bloqueado com motivo." },
            { title: "Conte as prevenções", instruction: "Ao fim do piloto, conte quantas faltas foram descobertas antes de chegarem ao chão de fábrica.", doneWhen: "O total de pedidos conferidos, bloqueados e parados está visível." },
          ],
          recording: {
            kind: "FORM", title: "Liberação completa do pedido", unit: "pedido",
            instructions: "Preencha antes de mandar o pedido para a produção.",
            fields: [
              { key: "pedido", label: "Pedido", hint: "Código ou nome", example: "Pedido 151", type: "TEXT", required: true },
              { key: "materiais", label: "Materiais", hint: "Disponível, faltando ou conferir", example: "Faltando dobradiça", type: "TEXT", required: true },
              { key: "projeto_informacoes", label: "Projeto e informações", hint: "Completo ou pendência", example: "Completo", type: "TEXT", required: true },
              { key: "decisao", label: "Decisão", hint: "Liberado ou bloqueado", example: "Bloqueado até 02/09", type: "TEXT", required: true },
            ],
          },
          completionCriteria: "Todos os pedidos piloto foram conferidos antes da liberação durante 7 dias.",
          improvementCriteria: "Faltas são encontradas antes do início e os pedidos bloqueados têm motivo explícito.",
          reviewQuestion: "Quantas paradas foram evitadas pela conferência?",
        },
      }],
    },
    {
      title: "Medir retrabalho antes de atacar causas",
      kind: "SECONDARY",
      facts: "O diagnóstico registrou percepção de retrabalho, mas sem estatística por pedido, setor ou causa.",
      hypothesis: "Sete dias de registro podem mostrar a causa dominante; ainda não há dados para escolher essa causa.",
      evidenceCodes: ["PM4.1", "PM4.2", "PM4.5"],
      methodCode: "ROTA-REDUCAO-RETRABALHO",
      actions: [{
        what: "Registrar retrabalhos por 7 dias e montar o primeiro Pareto",
        why: "Escolher a causa que mais consome tempo, em vez de atacar pela percepção.",
        who: "Responsável da produção com apoio dos líderes dos setores",
        whenDays: 21,
        where: "No ponto em que o retrabalho é identificado",
        how: "Anotar pedido, setor, defeito, causa percebida e minutos gastos; ao final, ordenar as causas pelo tempo total.",
        howMuch: "Sem custo de software; formulário incluído na tarefa.",
        indicator: "Minutos de retrabalho por causa",
        baseline: "Ainda não medida; existe apenas a percepção registrada no diagnóstico.",
        target: "Registrar 100% das ocorrências por 7 dias e identificar a causa com maior tempo acumulado.",
        proof: "Registros das ocorrências e ranking das causas por minutos de retrabalho.",
        reviewCadence: "Conferência diária de preenchimento e análise no sétimo dia.",
        execution: {
          steps: [
            { title: "Registre quando acontecer", instruction: "Quando houver correção, anote apenas os dados essenciais antes de retomar o trabalho.", doneWhen: "A ocorrência tem pedido, setor, defeito e tempo aproximado." },
            { title: "Agrupe as causas", instruction: "No sétimo dia, some os minutos de ocorrências com a mesma causa percebida.", doneWhen: "As causas estão ordenadas do maior para o menor tempo." },
            { title: "Escolha o próximo teste", instruction: "Leve a principal causa ao acompanhamento antes de definir uma solução definitiva.", doneWhen: "Uma causa foi escolhida com base no tempo registrado." },
          ],
          recording: {
            kind: "FORM", title: "Registro rápido de retrabalho", unit: "ocorrência",
            instructions: "Registre em menos de um minuto quando o retrabalho for identificado.",
            fields: [
              { key: "pedido", label: "Pedido", hint: "Código do pedido", example: "Pedido 148", type: "TEXT", required: true },
              { key: "setor", label: "Setor", hint: "Onde apareceu", example: "Montagem", type: "TEXT", required: true },
              { key: "defeito", label: "Defeito", hint: "O que precisou ser corrigido", example: "Furação fora de posição", type: "TEXT", required: true },
              { key: "causa", label: "Causa percebida", hint: "Use não sei quando necessário", example: "Medida incorreta", type: "TEXT", required: true },
              { key: "minutos", label: "Minutos gastos", hint: "Tempo aproximado", example: "25", type: "NUMBER", required: true },
            ],
          },
          completionCriteria: "As ocorrências de 7 dias foram registradas e agrupadas por causa.",
          improvementCriteria: "A causa prioritária foi escolhida pelo tempo acumulado, não por opinião.",
          reviewQuestion: "Qual causa consumiu mais minutos de retrabalho?",
        },
      }],
    },
  ],
});

const simulatedMessages = [
  { id: `sim-a1-${suffix}`, role: "ASSISTANT" as const, content: "Esta é uma conversa simulada para mostrar o processo. **Fato do diagnóstico:** o planejamento é verbal, as prioridades mudam e os tempos não são acompanhados. **Inferência:** isso pode estar alimentando atrasos, mas preciso confirmar. O que mais pesa hoje: atraso, falta de material ou retrabalho?" },
  { id: `sim-u1-${suffix}`, role: "USER" as const, content: "Atrasos e troca de prioridade. A equipe começa uma coisa e logo precisa parar para atender outra urgência." },
  { id: `sim-a2-${suffix}`, role: "ASSISTANT" as const, content: "Entendi. Vocês medem quantos pedidos seguem a sequência combinada ou ainda é uma percepção?" },
  { id: `sim-u2-${suffix}`, role: "USER" as const, content: "Ainda é percepção. Não temos esse número." },
  { id: `sim-a3-${suffix}`, role: "ASSISTANT" as const, content: "Então não vou inventar uma linha de base. Para o primeiro teste, qual resultado seria mais útil: cumprir a sequência do dia ou reduzir todas as paradas de uma vez?" },
  { id: `sim-u3-${suffix}`, role: "USER" as const, content: "Cumprir a sequência do dia e reduzir as urgências." },
  { id: `sim-a4-${suffix}`, role: "ASSISTANT" as const, content: "Temos duas opções: atacar várias causas agora, com mais esforço e pouca medição, ou começar pela programação diária, medir desvios e usar os dados para decidir o próximo ataque. **Recomendação:** começar pela programação diária; materiais e retrabalho entram como medições secundárias. Confirma essa ordem?" },
  { id: `sim-u4-${suffix}`, role: "USER" as const, content: "Confirmo. Programação diária primeiro; materiais e retrabalho depois." },
  { id: `sim-a5-${suffix}`, role: "ASSISTANT" as const, content: "Quem consegue liderar o registro diário e com que frequência você consegue revisar sem criar burocracia?" },
  { id: `sim-u5-${suffix}`, role: "USER" as const, content: "O responsável da produção pode liderar. Eu confiro nos dias 3 e 7." },
  { id: `sim-a6-${suffix}`, role: "ASSISTANT" as const, content: "Vou usar três métodos já cadastrados: Trabalho Padronizado e Gestão à Vista, Liberação Completa do Pedido e Redução de Retrabalho. Posso montar o plano com uma tarefa simples para cada prioridade, formulário pronto e meta de primeiro medir antes de prometer redução?" },
  { id: `sim-u6-${suffix}`, role: "USER" as const, content: "Pode montar assim." },
  { id: `sim-a7-${suffix}`, role: "ASSISTANT" as const, content: "Plano pronto para revisão. A prioridade principal é testar o quadro diário por 7 dias. As outras duas tarefas medem falta de material e retrabalho sem tirar o foco da primeira." },
  { id: `sim-u7-${suffix}`, role: "USER" as const, content: "Revisei e aprovo o plano." },
  { id: `sim-a8-${suffix}`, role: "ASSISTANT" as const, content: "Plano aprovado. Próximo passo: abra **Tarefas** e comece por **Testar um quadro diário de produção por 7 dias**. O primeiro retorno será no dia 3." },
];

async function main() {
  const newestDiagnostic = await prisma.diagnosticSession.findFirstOrThrow({
    where: { companyId: DEV_COMPANY_ID, status: "COMPLETED" }, orderBy: { createdAt: "desc" },
  });
  await prisma.diagnosticSession.update({ where: { id: newestDiagnostic.id }, data: {
    title: "Diagnóstico 01 — Exemplo de fluxo e atrasos",
    resultSummary: "Exemplo fictício para visualizar o diagnóstico, a conversa com o COO e o plano. Não representa fatos confirmados da empresa.",
  } });

  const now = new Date();
  const userIds = simulatedMessages.filter(m => m.role === "USER").map(m => m.id);
  const reviewState: WorkshopState = {
    skillVersion: 1, diagnosticId: newestDiagnostic.id, diagnosticTitle: "Diagnóstico 01 — Exemplo de fluxo e atrasos",
    stage: "REVIEW", revision: 6, furthestStage: 5, planId: null,
    summary: "Plano de exemplo concluído em conjunto, com uma prioridade principal e duas medições secundárias.",
    confirmedFacts: [
      { statement: "Atrasos e trocas de prioridade são o efeito percebido mais relevante.", sourceMessageId: `sim-u1-${suffix}` },
      { statement: "A fábrica ainda não mede aderência à sequência.", sourceMessageId: `sim-u2-${suffix}` },
      { statement: "O objetivo inicial é cumprir a sequência diária e reduzir urgências.", sourceMessageId: `sim-u3-${suffix}` },
      { statement: "O responsável da produção pode liderar; o gestor revisa nos dias 3 e 7.", sourceMessageId: `sim-u5-${suffix}` },
    ],
    hypotheses: ["Uma programação diária visível pode reduzir trocas de prioridade; o efeito precisa ser medido."],
    decision: { primaryTitle: "Estabilizar a programação diária da produção", reason: "É o problema confirmado pelo gestor e cria dados para decidir os próximos ataques.", basis: "NEW_EVIDENCE", confirmedByMessageId: `sim-u4-${suffix}` },
    plan,
    history: [
      { revision: 0, stage: "UNDERSTAND", summary: "Efeito principal confirmado: atrasos e troca de prioridade.", at: new Date(now.getTime() - 12 * 60_000).toISOString() },
      { revision: 1, stage: "MEASURE", summary: "Linha de base ainda não existe; será medida no piloto.", at: new Date(now.getTime() - 10 * 60_000).toISOString() },
      { revision: 2, stage: "CAUSES", summary: "Planejamento verbal é evidência; redução de urgências é hipótese a testar.", at: new Date(now.getTime() - 8 * 60_000).toISOString() },
      { revision: 3, stage: "PRIORITIZE", summary: "Programação diária escolhida como iniciativa principal.", at: new Date(now.getTime() - 6 * 60_000).toISOString() },
      { revision: 4, stage: "PLAN", summary: "Três iniciativas construídas com responsáveis, registros e critérios.", at: new Date(now.getTime() - 4 * 60_000).toISOString() },
      { revision: 5, stage: "REVIEW", summary: "Plano apresentado para aprovação.", at: new Date(now.getTime() - 2 * 60_000).toISOString() },
    ],
  };

  const oldDiagnosticIds = (await prisma.diagnosticSession.findMany({ where: { companyId: DEV_COMPANY_ID, id: { not: newestDiagnostic.id } }, select: { id: true } })).map(x => x.id);
  const oldPlanIds = (await prisma.actionPlan.findMany({ where: { companyId: DEV_COMPANY_ID }, select: { id: true } })).map(x => x.id);
  const oldPlanningThreadIds = (await prisma.conversationThread.findMany({ where: { companyId: DEV_COMPANY_ID, workflowState: { not: Prisma.DbNull } }, select: { id: true } })).map(x => x.id);
  const oldTaskIds = (await prisma.task.findMany({ where: { actionPlanId: { in: oldPlanIds } }, select: { id: true } })).map(x => x.id);
  const oldCheckinIds = (await prisma.progressCheckin.findMany({ where: { actionPlanId: { in: oldPlanIds } }, select: { id: true } })).map(x => x.id);

  const result = await prisma.$transaction(async tx => {
    await tx.conversationThread.create({ data: {
      id: threadId, companyId: DEV_COMPANY_ID, title: "Simulação · Criação do plano — fluxo e atrasos",
      status: "ACTIVE", lastMessageAt: now, workflowState: reviewState as never,
    } });
    await tx.conversationMessage.createMany({ data: simulatedMessages.map((message, index) => ({
      ...message, threadId, createdAt: new Date(now.getTime() - (simulatedMessages.length - index) * 60_000),
      metadata: { demo: true, simulated: true, source: "SIMULATED_WORKSHOP" },
    })) });
    const savedState = await persistWorkshopPlan(tx, DEV_COMPANY_ID, threadId, reviewState);
    await tx.conversationThread.update({ where: { id: threadId }, data: { workflowState: savedState as never } });
    if (!savedState.planId) throw new Error("O plano de exemplo não foi persistido.");
    const activated = await activateDraftPlan(tx, DEV_COMPANY_ID, savedState.planId, now);
    if (!activated) throw new Error("O plano de exemplo não foi ativado.");

    if (oldTaskIds.length) {
      await tx.workspaceArtifact.updateMany({ where: { taskId: { in: oldTaskIds } }, data: { taskId: null } });
      await tx.evidenceOutput.deleteMany({ where: { taskId: { in: oldTaskIds } } });
      await tx.companyMemory.deleteMany({ where: { sourceType: "TASK", sourceId: { in: oldTaskIds } } });
    }
    if (oldCheckinIds.length) {
      await tx.evidenceOutput.deleteMany({ where: { checkinId: { in: oldCheckinIds } } });
      await tx.metricMeasurement.deleteMany({ where: { checkinId: { in: oldCheckinIds } } });
      await tx.companyMemory.deleteMany({ where: { sourceType: "CHECKIN", sourceId: { in: oldCheckinIds } } });
    }
    if (oldPlanIds.length) {
      await tx.lessonAssignment.deleteMany({ where: { actionPlanId: { in: oldPlanIds } } });
      await tx.progressCheckin.deleteMany({ where: { actionPlanId: { in: oldPlanIds } } });
      await tx.actionPlan.deleteMany({ where: { id: { in: oldPlanIds } } });
    }
    if (oldDiagnosticIds.length) {
      await tx.companyMemory.deleteMany({ where: { sourceType: "DIAGNOSTIC", sourceId: { in: oldDiagnosticIds } } });
      await tx.metricMeasurement.deleteMany({ where: { diagnosticSessionId: { in: oldDiagnosticIds } } });
      await tx.methodRecommendation.deleteMany({ where: { diagnosticSessionId: { in: oldDiagnosticIds } } });
      await tx.bottleneckAssessment.deleteMany({ where: { diagnosticSessionId: { in: oldDiagnosticIds } } });
      await tx.diagnosticSession.deleteMany({ where: { id: { in: oldDiagnosticIds } } });
    }
    if (oldPlanningThreadIds.length) await tx.conversationThread.deleteMany({ where: { id: { in: oldPlanningThreadIds } } });
    return { planId: savedState.planId };
  });

  const verification = await prisma.company.findUniqueOrThrow({ where: { id: DEV_COMPANY_ID }, select: {
    id: true, name: true,
    diagnostics: { select: { id: true, title: true, status: true } },
    actionPlans: { select: { id: true, title: true, status: true, tasks: { select: { id: true, title: true, status: true, executionGuide: true }, orderBy: { sortOrder: "asc" } }, checkins: { select: { status: true } } } },
    conversations: { where: { id: threadId }, select: { id: true, title: true, workflowState: true, messages: { select: { role: true, metadata: true } } } },
  } });
  const newPlan = verification.actionPlans.find(item => item.id === result.planId);
  if (verification.diagnostics.length !== 1 || verification.actionPlans.length !== 1 || newPlan?.status !== "ACTIVE" || newPlan.tasks.length !== 3 || verification.conversations[0]?.messages.length !== simulatedMessages.length) {
    throw new Error(`Validação final falhou: ${JSON.stringify(verification)}`);
  }
  console.log(JSON.stringify({
    removed: { diagnostics: oldDiagnosticIds.length, plans: oldPlanIds.length, planningThreads: oldPlanningThreadIds.length },
    created: { diagnosticId: newestDiagnostic.id, planId: result.planId, threadId, tasks: newPlan.tasks.length, messages: simulatedMessages.length },
    company: { id: verification.id, name: verification.name },
  }, null, 2));
}

main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
