"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COMPANY_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";

const taskSchema = z.object({
  taskId: z.string().min(1),
  intent: z.enum(["start", "complete", "reopen"]),
});

const manualProjectSchema = z.object({
  title: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(600),
  windowDays: z.coerce.number().int().min(1).max(365),
});

const manualTaskSchema = z.object({
  planId: z.string().min(1),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(3000).default(""),
  expectedOutput: z.string().trim().max(1000).default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().trim().max(20).default(""),
});

const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]),
  projectId: z.string().min(1),
});

const projectStatusSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
});

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function createManualProject(formData: FormData) {
  const parsed = manualProjectSchema.safeParse({
    title: formData.get("title"), objective: formData.get("objective"), windowDays: formData.get("windowDays"),
  });
  if (!parsed.success) redirect("/tarefas?error=Confira+o+nome,+objetivo+e+prazo+do+projeto");
  const now = new Date();
  const project = await prisma.actionPlan.create({ data: {
    companyId: DEV_COMPANY_ID, title: parsed.data.title, objective: parsed.data.objective,
    status: "ACTIVE", windowDays: parsed.data.windowDays, startsAt: now, dueAt: addDays(now, parsed.data.windowDays),
    baseline: { source: "MANUAL", createdBy: "USER" }, targetOutcome: { source: "MANUAL" },
  } });
  revalidatePath("/dashboard"); revalidatePath("/tarefas");
  redirect(`/tarefas?project=${project.id}&created=project`);
}

export async function createManualTask(formData: FormData) {
  const parsed = manualTaskSchema.safeParse({
    planId: formData.get("planId"), title: formData.get("title"), description: formData.get("description") ?? "",
    expectedOutput: formData.get("expectedOutput") ?? "", priority: formData.get("priority"), dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) redirect(`/tarefas?project=${String(formData.get("planId") ?? "")}&error=Confira+os+dados+da+tarefa`);
  const project = await prisma.actionPlan.findFirst({ where: { id: parsed.data.planId, companyId: DEV_COMPANY_ID, status: "ACTIVE" }, select: { id: true, startsAt: true, dueAt: true } });
  if (!project) redirect("/tarefas?error=Projeto+ativo+não+encontrado");
  const lastTask = await prisma.task.findFirst({ where: { actionPlanId: project.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const parsedDue = parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00`) : project.dueAt;
  await prisma.task.create({ data: {
    companyId: DEV_COMPANY_ID, actionPlanId: project.id, title: parsed.data.title,
    description: parsed.data.description || "Tarefa criada manualmente pelo gestor.",
    expectedOutput: parsed.data.expectedOutput || "Registrar o que foi feito e anexar a evidência disponível.",
    priority: parsed.data.priority, status: "TODO", sortOrder: (lastTask?.sortOrder ?? 0) + 1,
    startsAt: project.startsAt ?? new Date(), dueAt: parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue : project.dueAt,
  } });
  revalidatePath("/dashboard"); revalidatePath("/tarefas"); revalidatePath(`/tarefas?project=${project.id}`);
  redirect(`/tarefas?project=${project.id}&created=task`);
}

export async function moveTask(formData: FormData) {
  const parsed = moveTaskSchema.safeParse({ taskId: formData.get("taskId"), status: formData.get("status"), projectId: formData.get("projectId") });
  if (!parsed.success) redirect("/tarefas?error=Movimentação+inválida");
  const task = await prisma.task.findFirst({ where: { id: parsed.data.taskId, companyId: DEV_COMPANY_ID, actionPlanId: parsed.data.projectId, actionPlan: { status: "ACTIVE" } }, select: { id: true } });
  if (!task) redirect(`/tarefas?project=${parsed.data.projectId}&error=Tarefa+não+encontrada`);
  await prisma.task.update({ where: { id: task.id }, data: { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null } });
  revalidatePath("/dashboard"); revalidatePath("/tarefas"); revalidatePath(`/tarefas/${task.id}`); revalidatePath("/acompanhamento");
  redirect(`/tarefas?project=${parsed.data.projectId}`);
}

export async function moveTaskFromKanban(formData: FormData) {
  const parsed = moveTaskSchema.safeParse({ taskId: formData.get("taskId"), status: formData.get("status"), projectId: formData.get("projectId") });
  if (!parsed.success) return { ok: false, error: "Movimentação inválida" } as const;
  const task = await prisma.task.findFirst({ where: { id: parsed.data.taskId, companyId: DEV_COMPANY_ID, actionPlanId: parsed.data.projectId, actionPlan: { status: "ACTIVE" } }, select: { id: true } });
  if (!task) return { ok: false, error: "Tarefa não encontrada" } as const;
  await prisma.task.update({ where: { id: task.id }, data: { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null } });
  revalidatePath("/dashboard"); revalidatePath("/plano-de-acao"); revalidatePath("/tarefas"); revalidatePath(`/tarefas/${task.id}`); revalidatePath("/acompanhamento");
  return { ok: true } as const;
}

export async function updateProjectStatus(formData: FormData) {
  const parsed = projectStatusSchema.safeParse({ projectId: formData.get("projectId"), status: formData.get("status") });
  if (!parsed.success) redirect("/tarefas?error=Projeto+inválido");
  await prisma.actionPlan.updateMany({ where: { id: parsed.data.projectId, companyId: DEV_COMPANY_ID, status: { notIn: ["DRAFT", "CANCELLED"] } }, data: { status: parsed.data.status } });
  revalidatePath("/dashboard"); revalidatePath("/tarefas"); revalidatePath("/acompanhamento");
  redirect(parsed.data.status === "ACTIVE" ? `/tarefas?project=${parsed.data.projectId}` : "/tarefas");
}

export async function updateTaskStatus(formData: FormData) {
  const parsed = taskSchema.safeParse({
    taskId: formData.get("taskId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    redirect("/tarefas?error=Tarefa+inválida");
  }

  const task = await prisma.task.findFirst({
    where: {
      id: parsed.data.taskId,
      companyId: DEV_COMPANY_ID,
      actionPlan: { status: "ACTIVE" },
    },
    select: { id: true, actionPlanId: true, status: true },
  });

  if (!task) {
    redirect("/tarefas?error=Tarefa+não+encontrada");
  }

  const update =
    parsed.data.intent === "complete"
      ? { status: "DONE" as const, completedAt: new Date() }
      : parsed.data.intent === "start"
        ? { status: "IN_PROGRESS" as const, completedAt: null }
        : { status: "TODO" as const, completedAt: null };

  await prisma.task.update({ where: { id: task.id }, data: update });

  revalidatePath("/dashboard");
  revalidatePath("/plano-de-acao");
  revalidatePath("/tarefas");
  revalidatePath("/acompanhamento");
  revalidatePath(`/tarefas/${task.id}`);
  if (formData.get("returnToTask") === "1") redirect(`/tarefas/${task.id}`);
  redirect("/tarefas");
}


