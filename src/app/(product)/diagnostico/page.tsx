import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  History,
  ListChecks,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";
import { DiagnosticRadarChart } from "@/components/diagnostic-radar-chart";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import {
  asDiagnosticRecord,
  buildDiagnosticTitle,
  formatDiagnosticDate,
  getDiagnosticAnswerLabel,
  getDiagnosticFlowHref,
  parseDiagnosticPillars,
  type DiagnosticPillarResult,
} from "@/core/diagnostic-history";
import { DEV_COMPANY_ID } from "@/core/development";
import {
  getBottleneckCopy,
  parseMethodSteps,
  parseStringList,
} from "@/core/guided-journey";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";
import { DeleteDiagnosticButton } from "./delete-diagnostic-button";
import { StrategicResult } from "./strategic-result";
import { DiagnosticPlanNextStep } from "./diagnostic-plan-next-step";
import { STRATEGIC_OPERATIONAL_METHOD_CODE } from "@/core/strategic-operational-method";

export const metadata: Metadata = { title: "Diagnósticos" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  id?: string;
  deleted?: string;
  completed?: string;
  error?: string;
}>;

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function diagnosticStatus(status: string) {
  if (status === "COMPLETED") return "Concluído";
  if (status === "IN_PROGRESS") return "Em andamento";
  return "Rascunho";
}

function diagnosticStatusTone(status: string): "success" | "warning" {
  return status === "COMPLETED" ? "success" : "warning";
}

const diagnosticType = {
  label: "Diagnóstico operacional",
  description:
    "Encontra o principal gargalo da operação, registra as evidências e indica o método de trabalho.",
};

function confidenceCopy(value: number | null) {
  if (value === null) return { label: "Não calculada", detail: "Sem evidência suficiente" };
  if (value >= 0.75) return { label: "Alta", detail: "Evidência consistente" };
  if (value >= 0.5) return { label: "Média", detail: "Vale confirmar durante a execução" };
  return { label: "Baixa", detail: "Trate o resultado como hipótese" };
}

function getPillarsWithCoverage(
  pillars: DiagnosticPillarResult[],
  answers: Array<{
    score: unknown;
    question: { pillar: string };
  }>,
) {
  const coverage = new Map<string, { validCount: number; unknownCount: number }>();

  for (const answer of answers) {
    const current = coverage.get(answer.question.pillar) ?? {
      validCount: 0,
      unknownCount: 0,
    };
    if (answer.score === null) current.unknownCount += 1;
    else current.validCount += 1;
    coverage.set(answer.question.pillar, current);
  }

  return pillars.map((pillar) => ({
    ...pillar,
    validCount: coverage.get(pillar.pillar)?.validCount ?? pillar.validCount,
    unknownCount:
      coverage.get(pillar.pillar)?.unknownCount ?? pillar.unknownCount,
  }));
}

