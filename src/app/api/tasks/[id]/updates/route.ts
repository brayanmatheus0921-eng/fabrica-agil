import { requireAuth } from "@/server/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/server/ai/chat-generation";
import { taskNoteSchema } from "@/core/workspace-artifacts";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const body = taskNoteSchema.extend({ requestId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Escreva um registro de até 5.000 caracteres." }, { status: 400 });
  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, companyId: (await requireAuth()).companyId }, include: { actionPlan: true } });
  if (!task) return new Response(null, { status: 404 });
  if (task.actionPlan.status !== "ACTIVE" && body.data.category !== "CONTEXT") return Response.json({ error: "Aprove o plano antes de registrar a execução." }, { status: 400 });
  const { requestId, ...metadata } = body.data;
  const key = `task-update-${id}-${requestId}`;
  const note = await prisma.evidenceOutput.upsert({ where: { id: key }, update: {}, create: { id: key, companyId: (await requireAuth()).companyId, taskId: id, type: "NOTE", label: metadata.category, textValue: metadata.text, metadata } });
  return Response.json({ note: { id: note.id, text: note.textValue, category: metadata.category, at: note.createdAt.toISOString() } });
}
