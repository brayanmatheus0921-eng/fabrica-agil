import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { decideAction, proposalView } from "@/server/coo/action-service";
import { readWorkshop } from "@/core/coo-workshop";
import { readConversationMemory } from "@/core/conversation-memory";
import { sameOrigin } from "@/server/ai/chat-generation";
const input = z.object({ id:z.string().min(1), decision:z.enum(["approve","reject"]) }).strict();
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return Response.json({error:"Entre novamente para continuar."},{status:401});
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return Response.json({error:"Conversa inválida."},{status:400});
  const proposals = await prisma.cooActionProposal.findMany({where:{companyId:auth.companyId,threadId,proposedByUserId:auth.userId},orderBy:{createdAt:"desc"},take:100});
  const thread = await prisma.conversationThread.findFirst({where:{id:threadId,companyId:auth.companyId},select:{workflowState:true,conversationMemory:true,kind:true}});
  return Response.json({proposals:proposals.reverse().map(proposalView),workshop:thread?.kind === "PLAN" ? readWorkshop(thread.workflowState) : null,memory:readConversationMemory(thread?.conversationMemory,thread?.kind ?? "COO")}, {headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !sameOrigin(request)) return Response.json({error:"Origem inválida."},{status:403});
  const auth = await getAuthContext();
  if (!auth) return Response.json({error:"Entre novamente para continuar."},{status:401});
  const parsed = input.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return Response.json({error:"Decisão inválida."},{status:400});
  try {
    const p = await prisma.$transaction(tx=>decideAction(tx,auth,parsed.data.id,parsed.data.decision), {isolationLevel:"Serializable",timeout:20000});
    if (p.status === "APPLIED") {
      for (const path of ["/dashboard","/tarefas","/plano-de-acao","/acompanhamento","/empresa","/memoria","/assistente"]) revalidatePath(path);
      revalidatePath("/tarefas/[id]","page");
    }
    return Response.json({proposal:proposalView(p)});
  } catch (e) {
    const concurrent = e && typeof e === "object" && "code" in e && e.code === "P2034";
    return Response.json({error:concurrent?"Os dados mudaram durante a aprovação. Confira e tente novamente.":e instanceof Error && !('code' in e)?e.message:"Não foi possível aplicar. Nenhuma alteração parcial foi salva."},{status:409});
  }
}
