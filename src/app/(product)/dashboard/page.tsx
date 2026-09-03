import type { Metadata } from "next";
import Link from "next/link";
import { ReadingDetails } from "@/components/reading-layout";
import { cooPlanSchema } from "@/core/coo-workshop";
import {
  ArrowRight,
  Activity,
  Brain,
  CalendarClock,
  Check,
  ClipboardCheck,
  ListChecks,
  MessageSquareText,
  FolderKanban,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import { DEV_COMPANY_ID } from "@/core/development";
import { getBottleneckCopy } from "@/core/guided-journey";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

type NextStep = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

export default async function DashboardPage() {
  const company = await getDevCompany();
  const profile =
    company.onboardingData &&
    typeof company.onboardingData === "object" &&
    !Array.isArray(company.onboardingData)
      ? (company.onboardingData as Record<string, unknown>)
      : {};
  const profileComplete = [
    "monthlyRevenueRange",
    "monthlyOrderVolume",
    "onTimeDeliveryRange",
    "reworkRange",
    "ownerDependency",
  ].every((key) => typeof profile[key] === "string" && String(profile[key]));
  const [diagnostic, assessment, activePlans, memoryCount] = await Promise.all([
    prisma.diagnosticSession.findFirst({
      where: {
        companyId: DEV_COMPANY_ID,
        status: "COMPLETED",
        template: { domain: "OPERATIONS" },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        resultSummary: true,
        resultSnapshot: true,
        completedAt: true,
        template: { select: { domain: true, code: true } },
        derivedSessions: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, status: true },
        },
      },
    }),
    prisma.bottleneckAssessment.findFirst({
      where: { companyId: DEV_COMPANY_ID, status: "ACTIVE" },
      orderBy: { detectedAt: "desc" },
      include: {
        recommendations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            methodVersion: { include: { method: true } },
            actionPlans: {
              where: { status: { not: "CANCELLED" } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.actionPlan.findMany({
      where: { companyId: DEV_COMPANY_ID, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: { where: { status: { not: "CANCELLED" } }, orderBy: { sortOrder: "asc" } },
        checkins: { where: { status: { in: ["SUBMITTED", "REVIEWED"] } } },
      },
    }),
    prisma.companyMemory.count({
      where: { companyId: DEV_COMPANY_ID, invalidatedAt: null },
    }),
  ]);

  const activePlan = activePlans[0] ?? null;
  const onboardingComplete = company.onboardingStatus === "COMPLETED";
  const recommendation = assessment?.recommendations[0];
  const planCreated = Boolean(recommendation?.actionPlans[0]);
  const completedTasks =
    activePlan?.tasks.filter((task) => task.status === "DONE").length ?? 0;
  const taskCount = activePlan?.tasks.length ?? 0;
  const nextTask = activePlan?.tasks.find((task) =>
    ["TODO", "IN_PROGRESS"].includes(task.status),
  );
  const executionPercent =
    taskCount === 0 ? 0 : Math.round((completedTasks / taskCount) * 100);
  const allProjectTasks = activePlans.flatMap((plan) => plan.tasks);
  const allDoneTasks = allProjectTasks.filter((task) => task.status === "DONE").length;
  const overallProgress = allProjectTasks.length ? Math.round((allDoneTasks / allProjectTasks.length) * 100) : 0;
  const latestCheckin = activePlans.flatMap((plan) => plan.checkins.map((checkin) => ({ ...checkin, planTitle: plan.title }))).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  const parsedPlan = cooPlanSchema.safeParse(activePlan?.targetOutcome);
  const primaryInitiative = parsedPlan.success ? parsedPlan.data.initiatives.find(item => item.kind === "PRIMARY") : null;
  const nextAction = parsedPlan.success && nextTask ? parsedPlan.data.initiatives.flatMap(item => item.actions)[activePlan!.tasks.findIndex(task => task.id === nextTask.id)] : null;
  let nextStep: NextStep;
  if (!onboardingComplete) {
    nextStep = {
      eyebrow: "Primeiro passo",
      title: "Conte como sua fábrica funciona",
      description:
        "O cadastro ajuda o COO a entender a realidade da fábrica.",
      href: "/onboarding",
      label: "Cadastrar empresa",
    };
  } else if (!profileComplete) {
    nextStep = {
      eyebrow: "Contexto incompleto",
      title: "Complete 5 dados rápidos da empresa",
      description:
        "Informe faturamento por faixa, volume, prazo, retrabalho e dependência do dono. Isso evita um diagnóstico genérico.",
      href: "/empresa",
      label: "Completar perfil",
    };
  } else if (!diagnostic) {
    nextStep = {
      eyebrow: "Próximo passo",
      title: "Encontre o gargalo da operação",
      description:
        "O ROTA 30 avalia a operação e indica o principal gargalo para trabalhar.",
      href: "/diagnostico",
      label: "Abrir diagnóstico",
    };
  } else if (activePlan) {
    nextStep = nextTask ? {
      eyebrow: "Seu próximo passo",
      title: nextAction?.execution?.steps[0]?.title ?? nextTask.title,
      description: nextAction?.execution?.steps[0]?.instruction ?? "Abra a tarefa para consultar as instruções e registrar o avanço.",
      href: `/tarefas/${nextTask.id}`, label: "Abrir próximo passo",
    } : {
      eyebrow: "Hora de conferir", title: "Vamos revisar os resultados",
      description: "Compare os registros com o ponto de partida junto do consultor.",
      href: "/acompanhamento", label: "Acompanhar resultados",
    };
  } else if (!assessment || !recommendation || !planCreated) {
    nextStep = {
      eyebrow: "Diagnóstico concluído",
      title: "Revise o plano antes de agir",
      description:
        "Veja o que está acontecendo e peça ao COO para montar o próximo passo com você.",
      href:
        diagnostic?.template.domain === "OPERATIONS"
          ? `/diagnostico/orientacao?id=${diagnostic.id}`
          : "/gargalo",
      label: "Revisar plano",
    };
  } else {
    nextStep = {
      eyebrow: "Hora de medir",
      title: "Conte ao COO o que mudou",
      description:
        "O plano terminou. Compare os resultados com o diagnóstico e decida se o gargalo foi resolvido.",
      href: "/acompanhamento",
      label: "Fazer check-in",
    };
  }

  const journey = [
    {
      label: "Diagnóstico",
      detail: diagnostic ? "Concluído" : "Pendente",
      done: Boolean(diagnostic),
    },
    {
      label: "Oportunidade",
      detail: primaryInitiative?.title ?? (assessment ? assessment.category : diagnostic ? "Confira no resultado" : "Aguardando diagnóstico"),
      done: Boolean(assessment || primaryInitiative),
    },
    {
      label: "Plano",
      detail: activePlan
        ? `${executionPercent}% executado`
        : planCreated
          ? "Criado"
          : "Ainda não criado",
      done: Boolean(activePlan || planCreated),
    },
    {
      label: "Acompanhamento",
      detail: activePlan
        ? `${activePlan.checkins.length} de 8 check-ins feitos`
        : "Aguardando plano",
      done: (activePlan?.checkins.length ?? 0) >= 8,
    },
  ];
  const bottleneckCopy = assessment
    ? getBottleneckCopy(assessment.category)
    : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sua central de evolução"
        title={`Visão geral da ${company.name}`}
        description="Seu próximo passo e os avanços da fábrica, em um só lugar."
        actions={
          <StatusPill tone={onboardingComplete ? "success" : "warning"}>
            {onboardingComplete ? "Empresa cadastrada" : "Cadastro pendente"}
          </StatusPill>
        }
      />

      <SectionCard className="overflow-hidden border bg-white text-foreground shadow-[0_14px_36px_rgba(11,19,32,0.05)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9a6538]">
              <Sparkles aria-hidden="true" className="size-4" />
              {nextStep.eyebrow}
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-7 sm:text-2xl">
              {nextStep.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {nextStep.description}
            </p>
          </div>
          <Link
            href={nextStep.href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3156] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102b48] lg:w-auto"
          >
            {nextStep.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </SectionCard>

      <section aria-label="Resumo da execução" className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Target, label: primaryInitiative ? "Prioridade atual" : "Oportunidade encontrada", value: primaryInitiative?.title ?? bottleneckCopy?.title ?? "Ver no diagnóstico", detail: assessment || primaryInitiative ? "Foco recomendado" : "Ainda sem oportunidade definida" },
          { icon: FolderKanban, label: "Projetos ativos", value: String(activePlans.length), detail: activePlans.length === 1 ? "1 frente em execução" : `${activePlans.length} frentes em execução` },
          { icon: ListChecks, label: "Progresso dos projetos", value: `${overallProgress}%`, detail: `${allDoneTasks} de ${allProjectTasks.length} tarefas concluídas` },
          { icon: Activity, label: "Último resultado", value: latestCheckin?.observedOutcome ?? latestCheckin?.summary ?? "Ainda não registrado", detail: latestCheckin ? latestCheckin.planTitle : "Aparece após o primeiro check-in" },
        ].map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="min-w-0 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted"><Icon className="size-4" />{label}</div>
            <p className="mt-3 line-clamp-2 text-base font-semibold leading-6">{value}</p>
            <p className="mt-1 truncate text-[11px] text-muted">{detail}</p>
          </div>
        ))}
      </section>

      <SectionCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Projetos em andamento</h2>
            <p className="mt-1 text-sm text-muted">Abra uma frente para ver as tarefas e registrar o avanço.</p>
          </div>
          <Link href="/tarefas" className="inline-flex items-center gap-2 text-xs font-semibold">Ver todos<ArrowRight className="size-4" /></Link>
        </div>
        {activePlans.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activePlans.slice(0, 3).map((plan) => {
          const done = plan.tasks.filter((task) => task.status === "DONE").length;
          const progress = plan.tasks.length ? Math.round((done / plan.tasks.length) * 100) : 0;
          return <Link key={plan.id} href={`/tarefas?project=${plan.id}`} className="rounded-xl border bg-white p-4 transition hover:border-[#bfc7d1] hover:shadow-[0_10px_26px_rgba(11,19,32,0.05)]">
            <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-surface-muted"><FolderKanban className="size-4" /></span><span className="text-xs font-semibold">{progress}%</span></div>
            <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5">{plan.title}</h3>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[#0b3156]" style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted"><span>{done}/{plan.tasks.length} tarefas</span><span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{plan.dueAt?.toLocaleDateString("pt-BR") ?? "Sem prazo"}</span></div>
          </Link>;
        })}</div> : <div className="mt-5 rounded-xl border border-dashed bg-surface-muted p-6 text-center"><p className="text-sm font-semibold">Nenhum projeto em andamento</p><p className="mt-1 text-xs text-muted">Crie uma frente manual ou monte um plano com o COO.</p></div>}
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Sua rota de evolução</p>
              <p className="mt-1 text-sm text-muted">
                Sempre continue pela primeira etapa pendente.
              </p>
            </div>
            <StatusPill>
              {completedTasks}/{taskCount || "—"} tarefas
            </StatusPill>
          </div>

          <div className="mt-6 space-y-3">
            {journey.map((step, index) => (
              <div
                key={step.label}
                className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                  step.done ? "border-[#d7e4da] bg-[#f2f7f3]" : "bg-surface-muted"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    step.done
                      ? "bg-[#0b1320] text-[#e6c79a]"
                      : "bg-white text-muted"
                  }`}
                >
                  {step.done ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                <Target aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Foco atual</p>
                <p className="text-xs text-muted">
                  {primaryInitiative ? "Combinado no plano" : assessment ? "Indicado pelo diagnóstico" : "Consulte o diagnóstico"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold">
              {primaryInitiative?.title ?? bottleneckCopy?.title ?? (diagnostic ? "Veja as oportunidades no resultado salvo" : "Conclua o diagnóstico para encontrar oportunidades")}
            </p>
            {assessment || diagnostic ? (
              <Link
                href={diagnostic ? `/diagnostico?id=${diagnostic.id}` : "/gargalo"}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Entender o resultado
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </SectionCard>

          <SectionCard className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-surface-muted text-primary">
                <Brain aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Memória da empresa</p>
                <p className="text-xs text-muted">
                  {memoryCount} {memoryCount === 1 ? "registro salvo" : "registros salvos"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              O COO usa os dados da empresa, o diagnóstico e a execução para
              continuar a conversa sem perder o contexto.
            </p>
          </SectionCard>
        </div>
      </div>

      <ReadingDetails title="Como a consultoria funciona"><div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ClipboardCheck,
            title: "Diagnóstico simples",
            text: "Uma pergunta por vez e um resultado explicado sem termos técnicos.",
          },
          {
            icon: ListChecks,
            title: "Execução guiada",
            text: "O método vira tarefas em ordem, com entrega e prazo claros.",
          },
          {
            icon: MessageSquareText,
            title: "Consultor com contexto",
            text: "O COO tira dúvidas e acompanha a aplicação e os resultados.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border bg-white p-5 shadow-[0_10px_28px_rgba(11,19,32,0.035)]"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div></ReadingDetails>
    </div>
  );
}




