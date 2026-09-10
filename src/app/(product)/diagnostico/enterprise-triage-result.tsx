import { requireAuth } from "@/server/auth";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  MessageSquareText,
  Route,
  Target,
} from "lucide-react";
import { SectionCard, StatusPill } from "@/components/ui";
import {
  ENTERPRISE_DOMAIN_DESCRIPTIONS,
  ENTERPRISE_DOMAIN_LABELS,
  ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
  isEnterpriseDomain,
  type EnterpriseDomain,
} from "@/core/enterprise-triage-method";
import {
  asDiagnosticRecord,
  getDiagnosticAnswerLabel,
  getDiagnosticFlowHref,
} from "@/core/diagnostic-history";
import { prisma } from "@/lib/prisma";
import { startDiagnostic } from "./actions";

const INVESTIGATION_DATA: Record<Exclude<EnterpriseDomain, "OPERATIONS">, string[]> = {
  COMMERCIAL: [
    "Oportunidades qualificadas recebidas nos últimos 30 dias",
    "Orçamentos enviados e pedidos fechados no mesmo período",
    "Ticket, margem estimada e principais motivos de perda",
    "Pedidos que chegaram à produção com prazo ou informação inadequados",
  ],
  FINANCE: [
    "Saldo inicial e final do caixa dos últimos 30 dias",
    "Valores recebidos, pagos e ainda a receber",
    "Margem estimada dos principais pedidos ou famílias",
    "Estoque parado, dúvidas e compromissos dos próximos 30 dias",
  ],
};

function severityLabel(value: number | null) {
  if (value === null) return "Sem dados";
  if (value >= 4) return "Situação crítica";
  if (value >= 3) return "Precisa de atenção";
  return "Mais controlada";
}

function severityBar(value: number | null) {
  return value === null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
}

