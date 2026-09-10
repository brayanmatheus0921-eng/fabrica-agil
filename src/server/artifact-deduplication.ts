import { requireAuth } from "@/server/auth";
import "server-only";

import type { CanvasContent } from "@/core/workspace-artifacts";
import { prisma } from "@/lib/prisma";

function normalizedTitle(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export async function findReusableCanvas({
  companyId,
  title,
  kind,
  taskId,
  threadId,
}: {
  companyId: string;
  title: string;
  kind: CanvasContent["kind"];
  taskId?: string | null;
  threadId?: string | null;
}) {
  const candidates = await prisma.workspaceArtifact.findMany({
    where: {
      companyId,
      kind,
      ...(taskId ? { taskId } : threadId ? { threadId, taskId: null } : { taskId: null, threadId: null }),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true },
  });
  const wanted = normalizedTitle(title);
  return candidates.find((artifact) => normalizedTitle(artifact.title) === wanted) ?? null;
}

export async function findDuplicateUpload({
  taskId,
  originalName,
  bytes,
}: {
  taskId: string;
  originalName: string;
  bytes: Buffer;
}) {
  const candidates = await prisma.workspaceArtifact.findMany({
    where: { companyId: (await requireAuth()).companyId, taskId, kind: "UPLOAD", originalName },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, fileData: true },
  });
  return candidates.find((artifact) => artifact.fileData && Buffer.from(artifact.fileData).equals(bytes)) ?? null;
}
