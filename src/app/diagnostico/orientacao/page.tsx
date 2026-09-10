import { requireAuth } from "@/server/auth";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Route,
  Target,
} from "lucide-react";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { asDiagnosticRecord } from "@/core/diagnostic-history";
import { prisma } from "@/lib/prisma";
import { createDraftPlan } from "@/app/(product)/plano-de-acao/actions";

export const metadata: Metadata = { title: "Diagnóstico concluído" };
export const dynamic = "force-dynamic";

export default async function DiagnosticGuidancePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const session = params.id
    ? await prisma.diagnosticSession.findFirst({
        where: {
          id: params.id,
          companyId: (await requireAuth()).companyId,
          status: "COMPLETED",
          template: { domain: "OPERATIONS" },
        },
        include: {
          bottlenecks: {
            orderBy: { detectedAt: "desc" },
            take: 1,
          },
          recommendations: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              methodVersion: {
                include: { method: true },
              },
            },
          },
        },
      })
    : null;
  if (!session) redirect("/diagnostico");

  const snapshot = asDiagnosticRecord(session.resultSnapshot);
  const decision = asDiagnosticRecord(snapshot.decision);
  const adaptive = asDiagnosticRecord(snapshot.adaptive);
  const bottleneck = session.bottlenecks[0] ?? null;
  const recommendation = session.recommendations[0] ?? null;
  const selectedPillar =
    typeof decision.selectedPillar === "string"
      ? decision.selectedPillar
      : bottleneck?.category ?? "Oportunidade a confirmar";
  const confidence =
    typeof decision.confidence === "number" ? decision.confidence : null;
  const confidenceLabel =
    typeof decision.confidenceLabel === "string"
      ? decision.confidenceLabel
      : "BAIXA";
  const evidence =
    typeof adaptive.evidence === "string"
      ? adaptive.evidence
      : asDiagnosticRecord(bottleneck?.evidenceSnapshot).evidence;
  const evidenceText =
    typeof evidence === "string" ? evidence : "Sem exemplo registrado.";
  const methodName =
    recommendation?.methodVersion.method.name ??
    "Primeiro confirmar a hipótese com uma medição curta";

  return (
    <main className="min-h-dvh bg-[#f5f3ef] p-3 sm:px-8 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100dvh-24px)] max-w-5xl grid-rows-[44px_minmax(0,1fr)_18px] gap-2 sm:min-h-[calc(100dvh-40px)] sm:grid-rows-[48px_minmax(0,1fr)_18px] sm:gap-3">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-lg font-black tracking-[-0.04em] text-[#0b1320]"
          >
            Fábrica Ágil
          </Link>
          <Link
            href="/diagnostico"
            className="rounded-xl border bg-white px-3.5 py-2 text-sm font-bold text-[#59616d]"
          >
            Ver histórico
          </Link>
        </header>

        <section className="rounded-2xl border bg-white p-4 shadow-[0_20px_60px_rgba(20,35,27,0.08)] sm:rounded-3xl sm:p-7">
          <OnboardingProgress current={2} completed />

          <div className="mt-5 flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b1320]">
                Diagnóstico completo
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#0b1320] sm:text-4xl">
                Você não precisa interpretar isso sozinho
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69717d]">
                O sistema ja organizou o problema, a evidencia e um metodo publicado. Agora vamos montar um rascunho de plano para voce revisar antes de comecar.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f5e8d8] px-3 py-2 text-xs font-black text-[#0b1320]">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              3 etapas concluídas
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border p-4 sm:p-5">
              <Target aria-hidden="true" className="size-5 text-[#0b1320]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#69717d]">
                O que está acontecendo
              </p>
              <h2 className="mt-2 text-lg font-black text-[#0b1320]">
                {selectedPillar}
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#69717d]">
                {session.resultSummary ??
                  "Este é o ponto que merece investigação primeiro."}
              </p>
            </article>

            <article className="rounded-2xl border p-4 sm:p-5">
              <FileSearch
                aria-hidden="true"
                className="size-5 text-[#0b1320]"
              />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#69717d]">
                Por que o sistema concluiu isso
              </p>
              <p className="mt-2 text-sm font-black text-[#0b1320]">
                Confiança{" "}
                {confidenceLabel.toLocaleLowerCase("pt-BR")}
                {confidence === null ? "" : ` · ${Math.round(confidence * 100)}%`}
              </p>
              <p className="mt-2 line-clamp-3 text-xs italic leading-5 text-[#69717d]">
                “{evidenceText}”
              </p>
            </article>

            <article className="rounded-2xl border p-4 sm:p-5">
              <Route aria-hidden="true" className="size-5 text-[#0b1320]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#69717d]">
                Método indicado
              </p>
              <h2 className="mt-2 text-lg font-black text-[#0b1320]">
                {methodName}
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#69717d]">
                O COO explicará como aplicar, o que medir e quando ajustar ou
                abandonar o método.
              </p>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border bg-white p-5 text-foreground sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-[#9a6538]">
                <p className="text-xs font-black uppercase tracking-[0.14em]">
                  Próximo passo
                </p>
              </div>
              <h2 className="mt-2 text-xl font-black">
                Revise o rascunho do seu plano
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Você aprova antes. Depois as tarefas ficam ativas e o COO ajuda
                nas dúvidas e no acompanhamento.
              </p>
            </div>
            <form action={createDraftPlan} className="mt-5 sm:mt-0">
              <input type="hidden" name="recommendationId" value={recommendation?.id ?? ""} />
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white sm:w-auto">
                Montar rascunho do plano
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <Link
              href={`/diagnostico?id=${session.id}`}
              className="text-xs font-bold text-[#69717d] hover:text-[#0b1320]"
            >
              Ver todas as respostas e detalhes técnicos
            </Link>
          </div>
        </section>

        <p className="text-center text-[11px] leading-[18px] text-[#7b897f]">
          Cadastro salvo · diagnóstico salvo · contexto disponível para o COO
        </p>
      </div>
    </main>
  );
}






