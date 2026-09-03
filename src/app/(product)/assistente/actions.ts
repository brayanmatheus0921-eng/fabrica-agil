"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COMPANY_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";
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
  const renamed = await prisma.conversationThread.updateMany({
    where: { id: parsed.data.threadId, companyId: DEV_COMPANY_ID, generationId: null },
    data: { title: parsed.data.title },
  });
  if (!renamed.count) redirect(`/assistente?chat=${parsed.data.threadId}&error=Não+foi+possível+editar+agora`);
  revalidatePath("/assistente");
  redirect(`/assistente?chat=${parsed.data.threadId}`);
}
export async function deleteConversation(formData: FormData) {
  const threadId = z.string().min(1).safeParse(formData.get("threadId"));
  if (!threadId.success) redirect("/assistente?error=Conversa+inválida");
  const thread = await prisma.conversationThread.findFirst({ where: { id: threadId.data, companyId: DEV_COMPANY_ID } });
  if (readWorkshop(thread?.workflowState)?.planId) redirect(`/assistente?chat=${threadId.data}&error=Esta+conversa+guarda+as+decisões+do+plano.+Para+limpar+o+ciclo,+exclua+o+diagnóstico+correspondente.`);
  await prisma.conversationThread.deleteMany({ where: { id: threadId.data, companyId: DEV_COMPANY_ID, generationId: null } });
  revalidatePath("/assistente"); redirect("/assistente");
}
