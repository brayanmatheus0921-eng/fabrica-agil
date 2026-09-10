import { requireAuth } from "@/server/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/server/ai/chat-generation";
import { artifactSelect, artifactView, validateArtifactLinks } from "@/server/artifacts";
import { interpretationSchema, validateCanvas } from "@/core/workspace-artifacts";
import { Prisma } from "@/generated/prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const { id } = await params;
    const body = z.object({ revision: z.number().int().positive(), intent: z.enum(["SAVE", "CONFIRM", "LINK"]), content: z.unknown().optional(), interpretation: z.unknown().optional(), taskId: z.string().min(1).max(200).optional() }).parse(await request.json());
    const existing = await prisma.workspaceArtifact.findFirst({ where: { id, companyId: (await requireAuth()).companyId }, select: artifactSelect });
    if (!existing) return new Response(null, { status: 404 });
    const data: Record<string, unknown> = { revision: { increment: 1 } };
    if (body.intent === "SAVE") {
      if (existing.kind === "UPLOAD") throw new Error("Arquivo original não pode ser alterado.");
      const content = validateCanvas(body.content);
      if (content.kind !== existing.kind) throw new Error("Formato não pode mudar.");
      Object.assign(data, { title: content.title, content, confirmedAt: null, interpretation: Prisma.JsonNull });
    } else if (body.intent === "LINK") {
      if (!body.taskId) throw new Error("Selecione uma tarefa.");
      await validateArtifactLinks(body.taskId); data.taskId = body.taskId;
    } else {
      if (!existing.interpretation || !existing.taskId) throw new Error("Interprete e vincule a uma tarefa antes de confirmar.");
      Object.assign(data, { interpretation: interpretationSchema.parse(body.interpretation), confirmedAt: new Date() });
    }
    const updated = await prisma.workspaceArtifact.updateMany({ where: { id, companyId: (await requireAuth()).companyId, revision: body.revision }, data });
    if (!updated.count) return Response.json({ error: "Outra alteração foi salva. Reabra o Canvas para carregar a versão atual; sua edição não foi sobrescrita." }, { status: 409 });
    return Response.json({ artifact: artifactView(await prisma.workspaceArtifact.findUniqueOrThrow({ where: { id }, select: artifactSelect })) });
  } catch { return Response.json({ error: "Confira os campos. Não foi possível salvar." }, { status: 400 }); }
}
