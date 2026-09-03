"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COMPANY_ID } from "@/core/development";
import type { OnboardingFormState } from "@/core/onboarding";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  sector: z.string().trim().min(2, "Informe o setor"),
  productionType: z.string().trim().min(2, "Informe o tipo de produção"),
  teamSize: z.coerce
    .number({ error: "Informe a quantidade de pessoas" })
    .int("Use um número inteiro")
    .min(1, "A equipe deve ter pelo menos uma pessoa")
    .max(10000, "Quantidade de pessoas inválida"),
  biggestChallenge: z
    .string()
    .trim()
    .min(5, "Descreva brevemente o maior problema atual"),
  mainGoal: z
    .string()
    .trim()
    .min(5, "Descreva o principal resultado desejado"),
  productionStages: z
    .string()
    .trim()
    .min(3, "Informe pelo menos uma etapa produtiva"),
});

export async function saveOnboarding(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const result = onboardingSchema.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector"),
    productionType: formData.get("productionType"),
    teamSize: formData.get("teamSize"),
    biggestChallenge: formData.get("biggestChallenge"),
    mainGoal: formData.get("mainGoal"),
    productionStages: formData.get("productionStages"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Revise os campos indicados.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;
  const productionStages = data.productionStages
    .split(/[\n,;]+/)
    .map((stage) => stage.trim())
    .filter(Boolean);

  await prisma.$transaction(async (transaction) => {
    await transaction.company.update({
      where: { id: DEV_COMPANY_ID },
      data: {
        name: data.name,
        sector: data.sector,
        productionType: data.productionType,
        teamSize: data.teamSize,
        onboardingStatus: "COMPLETED",
        onboardingData: {
          biggestChallenge: data.biggestChallenge,
          mainGoal: data.mainGoal,
          productionStages,
        },
      },
    });

    const existingMemory = await transaction.companyMemory.findFirst({
      where: {
        companyId: DEV_COMPANY_ID,
        sourceType: "ONBOARDING",
        sourceId: "company-profile",
        invalidatedAt: null,
      },
      select: { id: true },
    });

    const memoryData = {
      title: "Contexto inicial da empresa",
      content: [
        `Setor: ${data.sector}.`,
        `Produção: ${data.productionType}.`,
        `Equipe: ${data.teamSize} pessoas.`,
        `Maior desafio informado: ${data.biggestChallenge}.`,
        `Objetivo principal: ${data.mainGoal}.`,
        `Etapas produtivas: ${productionStages.join(", ")}.`,
      ].join(" "),
      confidence: 1,
    };

    if (existingMemory) {
      await transaction.companyMemory.update({
        where: { id: existingMemory.id },
        data: memoryData,
      });
    } else {
      await transaction.companyMemory.create({
        data: {
          companyId: DEV_COMPANY_ID,
          kind: "FACT",
          sourceType: "ONBOARDING",
          sourceId: "company-profile",
          ...memoryData,
        },
      });
    }
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/memoria");
  redirect("/diagnostico");
}


