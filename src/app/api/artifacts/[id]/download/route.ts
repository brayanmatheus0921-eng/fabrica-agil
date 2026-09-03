import { prisma } from "@/lib/prisma";
import { DEV_COMPANY_ID } from "@/core/development";
import { validateCanvas } from "@/core/workspace-artifacts";
import { exportCanvas } from "@/server/artifact-files";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.workspaceArtifact.findFirst({ where: { id, companyId: DEV_COMPANY_ID } });
  if (!row) return new Response(null, { status: 404 });
  try {
    const format = new URL(request.url).searchParams.get("format") ?? "original";
    const output = format === "original" && row.fileData ? { data: Buffer.from(row.fileData), mime: row.mimeType ?? "application/octet-stream" } : await exportCanvas(validateCanvas(row.content), format);
    const name = format === "original" ? row.originalName! : `${row.title}.${format}`;
    return new Response(new Uint8Array(output.data), { headers: { "Content-Type": output.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Não foi possível exportar neste formato." }, { status: 400 }); }
}
