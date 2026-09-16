import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingIncludes: { "/api/assistant/chat": ["./docs/ai/skills/coo-plano-colaborativo/SKILL.md"] },
  typescript: {
    // O typecheck completo roda antes do deploy. No builder limitado da VPS,
    // repetir a etapa após a compilação pode ficar preso por falta de memória.
    ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === "1",
  },
};

export default nextConfig;
