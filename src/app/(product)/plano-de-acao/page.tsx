import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Map,
  Sparkles,
  Target,
} from "lucide-react";
import { GuidedJourney } from "@/components/guided-journey";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";
import { DiagnosticPlanPriorities } from "@/components/diagnostic-plan-priorities";
import { CooWorkshopPlan } from "@/components/coo-workshop-plan";
import { CooPlanOverview } from "@/components/coo-plan-overview";
import { cooPlanSchema, readWorkshop } from "@/core/coo-workshop";
import { asDiagnosticRecord } from "@/core/diagnostic-history";
import {
  approveActionPlan,
  createDraftPlan,
} from "@/app/(product)/plano-de-acao/actions";

export const metadata: Metadata = { title: "Meu plano" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(date)
    : "Sem prazo";
}

export default async function ActionPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; created?: string; draft?: string; approved?: string; error?: string }>;
}) {
  const company = await getDevCompany();
  const params = await searchParams;
  const [plan, recommendation] = await Promise.all([
    prisma.actionPlan.findFirst({
      where: {
        companyId: company.id,
        ...(params.id ? { id: params.id } : {}),
        status: { in: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
        recommendation: {
          include: { methodVersion: { include: { method: true } } },
        },
      },
    }),
    prisma.methodRecommendation.findFirst({
      where: {
        companyId: company.id,
        status: { in: ["PROPOSED", "ACCEPTED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        actionPlans: {
          where: { status: { not: "CANCELLED" } },
          take: 1,
        },
      },
    }),
  ]);

  const completed = plan?.tasks.filter((task) => task.status === "DONE").length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const nextTask = plan?.tasks.find((task) =>
    ["TODO", "IN_PROGRESS"].includes(task.status),
  );
  const sourceDiagnosis = asDiagnosticRecord(plan?.baseline).diagnosticSessionId;
  const baseline = asDiagnosticRecord(plan?.baseline);
  const workshopThread = baseline.source === "COO_COLLABORATIVE" && typeof baseline.threadId === "string"
    ? await prisma.conversationThread.findFirst({ where: { id: baseline.threadId, companyId: company.id } }) : null;
  const workshop = readWorkshop(workshopThread?.workflowState);
  const readyToApprove = baseline.source !== "COO_COLLABORATIVE" || (workshop?.stage === "REVIEW" && workshop.revision === baseline.workshopRevision && !workshopThread?.generationId);

  if (plan && cooPlanSchema.safeParse(plan.targetOutcome).success) {
    return <CooPlanOverview plan={plan} sourceDiagnosis={typeof sourceDiagnosis === "string" ? sourceDiagnosis : undefined} threadId={typeof baseline.threadId === "string" ? baseline.threadId : undefined} demo={baseline.demo === true} error={params.error} approval={
      <form action={approveActionPlan}>
        {!readyToApprove ? <p className="mb-3 text-sm text-amber-800">Você reabriu uma etapa. Termine a revisão com o COO antes de aprovar.</p> : null}
        <input type="hidden" name="planId" value={plan.id}/>
        <button disabled={!readyToApprove} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-40">Aprovar e começar<ArrowRight aria-hidden="true" className="size-4"/></button>
      </form>
    }/>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {typeof sourceDiagnosis === "string" ? <Link href={`/diagnostico?id=${sourceDiagnosis}`} className="text-sm font-bold text-primary">← Ver diagnóstico deste plano</Link> : null}
      <GuidedJourney current={2} />

      <PageHeader
        eyebrow="Seu caminho de execução"
        title={plan ? plan.title : "Transforme o diagnóstico em ação"}
        description={
          plan?.status === "DRAFT" ? "Revise as prioridades e as tarefas abaixo. A execução só começa após sua aprovação." : plan
            ? "Faça uma tarefa por vez. A Fábrica Ágil mostra o que entregar e acompanha o avanço."
            : "Seu plano será criado a partir do método recomendado, sem você precisar montar tarefas do zero."
        }
        actions={
          <StatusPill tone={plan && plan.status !== "DRAFT" ? "success" : "warning"}>
            {plan?.status === "DRAFT" ? "Pendente de aprovação" : plan?.status === "PAUSED" ? "Plano pausado" : plan ? `${progress}% concluído` : "Plano pendente"}
          </StatusPill>
        }
      />
      {params.error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{params.error}</p> : null}
      {params.id && !plan ? <p role="alert">Plano não encontrado. <Link href="/diagnostico" className="underline">Escolher diagnóstico</Link></p> : null}
      {plan ? <DiagnosticPlanPriorities outcome={plan.targetOutcome} /> : null}
      {baseline.demo === true ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Exemplo pronto para revisão. Usa o diagnóstico salvo e seus relatos anteriores; passos, prazos e iniciativas de apoio são sugestões. Exemplos nos formulários são fictícios. Nenhuma melhoria ou execução foi registrada.</p> : null}
      {plan ? <CooWorkshopPlan outcome={plan.targetOutcome} tasks={plan.tasks.map(task => ({ id: task.id, status: task.status, dueAt: task.dueAt?.toISOString() ?? null }))} status={plan.status} /> : null}
      {typeof asDiagnosticRecord(plan?.baseline).threadId === "string" ? <Link href={`/assistente?chat=${asDiagnosticRecord(plan?.baseline).threadId}`} className="inline-flex text-sm font-bold underline">Continuar ou revisar com o COO</Link> : null}

      {params.draft ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-accent/45 px-4 py-3 text-sm font-semibold text-primary-strong">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          Rascunho pronto. Revise e aprove antes de começar.
        </div>
      ) : params.approved ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-accent/45 px-4 py-3 text-sm font-semibold text-primary-strong">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          Plano criado. Comece pela primeira tarefa abaixo.
        </div>
      ) : null}

      {plan?.status === "DRAFT" ? (
        <SectionCard className="overflow-hidden border-primary/20">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Antes de começar
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Plano e tarefas pendentes de aprovação
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {plan.recommendation ? `Montado a partir de ${plan.recommendation.methodVersion.method.name}. ` : "O COO montou este plano usando o diagnóstico escolhido e a biblioteca de métodos. "}
              Confira as prioridades e tarefas. Nada começa até você aprovar. Os prazos contam a partir da aprovação.
            </p>
            <div className="mt-6 grid gap-3">
              {plan.tasks.map((task, index) => (
                <div key={task.id} className="flex gap-3 rounded-2xl border bg-white p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-primary">{index + 1}</span>
                  <div><p className="text-sm font-bold">{task.title}</p><p className="mt-1 text-xs leading-5 text-muted">{task.expectedOutput ?? "Registrar o resultado"}</p><span className="text-xs font-bold text-[#9a6538]">Pendente de aprovação</span></div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted">Ao aprovar, este será o plano ativo; o plano anterior, se houver, ficará pausado. Até 3 tarefas serão liberadas por vez.</p>
            <Link href={`/tarefas?plan=${plan.id}`} className="mt-4 inline-flex text-sm font-bold underline">Ver tarefas pendentes</Link>
            <form action={approveActionPlan} className="mt-7">
              {!readyToApprove ? <p className="mb-3 text-sm text-amber-800">Você reabriu uma etapa. Termine a revisão com o COO antes de aprovar este rascunho.</p> : null}
              <input type="hidden" name="planId" value={plan.id} />
              <button disabled={!readyToApprove} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white disabled:opacity-40">
                Aprovar e começar
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
        </SectionCard>
      ) : plan ? (
        <>
          <SectionCard className="overflow-hidden border-primary/20">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Objetivo deste ciclo
                </p>
                <h2 className="mt-3 max-w-3xl text-xl font-black tracking-[-0.03em] sm:text-2xl">
                  {plan.objective}
                </h2>
                <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-muted">
                  <span className="flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    Até {formatDate(plan.dueAt)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Target aria-hidden="true" className="size-4" />
                    {completed} de {total} tarefas concluídas
                  </span>
                </div>
              </div>
              <Link
                href={plan.status === "PAUSED" ? "/plano-de-acao" : nextTask ? `/tarefas?plan=${plan.id}` : "/acompanhamento"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,107,69,0.18)] sm:w-auto"
              >
                {plan.status === "PAUSED" ? "Ver plano atual" : nextTask ? "Começar a executar" : "Fazer check-in"}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="h-2 bg-[#eeece8]">
              <div
                className="h-full rounded-r-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard className="p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-bold">Passos do plano</p>
                  <p className="mt-1 text-sm text-muted">
                    A ordem já foi definida pelo método recomendado.
                  </p>
                </div>
                <StatusPill>{total} tarefas</StatusPill>
              </div>

              <div className="mt-6 space-y-3">
                {plan.tasks.map((task, index) => {
                  const done = task.status === "DONE";
                  const active = task.id === nextTask?.id;
                  return (
                    <div
                      key={task.id}
                      className={`flex gap-4 rounded-2xl border p-4 ${
                        active
                          ? "border-primary/30 bg-accent/30"
                          : "bg-white"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full ${
                          done
                            ? "bg-primary text-white"
                            : active
                              ? "bg-accent text-primary"
                              : "bg-surface-muted text-muted"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 aria-hidden="true" className="size-4" />
                        ) : (
                          <span className="text-xs font-black">{index + 1}</span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">{task.title}</p>
                          {active ? (
                            <StatusPill tone="success">Próximo passo</StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          Entrega esperada: {task.expectedOutput ?? "Registrar o resultado"}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold text-muted">
                          Prazo: {formatDate(task.dueAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard className="p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-4 text-lg font-bold">Não sabe como fazer?</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Pergunte ao COO. Ele já conhece o diagnóstico, o
                  método escolhido e as tarefas deste plano.
                </p>
                <Link
                  href="/assistente"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  Falar com o consultor
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </SectionCard>

              <div className="flex gap-3 rounded-2xl border border-dashed bg-white/45 p-5">
                <Circle aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold">Aulas são apoio</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Quando uma aula de 5 minutos ajudar nesta execução, ela
                    aparecerá junto da tarefa correspondente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <SectionCard className="grid min-h-[390px] place-items-center p-7 text-center">
          <div className="max-w-xl">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-primary">
              <Map aria-hidden="true" className="size-7" />
            </span>
            <h2 className="mt-5 text-xl font-bold">
              {recommendation
                ? "A recomendação está pronta"
                : "Primeiro conclua o diagnóstico"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {recommendation
                ? "Crie o plano recomendado e receba as tarefas na ordem certa."
                : "A Fábrica Ágil precisa entender o gargalo antes de sugerir ações."}
            </p>
            {recommendation ? (
              <form action={createDraftPlan}>
                <input
                  type="hidden"
                  name="recommendationId"
                  value={recommendation.id}
                />
                <button
                  type="submit"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                >
                  Montar rascunho do plano
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </form>
            ) : (
              <Link
                href="/diagnostico"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                Abrir diagnóstico
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}


