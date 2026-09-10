import { requireAuth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generations, sameOrigin } from "@/server/ai/chat-generation";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const parsed = z.object({ requestId: z.string().uuid(), threadId: z.string().min(1), message: z.string().max(6000).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const { requestId, threadId, message } = parsed.data;
  const thread = await prisma.conversationThread.findFirst({ where: { id: threadId, companyId: (await requireAuth()).companyId } });
  if (thread) {
    // Stopping during upload must not lose the user's message. The stable id also
    // prevents a delayed original request from starting generation afterwards.
    if (message?.trim()) await prisma.conversationMessage.upsert({ where: { id: `user-${requestId}` }, update: {}, create: { id: `user-${requestId}`, threadId, authorUserId: (await requireAuth()).userId, role: "USER", content: message.trim() } });
    generations.get(requestId)?.abort();
    await prisma.conversationThread.updateMany({ where: { id: threadId, generationId: requestId }, data: { generationId: null, generationStartedAt: null } });
  }
  return Response.json({ stopped: true });
}
