"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEV_COMPANY_ID } from "@/core/development";
import { newWorkshop } from "@/core/coo-workshop";
import { asDiagnosticRecord } from "@/core/diagnostic-history";

export async function generateDiagnosticPlan(_state: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const diagnosis = await prisma.diagnosticSession.findFirst({ where: { id: String(form.get("sessionId")), companyId: DEV_COMPANY_ID, status: "COMPLETED" } });
  if (!diagnosis) return { error: "Escolha um diagnóstico concluído." };
  const id = `coo-workshop-${diagnosis.id}`;
  const snapshot = asDiagnosticRecord(diagnosis.resultSnapshot);
  const themes = Array.isArray(snapshot.themes) ? snapshot.themes.map(asDiagnosticRecord).filter(t => typeof t.priorityOrder === "number").sort((a,b) => Number(a.priorityOrder)-Number(b.priorityOrder)) : [];
  const first = themes[0];
  const introduction = first
    ? `A matriz deste diagnóstico colocou ${String(first.theme)} como o primeiro ponto de atenção, com ${Number(first.performanceScore)}/100.\n\nIsso vem das suas respostas: ${String(first.scoreReason)}\n\nVamos confirmar a situação e combinar uma prioridade principal e até duas de apoio. Depois construímos as ações; nada começa sem sua aprovação.\n\nEssa área ainda é o que mais atrapalha sua fábrica hoje?`
    : "Vamos construir seu plano juntos, usando as respostas deste diagnóstico. Primeiro entendemos o problema; depois combinamos a prioridade, as ações e como medir. Nada começa sem sua aprovação.\n\nPara começar: o que mais está atrapalhando a produção hoje?";
  await prisma.conversationThread.upsert({ where: { id }, update: {}, create: {
    id, companyId: DEV_COMPANY_ID, title: `Plano · ${diagnosis.title ?? "Diagnóstico operacional"}`,
    workflowState: newWorkshop(diagnosis.id, diagnosis.title ?? "Diagnóstico operacional") as never,
    messages: { create: { role: "ASSISTANT", content: introduction } },
  } });
  redirect(`/assistente?chat=${id}`);
}