export default async function DiagnosticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [company, params, sessions] = await Promise.all([
    getDevCompany(),
    searchParams,
    prisma.diagnosticSession.findMany({
      where: {
        companyId: DEV_COMPANY_ID,
        status: { not: "CANCELLED" },
        template: { domain: "OPERATIONS" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: {
            code: true,
            domain: true,
            name: true,
            version: true,
            questions: { select: { id: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                pillar: true,
                prompt: true,
                options: true,
                order: true,
              },
            },
          },
        },
        bottlenecks: { orderBy: { detectedAt: "desc" } },
        recommendations: {
          orderBy: { createdAt: "desc" },
          include: {
            methodVersion: { include: { method: true } },
            actionPlans: {
              where: { status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    }),
  ]);

  const completed = sessions.filter((session) => session.status === "COMPLETED");
  const inProgress = sessions.find((session) =>
    ["DRAFT", "IN_PROGRESS"].includes(session.status),
  );
  const selected = sessions.find((session) => session.id === params.id) ?? null;
  const selectedIndex = selected
    ? sessions.findIndex((session) => session.id === selected.id)
    : -1;
  const selectedTitle = selected
    ? selected.title ??
      buildDiagnosticTitle({
        sequence: sessions.length - selectedIndex,
        date: selected.completedAt ?? selected.startedAt ?? selected.createdAt,
        priority: selected.bottlenecks[0]?.category,
        inProgress: selected.status !== "COMPLETED",
      })
    : null;

  if (!selected) {
    return <div className="space-y-6">
      <PageHeader eyebrow="Produtividade da fábrica" title="Meus diagnósticos" description="Abra um diagnóstico salvo ou comece um novo ciclo."
        actions={<Link href="/diagnostico/novo" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Novo diagnóstico</Link>} />
      {params.deleted ? <p role="status" className="rounded-xl border bg-white p-4 text-sm">Diagnóstico e resultados vinculados excluídos.</p> : null}
      {params.id ? <p role="alert" className="rounded-xl border bg-white p-4 text-sm">Esse diagnóstico não foi encontrado. Escolha um dos diagnósticos abaixo.</p> : null}
      {params.error ? <p role="alert" className="text-sm text-red-700">{params.error}</p> : null}
      <div className="flex flex-wrap gap-3 text-sm text-muted"><span>{sessions.length} diagnóstico(s) salvo(s)</span><span>·</span><span>{completed.length} concluído(s)</span></div>
      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => <SectionCard key={session.id} className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wider text-muted">Operacional · V{session.template.version}</span><StatusPill tone={diagnosticStatusTone(session.status)}>{diagnosticStatus(session.status)}</StatusPill></div>
          <h2 className="text-lg font-bold">{session.title ?? "Diagnóstico operacional"}</h2>
          <p className="text-xs text-muted">{formatDiagnosticDate(session.completedAt ?? session.createdAt)} · {session.answers.length} respostas</p>
          <p className="text-sm leading-6 text-muted">{session.status === "COMPLETED" ? "Notas, evidências e oportunidades deste ciclo." : "Suas respostas estão salvas. Continue de onde parou."}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <Link href={`/diagnostico?id=${session.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">{session.status === "COMPLETED" ? "Abrir diagnóstico" : "Ver diagnóstico em andamento"}<ArrowRight className="size-4" /></Link>
            <DeleteDiagnosticButton sessionId={session.id} />
          </div>
        </SectionCard>)}
      </div>
      {!sessions.length ? <SectionCard className="p-8 text-center"><h2 className="text-xl font-bold">Nenhum diagnóstico salvo ainda</h2><p className="mt-2 text-sm text-muted">Clique em Novo diagnóstico para começar. Suas respostas ficam salvas.</p></SectionCard> : null}
    </div>;
  }

  if (selected.template.code === STRATEGIC_OPERATIONAL_METHOD_CODE && selected.status === "COMPLETED") {
    return <div className="space-y-6 sm:space-y-8"><Link href="/diagnostico" className="inline-flex text-sm font-bold text-primary">← Todos os diagnósticos</Link><PageHeader eyebrow="Produtividade da fábrica" title={selectedTitle ?? "Identificação Estratégica Operacional"} description={`Resultado operacional da ${company.name}, calculado pela Matriz de Identificação Estratégica.`}/><DiagnosticPlanNextStep sessionId={selected.id}/>{params.completed ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">Diagnóstico concluído e salvo no histórico da empresa.</div> : null}<StrategicResult snapshot={selected.resultSnapshot}/><div className="flex flex-wrap gap-3"><Link href="/diagnostico" className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold">Todos os diagnósticos</Link><DeleteDiagnosticButton sessionId={selected.id}/></div></div>;
  }

  const assessment = selected?.bottlenecks[0] ?? null;
  const recommendation = selected?.recommendations[0] ?? null;
  const plan = recommendation?.actionPlans[0] ?? null;
  const evidenceSnapshot = asDiagnosticRecord(assessment?.evidenceSnapshot);
  const rawPillars = selected
    ? parseDiagnosticPillars(selected.resultSnapshot)
    : [];
  const pillars = selected
    ? getPillarsWithCoverage(rawPillars, selected.answers)
    : [];
  const unknownCount =
    selected?.answers.filter((answer) => answer.score === null).length ?? 0;
  const answeredCount = selected?.answers.length ?? 0;
  const totalQuestions = selected?.template.questions.length ?? 0;
  const confidence = numberOrNull(assessment?.confidenceScore);
  const confidenceInfo = confidenceCopy(confidence);
  const bottleneckCopy = assessment
    ? getBottleneckCopy(assessment.category)
    : null;
  const evidence =
    typeof evidenceSnapshot.evidence === "string"
      ? evidenceSnapshot.evidence
      : null;
  const consequence =
    typeof evidenceSnapshot.consequence === "string"
      ? evidenceSnapshot.consequence
      : null;
  const priority = numberOrNull(evidenceSnapshot.priority);
  const requiredInputs = asDiagnosticRecord(
    recommendation?.methodVersion.requiredInputs,
  );
  const indicators = parseStringList(requiredInputs.indicators);
  const methodSteps = parseMethodSteps(recommendation?.methodVersion.steps);
  const answersByPillar = new Map<
    string,
    NonNullable<typeof selected>["answers"]
  >();

  for (const answer of selected?.answers ?? []) {
    const group = answersByPillar.get(answer.question.pillar) ?? [];
    group.push(answer);
    answersByPillar.set(answer.question.pillar, group);
  }

  for (const group of answersByPillar.values()) {
    group.sort((left, right) => left.question.order - right.question.order);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link href="/diagnostico" className="text-sm font-bold text-primary">← Todos os diagnósticos</Link>
      {selected.status === "COMPLETED" ? <DiagnosticPlanNextStep sessionId={selected.id} /> : null}
      <PageHeader
        eyebrow="Produtividade da fábrica"
        title="Diagnóstico operacional"
        description={`Encontre o que está travando a operação da ${company.name} e consulte os diagnósticos anteriores.`}
      />

      <SectionCard className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <Target aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold  text-primary">
              Identificação estratégica
            </p>
            <h2 className="mt-1 text-lg font-semibold">Encontre as oportunidades da operação</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              Avalia 7 temas da fábrica e mostra onde há mais espaço para melhorar.
            </p>
          </div>
        </div>
        <Link
          href="/diagnostico/novo"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          {inProgress ? "Continuar diagnóstico" : "Iniciar diagnóstico"}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </SectionCard>

      {params.completed ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Diagnóstico concluído e salvo.</p>
            <p className="mt-0.5 text-xs text-emerald-800">
              O resultado, as respostas e o método indicado já fazem parte do
              histórico da empresa e do contexto do COO.
            </p>
          </div>
        </div>
      ) : null}

      {params.deleted ? (
        <div className="rounded-2xl border bg-surface-muted px-4 py-3 text-sm font-semibold text-muted">
          Diagnóstico e resultados vinculados excluídos definitivamente.
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {params.error}
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <SectionCard className="grid min-h-[430px] place-items-center p-7 text-center">
          <div className="max-w-xl">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
              <Target aria-hidden="true" className="size-7" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold">
              Faça seu primeiro diagnóstico operacional
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Use o botão acima. As respostas ficam salvas e você pode continuar
              depois se precisar sair.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <SectionCard className="h-fit overflow-hidden">
            <div className="border-b p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History aria-hidden="true" className="size-4 text-primary" />
                  <h2 className="font-bold">Histórico</h2>
                </div>
                <StatusPill tone="success">
                  {completed.length} concluído{completed.length === 1 ? "" : "s"}
                </StatusPill>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-muted">
                Diagnósticos operacionais concluídos e em andamento.
              </p>
            </div>

            <div className="divide-y">
              {sessions.map((session, index) => {
                const title =
                  session.title ??
                  buildDiagnosticTitle({
                    sequence: sessions.length - index,
                    date:
                      session.completedAt ??
                      session.startedAt ??
                      session.createdAt,
                    priority: session.bottlenecks[0]?.category,
                    inProgress: session.status !== "COMPLETED",
                  });
                const current = selected?.id === session.id;

                return (
                  <Link
                    key={session.id}
                    href={`/diagnostico?id=${session.id}`}
                    className={`group flex gap-3 p-4 transition ${
                      current ? "bg-accent/45" : "hover:bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
                        session.status === "COMPLETED"
                          ? "bg-primary text-white"
                          : "bg-accent-warm text-[#8b5923]"
                      }`}
                    >
                      {session.status === "COMPLETED" ? (
                        <FileCheck2 aria-hidden="true" className="size-4" />
                      ) : (
                        <Clock3 aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                        {diagnosticType.label}
                      </span>
                      <span className="line-clamp-2 text-sm font-bold leading-5">
                        {title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                        <span>{diagnosticStatus(session.status)}</span>
                        <span>.</span>
                        <span>Versão {session.template.version}</span>
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-2 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5"
                    />
                  </Link>
                );
              })}
            </div>
          </SectionCard>

          {selected ? (
            <div className="min-w-0 space-y-5">
              <SectionCard className="overflow-hidden">
                <div className="flex flex-col justify-between gap-5 p-5 sm:p-7 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={diagnosticStatusTone(selected.status)}>
                        {diagnosticStatus(selected.status)}
                      </StatusPill>
                      <StatusPill tone="neutral">
                        {diagnosticType.label}
                      </StatusPill>
                      <span className="text-xs font-semibold text-muted">
                        {selected.template.name} · versão{" "}
                        {selected.template.version}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
                      {selectedTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {selected.resultSummary ??
                        (selected.status === "COMPLETED"
                          ? "Resultado concluído e salvo."
                          : `${answeredCount} de ${totalQuestions} perguntas respondidas. Você pode continuar de onde parou.`)}
                    </p>
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                      {diagnosticType.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                    {selected.status !== "COMPLETED" ? (
                      <Link
                        href={getDiagnosticFlowHref(selected.template.code)}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
                      >
                        Continuar
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    ) : null}
                    <DeleteDiagnosticButton sessionId={selected.id} />
                  </div>
                </div>
              </SectionCard>

              {selected.status !== "COMPLETED" ? (
                <SectionCard className="p-5 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-warm text-[#8b5923]">
                      <Clock3 aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">
                        Diagnóstico operacional em andamento
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        As {answeredCount} respostas já salvas continuam no
                        banco. Você só precisa seguir da etapa em que parou.
                      </p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${
                              totalQuestions
                                ? (answeredCount / totalQuestions) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <Link
                        href={getDiagnosticFlowHref(selected.template.code)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                      >
                        Continuar diagnóstico operacional
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </div>
                  </div>
                </SectionCard>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <SectionCard className="p-5">
                      <div className="flex items-center gap-3">
                        <Target
                          aria-hidden="true"
                          className="size-5 text-primary"
                        />
                        <p className="text-xs font-bold  text-muted">
                          Oportunidade
                        </p>
                      </div>
                      <p className="mt-3 text-lg font-semibold">
                        {assessment?.category ?? "Hipótese em validação"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Um ponto indicado para investigar
                      </p>
                    </SectionCard>

                    <SectionCard className="p-5">
                      <div className="flex items-center gap-3">
                        <FileCheck2
                          aria-hidden="true"
                          className="size-5 text-primary"
                        />
                        <p className="text-xs font-bold  text-muted">
                          Confiança
                        </p>
                      </div>
                      <p className="mt-3 text-lg font-semibold">
                        {confidenceInfo.label}
                        {confidence === null
                          ? ""
                          : ` · ${Math.round(confidence * 100)}%`}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {confidenceInfo.detail}
                      </p>
                    </SectionCard>

                    <SectionCard className="p-5">
                      <div className="flex items-center gap-3">
                        <ListChecks
                          aria-hidden="true"
                          className="size-5 text-primary"
                        />
                        <p className="text-xs font-bold  text-muted">
                          Cobertura
                        </p>
                      </div>
                      <p className="mt-3 text-lg font-semibold">
                        {answeredCount}/{totalQuestions} respostas
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {unknownCount
                          ? `${unknownCount} marcada${unknownCount === 1 ? "" : "s"} como "não sei"`
                          : "Nenhuma resposta ficou desconhecida"}
                      </p>
                    </SectionCard>
                  </div>

                  <SectionCard className="overflow-hidden">
                    <div className="border-b p-5 sm:p-7">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                          <Target aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold  text-primary">
                            Gargalo prioritário
                          </p>
                          <h3 className="mt-1 text-xl font-semibold">
                            {bottleneckCopy?.title ??
                              assessment?.title ??
                              "O resultado precisa de mais evidência"}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold  text-muted">
                          O que isso significa
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {bottleneckCopy?.explanation ??
                            assessment?.description ??
                            "O diagnóstico registrou uma hipótese que ainda precisa ser medida."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold  text-muted">
                          Consequência informada
                        </p>
                        <p className="mt-2 text-sm font-bold">
                          {consequence ??
                            bottleneckCopy?.consequence ??
                            "Não registrada"}
                        </p>
                        {priority !== null ? (
                          <p className="mt-2 text-xs text-muted">
                            Pontuação da matriz: {priority}. Ela organiza os
                            pontos que merecem atenção; não é uma nota da empresa.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {evidence ? (
                      <div className="border-t bg-surface-muted px-5 py-4 sm:px-7">
                        <p className="text-xs font-bold  text-primary">
                          Evidência registrada por você
                        </p>
                        <blockquote className="mt-2 border-l-2 border-primary pl-4 text-sm italic leading-6 text-foreground">
                          &ldquo;{evidence}&rdquo;
                        </blockquote>
                      </div>
                    ) : null}
                  </SectionCard>

                  {pillars.length > 0 ? (
                    <SectionCard className="p-5 sm:p-7">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-primary">
                          <BarChart3 aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Maturidade observada por pilar
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            Quanto mais para fora, mais estável o pilar apareceu
                            neste ciclo. É a leitura inversa da severidade das
                            respostas, não uma nota geral da empresa.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5">
                        <DiagnosticRadarChart pillars={pillars} />
                      </div>
                    </SectionCard>
                  ) : null}

                  <SectionCard className="overflow-hidden">
                    <div className="border-b p-5 sm:p-7">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-[#0b1320] text-[#e6c79a]">
                          <Sparkles aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold  text-primary">
                            Método indicado
                          </p>
                          <h3 className="mt-1 text-xl font-semibold">
                            {recommendation?.methodVersion.method.name ??
                              "Ainda não indicado"}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {recommendation ? (
                      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.9fr]">
                        <div>
                          <p className="text-sm leading-6 text-muted">
                            {recommendation.methodVersion.method.description}
                          </p>
                          <div className="mt-5 rounded-2xl bg-surface-muted p-4">
                            <p className="text-xs font-bold  text-primary">
                              Por que este método
                            </p>
                            <p className="mt-2 text-sm leading-6">
                              {recommendation.rationale}
                            </p>
                          </div>
                          {indicators[0] ? (
                            <div className="mt-4 rounded-2xl border p-4">
                              <p className="text-xs font-bold  text-muted">
                                Indicador principal
                              </p>
                              <p className="mt-2 text-sm font-bold">
                                {indicators[0]}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-bold  text-muted">
                            Primeiros passos do método
                          </p>
                          <div className="mt-3 space-y-2">
                            {methodSteps.slice(0, 3).map((step) => (
                              <div
                                key={step.order}
                                className="flex gap-3 rounded-xl border p-3"
                              >
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">
                                  {step.order}
                                </span>
                                <div>
                                  <p className="text-sm font-bold">
                                    {step.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-muted">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Link
                            href={plan ? "/plano-de-acao" : "/gargalo"}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                          >
                            {plan
                              ? "Abrir plano de ação"
                              : "Gerar plano com este método"}
                            <ArrowRight
                              aria-hidden="true"
                              className="size-4"
                            />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 p-5 sm:p-7">
                        <CircleHelp
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0 text-amber-700"
                        />
                        <div>
                          <p className="font-bold">
                            O sistema ainda não prescreveu um método
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            A evidência disponível não foi suficiente. O COO pode
                            ajudar a definir a menor medição necessária antes de
                            iniciar uma intervenção.
                          </p>
                          <Link
                            href="/assistente"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
                          >
                            Pedir ajuda ao COO
                            <ArrowRight
                              aria-hidden="true"
                              className="size-4"
                            />
                          </Link>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard className="overflow-hidden">
                    <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center sm:p-7">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Respostas deste diagnóstico
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          Você pode consultar tudo sem responder novamente.
                        </p>
                      </div>
                      <StatusPill tone="success">
                        {answeredCount} respostas salvas
                      </StatusPill>
                    </div>

                    <div className="divide-y">
                      {[...answersByPillar.entries()].map(
                        ([pillar, answers], pillarIndex) => (
                          <details
                            key={pillar}
                            open={pillarIndex === 0}
                            className="group"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold transition hover:bg-surface-muted sm:px-7">
                              <span>{pillar}</span>
                              <span className="flex items-center gap-2 text-xs text-muted">
                                {answers.length} respostas
                                <ChevronRight
                                  aria-hidden="true"
                                  className="size-4 transition group-open:rotate-90"
                                />
                              </span>
                            </summary>
                            <div className="space-y-3 bg-surface-muted px-5 py-4 sm:px-7">
                              {answers.map((answer, answerIndex) => (
                                <div
                                  key={answer.id}
                                  className="rounded-xl border bg-white p-4"
                                >
                                  <div className="flex gap-3">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eeece8] text-[11px] font-semibold text-muted">
                                      {answerIndex + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold leading-5">
                                        {answer.question.prompt}
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-primary">
                                        {getDiagnosticAnswerLabel(
                                          answer.value,
                                          numberOrNull(answer.score),
                                          answer.question.options,
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        ),
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard className="p-5 sm:p-7">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Link
                        href="/assistente"
                        className="flex items-center gap-4 rounded-2xl border p-4 transition hover:border-primary/40 hover:bg-accent/20"
                      >
                        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                          <MessageSquareText
                            aria-hidden="true"
                            className="size-5"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            Conversar com o COO sobre este resultado
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            O nome e os dados deste ciclo ficam disponíveis no
                            contexto da empresa.
                          </span>
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 text-muted"
                        />
                      </Link>
                      <div className="flex items-center gap-4 rounded-2xl border border-dashed p-4">
                        <span className="grid size-10 place-items-center rounded-xl bg-surface-muted text-primary">
                          <FileCheck2 aria-hidden="true" className="size-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold">
                            Salvo em{" "}
                            {formatDiagnosticDate(
                              selected.completedAt ?? selected.createdAt,
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            ID interno: {selected.id}
                          </span>
                        </span>
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}




