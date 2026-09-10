import { requireAuth } from "@/server/auth";
import "server-only";
import { prisma } from "@/lib/prisma";
import { canvasSchema, interpretationSchema, type ArtifactView } from "@/core/workspace-artifacts";

export const artifactSelect = { id: true, taskId: true, threadId: true, title: true, kind: true, content: true, interpretation: true, originalName: true, confirmedAt: true, revision: true, updatedAt: true } as const;
export function artifactView(row: { id: string; taskId: string | null; threadId: string | null; title: string; kind: string; content: unknown; interpretation: unknown; originalName: string | null; confirmedAt: Date | null; revision: number; updatedAt: Date }): ArtifactView {
  return { ...row, content: canvasSchema.safeParse(row.content).data ?? null, interpretation: interpretationSchema.safeParse(row.interpretation).data ?? null, confirmedAt: row.confirmedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() };
}
export async function validateArtifactLinks(taskId?: string | null, threadId?: string | null) {
  if (taskId && !await prisma.task.findFirst({ where: { id: taskId, companyId: (await requireAuth()).companyId } })) throw new Error("Tarefa não encontrada.");
  if (threadId && !await prisma.conversationThread.findFirst({ where: { id: threadId, companyId: (await requireAuth()).companyId } })) throw new Error("Conversa não encontrada.");
}
export async function artifactContext(taskId?: string | null, threadId?: string | null) {
  await validateArtifactLinks(taskId, threadId);
  const task = taskId ? await prisma.task.findFirst({ where: { id: taskId, companyId: (await requireAuth()).companyId }, select: { title: true, description: true, expectedOutput: true, executionGuide: true } }) : null;
  const messages = threadId ? await prisma.conversationMessage.findMany({ where: { threadId }, orderBy: { createdAt: "desc" }, take: 8, select: { role: true, content: true } }) : [];
  return { task, messages: messages.reverse() };
}
