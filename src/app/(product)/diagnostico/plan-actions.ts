"use server";
import { requireAuth } from "@/server/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { newWorkshop } from "@/core/coo-workshop";
import { asDiagnosticRecord } from "@/core/diagnostic-history";
import { planThreadId } from "@/core/plan-thread";

export async function generateDiagnosticPlan(_state: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const diagnosis = await prisma.diagnosticSession.findFirst({ where: { id: String(form.get("sessionId")), companyId: (await requireAuth()).companyId, status: "COMPLETED" } });
  if (!diagnosis) return { error: "Escolha um diagnóstico concluído." };
  // Planning has its own thread. Legacy COO conversations may contain tools or
  // partial preparation steps and must never be reused as a plan workspace.
  const id = planThreadId(diagnosis.id);
  const snapshot = asDiagnosticRecord(diagnosis.resultSnapshot);
  const themes = Array.isArray(snapshot.themes) ? snapshot.themes.map(asDiagnosticRecord).filter(t => typeof t.priorityOrder === "number").sort((a,b) => Number(a.priorityOrder)-Number(b.priorityOrder)) : [];
  const first = themes[0];
  const introduction = first
    ? `Esta conversa existe somente para concluir seu plano de ação. Não criaremos ferramentas nem tarefas antes da aprovação do conjunto completo.\n\nA matriz deste diagnóstico colocou ${String(first.theme)} como o primeiro ponto de atenção, com ${Number(first.performanceScore)}/100. Isso vem das suas respostas: ${String(first.scoreReason)}\n\nEssa área ainda é o que mais atrapalha sua fábrica hoje?`
    : "Esta conversa existe somente para concluir seu plano de ação. Não criaremos ferramentas nem tarefas antes da aprovação do conjunto completo.\n\nUsando o diagnóstico como base, o que mais está atrapalhando a produção hoje?";
  await prisma.conversationThread.upsert({ where: { id }, update: {}, create: {
    id, companyId: (await requireAuth()).companyId, title: `Plano de ação · ${diagnosis.title ?? "Diagnóstico operacional"}`,
    workflowState: newWorkshop(diagnosis.id, diagnosis.title ?? "Diagnóstico operacional") as never,
    messages: { create: { role: "ASSISTANT", content: introduction } },
  } });
  redirect(`/plano-de-acao/construir?chat=${id}`);
}
