import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingIncludes: { "/api/assistant/chat": ["./docs/ai/skills/coo-plano-colaborativo/SKILL.md"] },
};

export default nextConfig;
