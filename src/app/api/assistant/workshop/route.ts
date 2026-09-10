import { requireAuth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { readWorkshop, revisitWorkshop, type WorkshopStage } from "@/core/coo-workshop";
import { sameOrigin } from "@/server/ai/chat-generation";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const { threadId, stage } = await request.json();
    const state = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ConversationThread" WHERE id = ${String(threadId)} FOR UPDATE`;
      const thread = await tx.conversationThread.findFirst({ where: { id: String(threadId), companyId: (await requireAuth()).companyId } });
      const current = readWorkshop(thread?.workflowState);
      if (!thread || !current || thread.generationId) throw new Error("Aguarde a resposta terminar.");
      const updated = revisitWorkshop(current, stage as WorkshopStage);
      await tx.conversationThread.update({ where: { id: thread.id }, data: { workflowState: updated as never } });
      return updated;
    });
    return Response.json({ state });
  } catch { return Response.json({ error: "Não foi possível reabrir esta etapa agora." }, { status: 409 }); }
}
