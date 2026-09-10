"use server";

import { requireAuth } from "@/server/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  companyProfileQuestions,
  type CompanyProfileQuestionKey,
} from "@/core/company-profile";
import { prisma } from "@/lib/prisma";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildProfileMemory(
  company: {
    sector: string | null;
    productionType: string | null;
    teamSize: number | null;
    onboardingData: unknown;
  },
) {
  const data = asRecord(company.onboardingData);
  return [
    `Setor: ${company.sector ?? "Fábrica de móveis"}.`,
    `Produção: ${company.productionType ?? "não informada"}.`,
    `Equipe: ${company.teamSize ?? "não informada"} pessoas.`,
    `Faturamento mensal: ${String(data.monthlyRevenueRange ?? "não informado")}.`,
    `Pedidos por mês: ${String(data.monthlyOrderVolume ?? "não informado")}.`,
    `Entregas: ${String(data.onTimeDeliveryRange ?? "não informado")}.`,
    `Retrabalho: ${String(data.reworkRange ?? "não informado")}.`,
    `Dependência do dono: ${String(data.ownerDependency ?? "não informada")}.`,
    `Objetivo de 90 dias: ${String(data.mainGoal ?? "não informado")}.`,
  ].join(" ");
}

export async function saveOnboardingStep(formData: FormData) {
  const question = Number(formData.get("question"));
  const value = String(formData.get("value") ?? "").trim();
  if (
    !Number.isInteger(question) ||
    question < 1 ||
    question > companyProfileQuestions.length
  ) {
    redirect("/onboarding?step=form&question=1");
  }
  if (value.length < 1) {
    redirect(
      `/onboarding?step=form&question=${question}&error=Escolha+ou+preencha+uma+resposta`,
    );
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: (await requireAuth()).companyId },
  });
  const field = companyProfileQuestions[question - 1];
  const key = field.key as CompanyProfileQuestionKey;
  const previous = asRecord(company.onboardingData);
  const data: Record<string, unknown> = {};

  if (key === "teamSize") {
    const teamSize = Number(value);
    if (!Number.isInteger(teamSize) || teamSize < 1) {
      redirect(
        `/onboarding?step=form&question=${question}&error=Informe+uma+quantidade+válida`,
      );
    }
    data.teamSize = teamSize;
  } else if (key === "name" || key === "productionType") {
    data[key] = value;
  } else {
    data.onboardingData = { ...previous, [key]: value };
  }

  if (question === companyProfileQuestions.length) {
    data.onboardingStatus = "IN_PROGRESS";
    data.sector = company.sector ?? "Fábrica de móveis";
  }

  await prisma.company.update({ where: { id: (await requireAuth()).companyId }, data });

  if (question === companyProfileQuestions.length) {
    const saved = await prisma.company.findUniqueOrThrow({
      where: { id: (await requireAuth()).companyId },
    });
    const content = buildProfileMemory(saved);
    const existing = await prisma.companyMemory.findFirst({
      where: {
        companyId: (await requireAuth()).companyId,
        sourceType: "ONBOARDING",
        sourceId: "company-profile",
        invalidatedAt: null,
      },
    });
    if (existing) {
      await prisma.companyMemory.update({
        where: { id: existing.id },
        data: { title: "Contexto da empresa", content, confidence: 1 },
      });
    } else {
      await prisma.companyMemory.create({
        data: {
          companyId: (await requireAuth()).companyId,
          kind: "FACT",
          sourceType: "ONBOARDING",
          sourceId: "company-profile",
          title: "Contexto da empresa",
          content,
          confidence: 1,
        },
      });
    }
    revalidatePath("/dashboard");
    revalidatePath("/empresa");
    revalidatePath("/memoria");
    revalidatePath("/onboarding");
    redirect("/diagnostico/novo?onboarding=1");
  }

  revalidatePath("/onboarding");
  redirect(`/onboarding?step=form&question=${question + 1}`);
}


