import type { Metadata } from "next";
import { randomInt } from "node:crypto";
import { integrationStatus } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";
import {
  deleteConversation,
  renameConversation,
  startNewConversation,
} from "@/app/(product)/assistente/actions";
import { AssistantChat } from "@/components/assistant-chat";
import { readWorkshop } from "@/core/coo-workshop";
import { activeGeneration } from "@/server/ai/chat-generation";
import { asDiagnosticRecord } from "@/core/diagnostic-history";

export const metadata: Metadata = { title: "COO" };
export const dynamic = "force-dynamic";

function shortTitle(value: string, max = 42) {
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{
    pergunta?: string;
    diagnostico?: string;
    error?: string;
    sent?: string;
    chat?: string;
  }>;
}) {
  const company = await getDevCompany();
  const params = await searchParams;

  const [threads, diagnostic, plan, selectedDiagnostic] = await Promise.all([
    prisma.conversationThread.findMany({
      where: { companyId: company.id, messages: { some: {} } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.diagnosticSession.findFirst({
      where: { companyId: company.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.actionPlan.findFirst({
      where: { companyId: company.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { tasks: true },
    }),
    params.diagnostico
      ? prisma.diagnosticSession.findFirst({
          where: {
            id: params.diagnostico,
            companyId: company.id,
            status: "COMPLETED",
          },
          select: {
            id: true,
            title: true,
            resultSummary: true,
            template: { select: { domain: true } },
          },
        })
      : null,
  ]);

  const selectedThreadId = params.chat && threads.some((item) => item.id === params.chat) ? params.chat : null;
  const thread = selectedThreadId
    ? await prisma.conversationThread.findFirst({
        where: { id: selectedThreadId, companyId: company.id },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 80 } },
      })
    : null;

  const messages = [...(thread?.messages ?? [])].reverse().filter(
    (message, index, all) =>
      index === 0 ||
      message.role !== all[index - 1]?.role ||
      message.content !== all[index - 1]?.content,
  );
  const initialQuestion =
    params.pergunta ??
    (selectedDiagnostic
      ? `Quero investigar o diagnóstico “${selectedDiagnostic.title ?? selectedDiagnostic.id}”. Explique quais evidências devo reunir agora e qual é o menor próximo passo, sem assumir uma causa que ainda não foi comprovada.`
      : "");
  const currentTask = plan?.tasks
    .filter((task) => !["DONE", "CANCELLED"].includes(task.status))
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const taskOptions = currentTask
    ? [
        `Continuar: ${shortTitle(currentTask.title)}`,
        `Revisar a tarefa: ${shortTitle(currentTask.title)}`,
        `Destravar: ${shortTitle(currentTask.title)}`,
      ]
    : ["Escolher uma ação simples para hoje", "Encontrar um ganho rápido", "Definir o próximo passo"];
  const planOptions = plan
    ? ["Revisar o plano atual", "Escolher a ação de hoje", "Ver o que está atrasado no plano"]
    : ["Criar um plano simples", "Organizar uma nova ação", "Transformar um problema em ação"];
  const contextOptions = diagnostic
    ? ["Revisar o diagnóstico", "Checar se o gargalo mudou", "Encontrar uma nova oportunidade"]
    : threads[0]
      ? [`Retomar: ${shortTitle(threads[0].title)}`, "Revisar a última conversa", "Ver o que ficou pendente"]
      : ["Entender onde estou travando", "Encontrar o principal gargalo", "Começar um diagnóstico rápido"];
  const suggestionGroups = [
    { kind: "task" as const, label: taskOptions[randomInt(taskOptions.length)] },
    { kind: "review" as const, label: planOptions[randomInt(planOptions.length)] },
    { kind: "diagnostic" as const, label: contextOptions[randomInt(contextOptions.length)] },
  ];
  const rotation = randomInt(suggestionGroups.length);
  const suggestions = suggestionGroups.map((_, index) => suggestionGroups[(index + rotation) % suggestionGroups.length]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white">
        <AssistantChat
          key={thread?.id ?? "new-conversation"}
          messages={messages.map((message) => ({ id: message.id, role: message.role, content: message.content + (asDiagnosticRecord(message.metadata).interrupted ? "\n\n[Resposta interrompida]" : asDiagnosticRecord(message.metadata).failed ? "\n\n[Resposta não concluída]" : "") }))}
          threads={threads.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt.toISOString() }))}
          currentThreadId={thread?.id ?? "new"}
          initialWorkshop={readWorkshop(thread?.workflowState)}
          initialGenerationId={activeGeneration(thread?.generationId ?? null, thread?.generationStartedAt ?? null)}
          deleteAction={deleteConversation}
          renameAction={renameConversation}
          newChatAction={startNewConversation}
          disabled={!integrationStatus.openai}
          defaultValue={initialQuestion}
          companyName={company.name}
          hasDiagnostic={Boolean(diagnostic)}
          hasPlan={Boolean(plan)}
          suggestions={suggestions}
          error={params.error}
        />
    </div>
  );
}









