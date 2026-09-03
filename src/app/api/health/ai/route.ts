import { env, integrationStatus } from "@/lib/env";
import { DEFAULT_OPENAI_MODEL } from "@/server/ai/consultant-agent";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = integrationStatus.openai;

  return Response.json(
    {
      status: configured ? "ok" : "degraded",
      provider: "openai",
      configured,
      model: env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    },
    { status: configured ? 200 : 503 },
  );
}


