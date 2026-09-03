"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEV_COMPANY_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2),
  sector: z.string().trim().min(2),
  productionType: z.string().trim().min(2),
  teamSize: z.coerce.number().int().min(1),
  monthlyRevenueRange: z.string().trim().min(2),
  monthlyOrderVolume: z.string().trim().min(2),
  onTimeDeliveryRange: z.string().trim().min(2),
  reworkRange: z.string().trim().min(2),
  ownerDependency: z.string().trim().min(2),
  mainGoal: z.string().trim().min(2),
  biggestChallenge: z.string().trim().max(2_000).optional().default(""),
  productionStages: z.string().trim().max(2_000).optional().default(""),
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function updateCompanyProfile(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/empresa?error=Revise+os+campos+obrigatérios");
  }
  const data = parsed.data;
  const current = await prisma.company.findUniqueOrThrow({
    where: { id: DEV_COMPANY_ID },
    select: { onboardingData: true },
  });
  const previous = asRecord(current.onboardingData);
  const productionStages = data.productionStages
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const onboardingData = {
    ...previous,
    monthlyRevenueRange: data.monthlyRevenueRange,
    monthlyOrderVolume: data.monthlyOrderVolume,
    onTimeDeliveryRange: data.onTimeDeliveryRange,
    reworkRange: data.reworkRange,
    ownerDependency: data.ownerDependency,
    mainGoal: data.mainGoal,
    biggestChallenge: data.biggestChallenge,
    productionStages,
  };
  const content = [
    `Setor: ${data.sector}.`,
    `Produção: ${data.productionType}.`,
    `Equipe: ${data.teamSize} pessoas.`,
    `Faturamento mensal: ${data.monthlyRevenueRange}.`,
    `Pedidos por mês: ${data.monthlyOrderVolume}.`,
    `Entregas: ${data.onTimeDeliveryRange}.`,
    `Retrabalho: ${data.reworkRange}.`,
    `Dependência do dono: ${data.ownerDependency}.`,
    `Objetivo de 90 dias: ${data.mainGoal}.`,
    data.biggestChallenge
      ? `Observação do gestor: ${data.biggestChallenge}.`
      : "",
    productionStages.length > 0
      ? `Etapas produtivas: ${productionStages.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  await prisma.$transaction(async (transaction) => {
    await transaction.company.update({
      where: { id: DEV_COMPANY_ID },
      data: {
        name: data.name,
        sector: data.sector,
        productionType: data.productionType,
        teamSize: data.teamSize,
        onboardingStatus: "COMPLETED",
        onboardingData,
      },
    });
    const memory = await transaction.companyMemory.findFirst({
      where: {
        companyId: DEV_COMPANY_ID,
        sourceType: "ONBOARDING",
        sourceId: "company-profile",
        invalidatedAt: null,
      },
    });
    if (memory) {
      await transaction.companyMemory.update({
        where: { id: memory.id },
        data: { title: "Contexto da empresa", content, confidence: 1 },
      });
    } else {
      await transaction.companyMemory.create({
        data: {
          companyId: DEV_COMPANY_ID,
          kind: "FACT",
          sourceType: "ONBOARDING",
          sourceId: "company-profile",
          title: "Contexto da empresa",
          content,
          confidence: 1,
        },
      });
    }
  });

  revalidatePath("/empresa");
  revalidatePath("/dashboard");
  revalidatePath("/memoria");
  revalidatePath("/assistente");
  redirect("/empresa?saved=1");
}


