import "server-only";

import { z } from "zod";

const optionalEnvironmentValue = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL não configurada")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL precisa usar PostgreSQL",
    ),
  OPENAI_API_KEY: optionalEnvironmentValue,
  OPENAI_MODEL: optionalEnvironmentValue,
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
});

export const integrationStatus = {
  database: true,
  openai: Boolean(env.OPENAI_API_KEY),
} as const;



