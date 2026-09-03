import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "reachable",
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";

    return Response.json(
      {
        status: "error",
        database: "unreachable",
        errorType,
      },
      { status: 503 },
    );
  }
}