export async function EnterpriseTriageResult({
  sessionId,
}: {
  sessionId: string;
}) {
  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: sessionId,
      companyId: (await requireAuth()).companyId,
      status: "COMPLETED",
      template: { domain: "ENTERPRISE" },
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
      derivedSessions: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
    },
  });

  if (!session) return null;

  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const decision = asDiagnosticRecord(snapshot.decision);
  const selectedDomain =
    typeof decision.selectedDomain === "string" &&
    isEnterpriseDomain(decision.selectedDomain)
      ? decision.selectedDomain
      : null;
  const secondaryDomain =
    typeof decision.secondaryDomain === "string" &&
    isEnterpriseDomain(decision.secondaryDomain)
      ? decision.secondaryDomain
      : null;
  const confidence =
    typeof decision.confidence === "number" ? decision.confidence : null;
  const confidenceLabel =
    typeof decision.confidenceLabel === "string"
      ? decision.confidenceLabel
      : "BAIXA";
  const evidence =
    typeof decision.evidence === "string" ? decision.evidence : null;
  const followUpSignals = Array.isArray(decision.followUpSignals)
    ? decision.followUpSignals.flatMap((item) => {
        const record = asDiagnosticRecord(item);
        if (
          typeof record.code !== "string" ||
          typeof record.domain !== "string" ||
          !isEnterpriseDomain(record.domain) ||
          typeof record.prompt !== "string" ||
          typeof record.label !== "string"
        ) {
          return [];
        }
        return [
          {
            code: record.code,
            domain: record.domain,
            prompt: record.prompt,
            label: record.label,
          },
        ];
      })
    : [];
  const desiredOutcome =
    typeof snapshot.desiredOutcome === "string"
      ? ENTERPRISE_TRIAGE_OUTCOME_OPTIONS.find(
          (option) => option.value === snapshot.desiredOutcome,
        )?.label
      : null;
  const domainResults = Array.isArray(snapshot.domainResults)
    ? snapshot.domainResults.flatMap((item) => {
        const record = asDiagnosticRecord(item);
        if (
          typeof record.domain !== "string" ||
          !isEnterpriseDomain(record.domain)
        ) {
          return [];
        }
        return [
          {
            domain: record.domain,
            severity:
              typeof record.severity === "number" ? record.severity : null,
            validCount:
              typeof record.validCount === "number" ? record.validCount : 0,
            unknownCount:
              typeof record.unknownCount === "number" ? record.unknownCount : 0,
          },
        ];
      })
    : [];
  const specializedSession = session.derivedSessions[0] ?? null;
  const answersByPillar = new Map<string, typeof session.answers>();

  for (const answer of session.answers.sort(
    (left, right) => left.question.order - right.question.order,
  )) {
    const group = answersByPillar.get(answer.question.pillar) ?? [];
    group.push(answer);
    answersByPillar.set(answer.question.pillar, group);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard className="p-5">
          <div className="flex items-center gap-3">
            <Target aria-hidden="true" className="size-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              área prioritária
            </p>
          </div>
          <p className="mt-3 text-lg font-black">
            {selectedDomain
              ? ENTERPRISE_DOMAIN_LABELS[selectedDomain]
              : "Precisa confirmar"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            área que deve ser investigada primeiro
          </p>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="flex items-center gap-3">
            <FileSearch aria-hidden="true" className="size-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Confiança
            </p>
          </div>
          <p className="mt-3 text-lg font-black">
            {confidenceLabel.charAt(0) +
              confidenceLabel.slice(1).toLocaleLowerCase("pt-BR")}
            {confidence === null ? "" : ` · ${Math.round(confidence * 100)}%`}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {evidence
              ? "Inclui o exemplo informado"
              : "Sem exemplo concreto neste ciclo"}
          </p>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="flex items-center gap-3">
            <Route aria-hidden="true" className="size-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Próximo passo
            </p>
          </div>
          <p className="mt-3 text-lg font-black">
            {selectedDomain === "OPERATIONS"
              ? "ROTA 30"
              : "Investigação guiada"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            O diagnóstico de setor encaminha; ele não substitui o diagnóstico de gargalo
          </p>
        </SectionCard>
      </div>

      {selectedDomain ? (
        <SectionCard className="overflow-hidden border-primary/20">
          <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Resultado do diagnóstico de setor
                  </p>
                  <h3 className="mt-1 text-2xl font-black">
                    Investigar {ENTERPRISE_DOMAIN_LABELS[selectedDomain]}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">
                {ENTERPRISE_DOMAIN_DESCRIPTIONS[selectedDomain]}
              </p>
              {desiredOutcome ? (
                <div className="mt-4 rounded-2xl bg-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Resultado que você quer melhorar
                  </p>
                  <p className="mt-2 text-sm font-bold">{desiredOutcome}</p>
                </div>
              ) : null}
              {evidence ? (
                <div className="mt-4 rounded-2xl border p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                    Evidência registrada
                  </p>
                  <blockquote className="mt-2 border-l-2 border-primary pl-3 text-sm italic leading-6">
                    &ldquo;{evidence}&rdquo;
                  </blockquote>
                </div>
              ) : null}
              {followUpSignals.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-primary/15 bg-accent/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                    Sinais que pedem investigação
                  </p>
                  <ul className="mt-2 space-y-2 text-sm font-semibold">
                    {followUpSignals.map((signal) => (
                      <li key={signal.code} className="flex gap-2">
                        <span aria-hidden="true" className="text-primary">
                          .
                        </span>
                        <span>{signal.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {secondaryDomain ? (
                <p className="mt-4 text-xs leading-5 text-muted">
                  Sinal secundário:{" "}
                  <strong>
                    {ENTERPRISE_DOMAIN_LABELS[secondaryDomain]}
                  </strong>
                  · Ele fica registrado, mas não vira um segundo foco ativo.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border bg-white p-5 text-foreground">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6538]">
                Faça agora
              </p>
              {selectedDomain === "OPERATIONS" ? (
                <>
                  <h4 className="mt-2 text-xl font-black">
                    Aprofunde com o ROTA 30
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    O ROTA 30 identifica o gargalo operacional, organiza a
                    evidência e recomenda um método para os próximos 30 dias.
                  </p>
                  {specializedSession ? (
                    <Link
                      href={
                        specializedSession.status === "COMPLETED"
                          ? `/diagnostico?id=${specializedSession.id}`
                          : getDiagnosticFlowHref(
                              specializedSession.template.code,
                            )
                      }
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                    >
                      {specializedSession.status === "COMPLETED"
                        ? "Ver ROTA 30 vinculado"
                        : "Continuar ROTA 30"}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  ) : (
                    <form action={startDiagnostic}>
                      <input
                        type="hidden"
                        name="originSessionId"
                        value={session.id}
                      />
                      <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
                        Iniciar ROTA 30
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <h4 className="mt-2 text-xl font-black">
                    Confirme o problema com dados
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    O método especializado ainda não está publicado. O COO pode
                    organizar uma medição simples antes de recomendar uma ação.
                  </p>
                  <Link
                    href={`/assistente?diagnostico=${session.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                  >
                    Investigar com o COO
                    <MessageSquareText
                      aria-hidden="true"
                      className="size-4"
                    />
                  </Link>
                </>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-primary">
            <BarChart3 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-black">Leitura por área</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              A severidade é mostrada separadamente. Não existe nota geral da
              empresa.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {domainResults.map((result) => (
            <div key={result.domain} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">
                  {ENTERPRISE_DOMAIN_LABELS[result.domain]}
                </p>
                <span className="text-xs font-black text-primary">
                  {result.severity === null
                    ? "-"
                    : result.severity.toFixed(1)}
                  /5
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${severityBar(result.severity)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted">
                {severityLabel(result.severity)}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {result.validCount} respostas válidas
                {result.unknownCount
                  ? ` · ${result.unknownCount} desconhecida`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {selectedDomain && selectedDomain !== "OPERATIONS" ? (
        <SectionCard className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-warm text-[#8b5923]">
              <ClipboardList aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-black">
                Dados mínimos para a próxima conversa
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                Não precisa preencher agora. Esta lista evita uma consultoria
                genérica.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {INVESTIGATION_DATA[selectedDomain].map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl border bg-white p-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-5">{item}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center sm:p-7">
          <div>
            <h3 className="text-lg font-black">Respostas do diagnóstico de setor</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Todas permanecem salvas e podem ser consultadas sem refazer.
            </p>
          </div>
          <StatusPill tone="success">
            {session.answers.length + followUpSignals.length} respostas salvas
          </StatusPill>
        </div>
        <div className="divide-y">
          {[...answersByPillar.entries()].map(
            ([pillar, answers], pillarIndex) => (
              <details key={pillar} open={pillarIndex === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold transition hover:bg-surface-muted sm:px-7">
                  <span>{pillar}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {answers.length} resposta{answers.length === 1 ? "" : "s"}
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
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eeece8] text-[11px] font-black text-muted">
                          {answerIndex + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold leading-5">
                            {answer.question.prompt}
                          </p>
                          <p className="mt-2 text-sm font-black text-primary">
                            {getDiagnosticAnswerLabel(
                              answer.value,
                              answer.score === null
                                ? null
                                : Number(answer.score),
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
          {followUpSignals.length > 0 ? (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold transition hover:bg-surface-muted sm:px-7">
                <span>Perguntas adaptativas</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {followUpSignals.length} resposta
                  {followUpSignals.length === 1 ? "" : "s"}
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 transition group-open:rotate-90"
                  />
                </span>
              </summary>
              <div className="space-y-3 bg-surface-muted px-5 py-4 sm:px-7">
                {followUpSignals.map((signal, index) => (
                  <div
                    key={signal.code}
                    className="rounded-xl border bg-white p-4"
                  >
                    <div className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eeece8] text-[11px] font-black text-muted">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-5">
                          {signal.prompt}
                        </p>
                        <p className="mt-2 text-sm font-black text-primary">
                          {signal.label}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}


