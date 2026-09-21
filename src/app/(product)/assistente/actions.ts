"use server";
import { requireAuth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { conversationPath } from "@/core/plan-thread";
import { readWorkshop } from "@/core/coo-workshop";
export async function startNewConversation() {
  redirect("/assistente");
}
export async function renameConversation(formData: FormData) {
  const parsed = z.object({
    threadId: z.string().min(1),
    title: z.string().trim().min(1).max(72),
  }).safeParse({ threadId: formData.get("threadId"), title: formData.get("title") });
  if (!parsed.success) redirect("/assistente?error=Informe+um+nome+válido");
  const thread = await prisma.conversationThread.findFirst({ where: { id: parsed.data.threadId, companyId: (await requireAuth()).companyId }, select: { kind: true } });
  if (!thread) redirect("/assistente?error=Conversa+não+encontrada");
  const destination = conversationPath(thread.kind, parsed.data.threadId);
  const renamed = await prisma.conversationThread.updateMany({
    where: { id: parsed.data.threadId, companyId: (await requireAuth()).companyId, generationId: null },
    data: { title: parsed.data.title },
  });
  if (!renamed.count) redirect(`${destination}&error=Não+foi+possível+editar+agora`);
  revalidatePath("/assistente");
  revalidatePath("/plano-de-acao/construir");
  revalidatePath("/plano-de-acao");
  redirect(destination);
}
export async function deleteConversation(formData: FormData) {
  const threadId = z.string().min(1).safeParse(formData.get("threadId"));
  if (!threadId.success) redirect("/assistente?error=Conversa+inválida");
  const thread = await prisma.conversationThread.findFirst({ where: { id: threadId.data, companyId: (await requireAuth()).companyId } });
  if (readWorkshop(thread?.workflowState)?.planId) redirect(`${conversationPath(thread?.kind ?? "COO", threadId.data)}&error=Esta+conversa+guarda+as+decisões+do+plano.+Para+limpar+o+ciclo,+exclua+o+diagnóstico+correspondente.`);
  await prisma.conversationThread.deleteMany({ where: { id: threadId.data, companyId: (await requireAuth()).companyId, generationId: null } });
  revalidatePath("/assistente"); revalidatePath("/plano-de-acao"); revalidatePath("/plano-de-acao/construir"); redirect(conversationPath(thread?.kind ?? "COO"));
}
