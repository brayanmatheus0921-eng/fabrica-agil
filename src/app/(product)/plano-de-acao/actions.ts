"use server";

import { requireAuth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  parseMethodSteps,
  parseStringList,
} from "@/core/guided-journey";
import { prisma } from "@/lib/prisma";
import { activateDraftPlan } from "@/server/plans/approve-plan";

const recommendationSchema = z.object({
  recommendationId: z.string().min(1),
});

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function createDraftPlan(formData: FormData) {
  const auth = await requireAuth();
  const parsed = recommendationSchema.safeParse({
    recommendationId: formData.get("recommendationId"),
  });

  if (!parsed.success) {
    redirect("/gargalo?error=Recomendação+inválida");
  }

  const recommendation = await prisma.methodRecommendation.findFirst({
    where: {
      id: parsed.data.recommendationId,
      companyId: auth.companyId,
      status: { in: ["PROPOSED", "ACCEPTED"] },
    },
    include: {
      bottleneck: true,
      methodVersion: { include: { method: true } },
      actionPlans: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!recommendation) {
    redirect("/gargalo?error=Recomendação+não+encontrada");
  }

  const existingPlan = recommendation.actionPlans[0];
  if (existingPlan) {
    redirect("/plano-de-acao");
  }

  const steps = parseMethodSteps(recommendation.methodVersion.steps);
  if (steps.length === 0) {
    redirect("/gargalo?error=O+método+ainda+não+tem+passos+válidos");
  }

  const now = new Date();
  const windowDays = Math.max(7, ...steps.map((step) => step.dueInDays));
  const successCriteria = parseStringList(
    recommendation.methodVersion.successCriteria,
  );
  const requiredInputs =
    recommendation.methodVersion.requiredInputs &&
    typeof recommendation.methodVersion.requiredInputs === "object" &&
    !Array.isArray(recommendation.methodVersion.requiredInputs)
      ? (recommendation.methodVersion.requiredInputs as Record<string, unknown>)
      : {};
  const membership = await prisma.companyMembership.findFirst({
    where: { id: auth.membershipId, companyId: auth.companyId },
    select: { id: true },
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.actionPlan.create({
      data: {
        companyId: auth.companyId,
        recommendationId: recommendation.id,
        title: `Rascunho de ${windowDays} dias: ${recommendation.methodVersion.method.name}`,
        objective: recommendation.methodVersion.method.description,
        status: "DRAFT",
        windowDays,
        baseline: {
          category: recommendation.bottleneck.category,
          score: recommendation.bottleneck.impactScore,
          diagnosticSessionId: recommendation.diagnosticSessionId,
        },
        targetOutcome: {
          successCriteria,
          indicators: requiredInputs.indicators ?? [],
          minimumEvidence: requiredInputs.minimumEvidence ?? [],
          tradeOffs: requiredInputs.tradeOffs ?? [],
          abandonmentRules: requiredInputs.abandonmentRules ?? [],
          firstGoal:
            successCriteria[0] ??
            "Produzir uma melhoria observável no gargalo prioritário.",
        },
        tasks: {
          create: steps.map((step, index) => ({
            companyId: auth.companyId,
            assigneeMembershipId: membership?.id ?? undefined,
            title: step.title,
            description: `${step.description}\n\nComo comprovar: ${step.requiredEvidence}\nIndicador: ${step.indicator}`,
            expectedOutput: step.expectedOutput,
            status: "BACKLOG",
            priority: index === 0 ? "HIGH" : "MEDIUM",
            sortOrder: step.order,
            startsAt: now,
            dueAt: addDays(now, step.dueInDays),
          })),
        },
      },
    });

  });

  revalidatePath("/dashboard");
  revalidatePath("/gargalo");
  revalidatePath("/plano-de-acao");
  revalidatePath("/tarefas");
  redirect("/plano-de-acao?draft=1");
}

export async function approveActionPlan(formData: FormData) {
  const auth = await requireAuth();
  const parsed = z.object({ planId: z.string().min(1) }).safeParse({
    planId: formData.get("planId"),
  });
  if (!parsed.success) redirect("/plano-de-acao?error=Rascunho+inválido");

  const activated = await prisma.$transaction((tx) => activateDraftPlan(tx, auth.companyId, parsed.data.planId));
  if (!activated) redirect(`/plano-de-acao?id=${parsed.data.planId}&error=Plano+já+aprovado+ou+indisponível`);
  revalidatePath("/dashboard");
  revalidatePath("/gargalo");
  revalidatePath("/plano-de-acao");
  revalidatePath("/tarefas");
  revalidatePath("/acompanhamento");
  revalidatePath("/assistente");
  redirect(`/plano-de-acao?id=${parsed.data.planId}&approved=1`);
}

// Compatibilidade com links antigos durante a transição do fluxo.
export const createRecommendedPlan = createDraftPlan;




