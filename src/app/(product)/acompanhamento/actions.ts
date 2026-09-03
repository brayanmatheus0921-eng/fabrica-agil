"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COMPANY_ID, DEV_MEMBERSHIP_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";
import { loadCompanyContext } from "@/server/ai/company-context";
import { runIndustrialConsultant } from "@/server/ai/consultant-agent";

const schema = z.object({
  checkinId: z.string().min(1),
  summary: z.string().trim().min(3).max(1500),
  observedOutcome: z.string().trim().min(2).max(1500),
  blockers: z.string().trim().max(1000),
  evidence: z.string().trim().min(2).max(1500),
});

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function submitProgressCheckin(formData: FormData) {
  const parsed = schema.safeParse({
    checkinId: formData.get("checkinId"),
    summary: formData.get("summary"),
    observedOutcome: formData.get("observedOutcome"),
    blockers: formData.get("blockers") ?? "",
    evidence: formData.get("evidence"),
  });
  if (!parsed.success) redirect("/acompanhamento?error=Preencha+o+que+foi+feito,+o+resultado+e+a+evidência");

  const checkin = await prisma.progressCheckin.findFirst({
    where: { id: parsed.data.checkinId, companyId: DEV_COMPANY_ID, status: "OPEN", actionPlan: { status: "ACTIVE" } },
    include: { actionPlan: true },
  });
  if (!checkin || !checkin.actionPlanId) redirect("/acompanhamento?error=Check-in+não+encontrado");

  let aiEvaluation = "Check-in salvo. O consultor poderá revisar esta evidência na próxima conversa.";
  let nextPriority = "Continue pela primeira tarefa ativa do plano.";
  try {
    const context = await loadCompanyContext(DEV_COMPANY_ID);
    const response = await runIndustrialConsultant({
      message: `Avalie este check-in do ciclo ROTA 30. Fato executado: ${parsed.data.summary}. Resultado observado: ${parsed.data.observedOutcome}. Bloqueios: ${parsed.data.blockers || "nenhum informado"}. Evidência: ${parsed.data.evidence}. Diga se há progresso verificável e indique somente a próxima prioridade.`,
      context,
    });
    aiEvaluation = response.recommendation.summary;
    nextPriority = response.recommendation.nextActions[0] ?? response.recommendation.rationale;
  } catch {
    // O check-in continua funcional mesmo se o modelo estiver temporariamente indisponível.
  }

  const metric = asRecord(checkin.metricSnapshot);
  const sequence = typeof metric.sequence === "number" ? metric.sequence : 1;
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.progressCheckin.update({
      where: { id: checkin.id },
      data: {
        status: "SUBMITTED",
        submittedByMembershipId: DEV_MEMBERSHIP_ID,
        summary: parsed.data.summary,
        observedOutcome: parsed.data.observedOutcome,
        blockers: parsed.data.blockers || null,
        aiEvaluation,
        nextPriority,
        submittedAt: now,
      },
    });
    await transaction.evidenceOutput.create({
      data: {
        companyId: DEV_COMPANY_ID,
        checkinId: checkin.id,
        type: "NOTE",
        label: `Evidência do check-in ${sequence}`,
        textValue: parsed.data.evidence,
        metadata: { sequence, source: "ROTA30_CHECKIN" },
      },
    });
    if (sequence < 8) {
      await transaction.progressCheckin.create({
        data: {
          companyId: DEV_COMPANY_ID,
          actionPlanId: checkin.actionPlanId,
          status: "OPEN",
          metricSnapshot: { sequence: sequence + 1, week: Math.ceil((sequence + 1) / 2), dueAt: addDays(now, sequence % 2 === 1 ? 4 : 3).toISOString(), type: "EXECUTION" },
        },
      });
    }
  });

  revalidatePath("/acompanhamento");
  revalidatePath("/dashboard");
  revalidatePath("/assistente");
  redirect("/acompanhamento?saved=1");
}


