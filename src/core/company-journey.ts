import type { WorkshopStage } from "./coo-workshop";

export type CompanyJourneyInput = {
  onboardingComplete: boolean;
  profileComplete: boolean;
  diagnosticId: string | null;
  workshop: { threadId: string; stage: WorkshopStage } | null;
  activePlan: { id: string; nextTaskId: string | null; taskCount: number; completedTasks: number } | null;
};

export type CompanyJourneyStep = {
  kind: "PROFILE" | "DIAGNOSTIC" | "RESULT" | "PLANNING" | "EXECUTION" | "FOLLOW_UP";
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

export function resolveCompanyJourney(input: CompanyJourneyInput): CompanyJourneyStep {
  if (!input.onboardingComplete && !input.diagnosticId) {
    return input.profileComplete
      ? { kind: "DIAGNOSTIC", eyebrow: "Faça isso agora", title: "Descubra onde a operação está travando", description: "Responda uma pergunta por vez. Ao terminar, você verá o resultado e seguirá para o plano.", href: "/diagnostico/novo", label: "Continuar diagnóstico" }
      : { kind: "PROFILE", eyebrow: "Faça isso agora", title: "Conte como sua fábrica funciona", description: "São respostas rápidas para o COO entender sua empresa antes do diagnóstico.", href: "/onboarding", label: "Completar cadastro" };
  }
  if (!input.diagnosticId) {
    return { kind: "DIAGNOSTIC", eyebrow: "Faça isso agora", title: "Descubra onde a operação está travando", description: "Responda uma pergunta por vez. Ao terminar, você verá o resultado e seguirá para o plano.", href: "/diagnostico/novo", label: "Iniciar diagnóstico" };
  }
  if (input.activePlan) {
    if (input.activePlan.nextTaskId) return { kind: "EXECUTION", eyebrow: "Faça isso agora", title: "Execute a próxima tarefa do plano", description: "Abra a tarefa para ver as instruções e registrar o que aconteceu.", href: `/tarefas/${input.activePlan.nextTaskId}`, label: "Abrir próxima tarefa" };
    return { kind: "FOLLOW_UP", eyebrow: "Faça isso agora", title: "Conte ao COO o resultado da execução", description: "O COO compara os registros com o diagnóstico e atualiza o acompanhamento com sua aprovação.", href: "/assistente", label: "Falar com o COO" };
  }
  if (input.workshop && input.workshop.stage !== "FOLLOW_UP") {
    return { kind: "PLANNING", eyebrow: "Faça isso agora", title: "Termine seu plano de ação", description: "Responda somente a próxima pergunta no espaço exclusivo do plano. O planejador organizará de 3 a 5 iniciativas antes de pedir sua aprovação.", href: `/plano-de-acao/construir?chat=${input.workshop.threadId}`, label: "Continuar meu plano" };
  }
  return { kind: "RESULT", eyebrow: "Diagnóstico concluído", title: "Transforme o resultado em um plano", description: "Abra a área de planos, escolha este diagnóstico e defina responsáveis, prazo, capacidade e recursos. Nenhuma tarefa será criada antes da aprovação completa.", href: "/plano-de-acao", label: "Abrir planos" };
}
