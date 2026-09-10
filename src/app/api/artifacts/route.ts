import { requireAuth } from "@/server/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/server/ai/chat-generation";
import { artifactContext, artifactSelect, artifactView, validateArtifactLinks } from "@/server/artifacts";
import { generateCanvas } from "@/server/ai/artifact-agent";
import { attachmentType, MAX_FILE_BYTES } from "@/server/artifact-files";
import { findDuplicateUpload, findReusableCanvas } from "@/server/artifact-deduplication";
export const runtime = "nodejs";
export const maxDuration = 150;
const scopeSchema = z.object({ taskId: z.string().min(1).max(200).optional(), threadId: z.string().min(1).max(200).optional() });

export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const scope = scopeSchema.safeParse(query);
  if (!scope.success) return Response.json({ error: "Contexto inválido." }, { status: 400 });
  const artifacts = await prisma.workspaceArtifact.findMany({ where: { companyId: (await requireAuth()).companyId, ...scope.data }, select: artifactSelect, orderBy: { updatedAt: "desc" }, take: 100 });
  const tasks = await prisma.task.findMany({ where: { companyId: (await requireAuth()).companyId, actionPlan: { status: { in: ["ACTIVE", "DRAFT"] } } }, select: { id: true, title: true }, orderBy: { sortOrder: "asc" } });
  return Response.json({ artifacts: artifacts.map(artifactView), tasks });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem não permitida." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 65536) return Response.json({ error: "Envie até 5 MB." }, { status: 413 });
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const scope = scopeSchema.parse({ taskId: form.get("taskId") || undefined, threadId: form.get("threadId") || undefined });
      if (!scope.taskId) return Response.json({ error: "Selecione a tarefa antes de anexar." }, { status: 400 });
      await validateArtifactLinks(scope.taskId, scope.threadId);
      const file = form.get("file");
      if (!(file instanceof File) || file.size > MAX_FILE_BYTES) return Response.json({ error: "Envie um arquivo de até 5 MB." }, { status: 400 });
      const bytes = Buffer.from(await file.arrayBuffer());
      const mimeType = attachmentType(file.name, bytes);
      const originalName = file.name.replace(/[\\/\r\n\u0000-\u001f]/g, "_").slice(0, 180);
      const duplicate = await findDuplicateUpload({ taskId: scope.taskId, originalName, bytes });
      if (duplicate) {
        const artifact = await prisma.workspaceArtifact.findUniqueOrThrow({ where: { id: duplicate.id }, select: artifactSelect });
        return Response.json({ artifact: artifactView(artifact), reused: true });
      }
      const artifact = await prisma.workspaceArtifact.create({ data: { companyId: (await requireAuth()).companyId, ...scope, kind: "UPLOAD", title: originalName, originalName, mimeType, fileData: bytes }, select: artifactSelect });
      return Response.json({ artifact: artifactView(artifact) }, { status: 201 });
    }
    const body = scopeSchema.extend({ prompt: z.string().trim().min(1).max(2000) }).parse(await request.json());
    const context = await artifactContext(body.taskId, body.threadId);
    const content = await generateCanvas(body.prompt, context, AbortSignal.any([request.signal, AbortSignal.timeout(120000)]));
    const duplicate = await findReusableCanvas({ companyId: (await requireAuth()).companyId, title: content.title, kind: content.kind, taskId: body.taskId, threadId: body.threadId });
    if (duplicate) {
      const artifact = await prisma.workspaceArtifact.findUniqueOrThrow({ where: { id: duplicate.id }, select: artifactSelect });
      return Response.json({ artifact: artifactView(artifact), reused: true });
    }
    const artifact = await prisma.workspaceArtifact.create({ data: { companyId: (await requireAuth()).companyId, taskId: body.taskId, threadId: body.threadId, kind: content.kind, title: content.title, content }, select: artifactSelect });
    return Response.json({ artifact: artifactView(artifact) }, { status: 201 });
  } catch (e) {
    console.error("Artifact create:", e instanceof Error ? e.name : "error");
    return Response.json({ error: "Não foi possível criar. Confira o formato e tamanho do arquivo ou tente gerar novamente." }, { status: 400 });
  }
}
