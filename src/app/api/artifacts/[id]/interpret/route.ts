import { requireAuth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/server/ai/chat-generation";
import { artifactContext, artifactSelect, artifactView } from "@/server/artifacts";
import { interpretArtifact } from "@/server/ai/artifact-agent";
import { extractAttachment } from "@/server/artifact-files";
import { validateCanvas } from "@/core/workspace-artifacts";
export const maxDuration = 150;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const { id } = await params;
  const row = await prisma.workspaceArtifact.findFirst({ where: { id, companyId: (await requireAuth()).companyId } });
  if (!row) return new Response(null, { status: 404 });
  try {
    if (!row.taskId) return Response.json({ error: "Vincule a uma tarefa antes de interpretar." }, { status: 400 });
    let source;
    if (row.kind === "UPLOAD") source = await extractAttachment(row.originalName!, Buffer.from(row.fileData!));
    else {
      const canvas = validateCanvas(row.content);
      if (canvas.kind === "SPREADSHEET" && !canvas.rows.some(r => r.some(v => v.trim()))) return Response.json({ error: "Preencha e salve a planilha primeiro. O exemplo não conta como resultado." }, { status: 400 });
      source = { text: JSON.stringify({ ...canvas, example: [], note: "Linhas numeradas a partir de 1; example removido por não ser dado real." }), image: undefined };
    }
    const interpretation = await interpretArtifact(await artifactContext(row.taskId), source.text, source.image);
    const changed = await prisma.workspaceArtifact.updateMany({ where: { id, companyId: (await requireAuth()).companyId, revision: row.revision }, data: { interpretation, confirmedAt: null, revision: { increment: 1 } } });
    if (!changed.count) return Response.json({ error: "O arquivo mudou durante a leitura. Tente novamente com a versão atual." }, { status: 409 });
    return Response.json({ artifact: artifactView(await prisma.workspaceArtifact.findUniqueOrThrow({ where: { id }, select: artifactSelect })) });
  } catch (e) {
    console.error("Artifact interpretation:", e instanceof Error ? e.name : "error");
    return Response.json({ error: "Não foi possível ler. Use até 500 linhas e 30 colunas, uma foto legível ou um documento menor. O original continua salvo; você pode tentar novamente." }, { status: 400 });
  }
}
