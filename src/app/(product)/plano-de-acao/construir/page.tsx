import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat";
import { asDiagnosticRecord } from "@/core/diagnostic-history";
import { readWorkshop } from "@/core/coo-workshop";
import { readConversationMemory } from "@/core/conversation-memory";
import { integrationStatus } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { activeGeneration } from "@/server/ai/chat-generation";
import { getDevCompany } from "@/server/dev-company";
import { deleteConversation, renameConversation, startNewConversation } from "@/app/(product)/assistente/actions";

export const metadata: Metadata = { title: "Construir plano de ação" };
export const dynamic = "force-dynamic";

export default async function BuildActionPlanPage({ searchParams }: { searchParams: Promise<{ chat?: string; error?: string }> }) {
  const company = await getDevCompany();
  const params = await searchParams;
  if (!params.chat) redirect("/plano-de-acao");

  const [threads, thread, activePlan] = await Promise.all([
    prisma.conversationThread.findMany({
      where: { companyId: company.id, kind: "PLAN", messages: { some: {} } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.conversationThread.findFirst({
      where: { id: params.chat, companyId: company.id, kind: "PLAN" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 100 } },
    }),
    prisma.actionPlan.findFirst({ where: { companyId: company.id, status: "ACTIVE" }, select: { id: true } }),
  ]);
  const workshop = readWorkshop(thread?.workflowState);
  if (!thread || !workshop) redirect("/plano-de-acao");

  const messages = [...thread.messages].reverse().filter((message, index, all) =>
    index === 0 || message.role !== all[index - 1]?.role || message.content !== all[index - 1]?.content,
  );

  return <div className="flex h-full min-h-0 overflow-hidden bg-white">
    <AssistantChat
      key={thread.id}
      messages={messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content + (asDiagnosticRecord(message.metadata).interrupted ? "\n\n[Resposta interrompida]" : asDiagnosticRecord(message.metadata).failed ? "\n\n[Resposta não concluída]" : ""),
      }))}
      threads={threads.map(item => ({ id: item.id, title: item.title, updatedAt: item.updatedAt.toISOString() }))}
      currentThreadId={thread.id}
      initialWorkshop={workshop}
      initialMemory={readConversationMemory(thread.conversationMemory, "PLAN", { workshop })}
      initialGenerationId={activeGeneration(thread.generationId, thread.generationStartedAt)}
      deleteAction={deleteConversation}
      renameAction={renameConversation}
      newChatAction={startNewConversation}
      disabled={!integrationStatus.openai}
      companyName={company.name}
      hasDiagnostic
      hasPlan={Boolean(activePlan)}
      suggestions={[]}
      error={params.error}
      planningWorkspace
    />
  </div>;
}
