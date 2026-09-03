import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CircleHelp, Lightbulb, Route, Sparkles, Target } from "lucide-react";
import { GuidedJourney } from "@/components/guided-journey";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import { getBottleneckCopy, parseMethodSteps } from "@/core/guided-journey";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";
import { createDraftPlan } from "@/app/(product)/plano-de-acao/actions";

export const metadata: Metadata = { title: "Oportunidade ROTA 30" };
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function BottleneckPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const company = await getDevCompany();
  const params = await searchParams;
  const assessment = await prisma.bottleneckAssessment.findFirst({
    where: { companyId: company.id, status: "ACTIVE" },
    orderBy: { detectedAt: "desc" },
    include: { recommendations: { where: { status: { in: ["PROPOSED", "ACCEPTED"] } }, orderBy: { createdAt: "desc" }, take: 1, include: { methodVersion: { include: { method: true } }, actionPlans: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  const recommendation = assessment?.recommendations[0];
  const plan = recommendation?.actionPlans[0];
  const evidence = asRecord(assessment?.evidenceSnapshot);
  const copy = assessment ? getBottleneckCopy(assessment.category) : null;
  const steps = recommendation ? parseMethodSteps(recommendation.methodVersion.steps) : [];
  const confidence = assessment?.confidenceScore === null || assessment?.confidenceScore === undefined ? null : Math.round(Number(assessment.confidenceScore) * 100);
  const severity = typeof evidence.severity === "number" ? evidence.severity : null;
  const impact = typeof evidence.impact === "number" ? evidence.impact : assessment?.impactScore ?? null;
  const priority = typeof evidence.priority === "number" ? evidence.priority : null;
  const fact = typeof evidence.evidence === "string" ? evidence.evidence : "As respostas do diagnóstico apontaram este pilar como oportunidade de melhoria.";

  return <div className="space-y-6 sm:space-y-8">
    <GuidedJourney current={1} />
    <PageHeader eyebrow={assessment ? "Resultado do ROTA 30" : "Diagnóstico pendente"} title={assessment ? assessment.title : "Descubra onde melhorar"} description={assessment ? "Veja o fato informado, a leitura do sistema e o próximo passo." : "Conclua o diagnóstico para encontrar uma oportunidade, um método e um caminho de 30 dias."} actions={<StatusPill tone={recommendation ? "success" : "warning"}>{recommendation ? "Método definido" : assessment ? "Hipótese em validação" : "Pendente"}</StatusPill>} />
    {params.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{params.error}</p> : null}
    {!assessment ? <SectionCard className="grid min-h-[330px] place-items-center p-7 text-center"><div><Route className="mx-auto size-8 text-primary" /><h2 className="mt-4 text-xl font-bold">Comece pelo diagnóstico ROTA 30</h2><p className="mt-2 text-sm text-muted">Uma pergunta por vez, sem nota geral da empresa.</p><Link href="/diagnostico" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Abrir diagnóstico<ArrowRight className="size-4" /></Link></div></SectionCard> : <>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-surface-muted text-primary"><BarChart3 className="size-5" /></span><p className="mt-4 text-xs font-bold  text-muted">Fato informado</p><p className="mt-2 text-sm font-normal leading-6">{fact}</p><p className="mt-3 text-xs text-muted">Severidade {severity ?? "—"}/5 • Impacto {impact ?? "—"}/3</p></SectionCard>
        <SectionCard className="p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Lightbulb className="size-5" /></span><p className="mt-4 text-xs font-bold  text-muted">Leitura</p><p className="mt-2 text-sm leading-6">{copy?.explanation ?? assessment.description}</p><p className="mt-3 text-xs text-muted">Confiança {confidence === null ? "não calculada" : `${confidence}%`} • Pontuação da matriz {priority ?? "—"}/15</p></SectionCard>
        <SectionCard className="border-primary/20 !bg-[#f6fbf2] p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Target className="size-5" /></span><p className="mt-4 text-xs font-bold  text-primary">Recomendação</p><p className="mt-2 text-base font-bold">{recommendation ? recommendation.methodVersion.method.name : "Confirmar a hipótese antes de intervir"}</p><p className="mt-2 text-sm leading-6 text-muted">{recommendation ? "Aplicar um ciclo de 30 dias com evidências e dois check-ins por semana." : "A confiança ainda é baixa. Meça o problema e refaça a confirmação."}</p></SectionCard>
      </div>
      {recommendation ? <SectionCard className="overflow-hidden border-primary/20"><div className="grid gap-7 p-6 sm:p-8 xl:grid-cols-[1fr_0.9fr]"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Sparkles className="size-4" />Tratamento indicado</div><h2 className="mt-3 text-2xl font-semibold">{recommendation.methodVersion.method.name}</h2><p className="mt-3 text-sm leading-6 text-muted">{recommendation.methodVersion.method.description}</p>{plan ? <Link href="/plano-de-acao" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white">Abrir plano de 30 dias<ArrowRight className="size-4" /></Link> : <form action={createDraftPlan} className="mt-6"><input type="hidden" name="recommendationId" value={recommendation.id} /><button className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white">Montar rascunho do plano<ArrowRight className="size-4" /></button></form>}</div><div className="rounded-2xl bg-surface-muted p-4"><p className="text-sm font-bold">Primeiras tarefas do rascunho</p><div className="mt-4 space-y-3">{steps.slice(0, 3).map((step) => <div key={step.order} className="flex gap-3 rounded-xl border bg-white p-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">{step.order}</span><div><p className="text-sm font-bold">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted">{step.description}</p></div></div>)}</div><p className="mt-3 text-xs text-muted">As demais ficam em espera até abrir espaço.</p></div></div></SectionCard> : <SectionCard className="border-amber-200 bg-amber-50/40 p-6"><div className="flex gap-4"><CircleHelp className="mt-1 size-5 shrink-0 text-amber-700" /><div><h2 className="font-bold">O sistema se absteve de prescrever um método</h2><p className="mt-2 text-sm leading-6 text-muted">Isso evita transformar uma percepção pouco comprovada em trabalho desnecessário. Registre um exemplo com quantidade, período ou documento e faça um novo ciclo.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/assistente" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">Pedir ajuda para medir</Link><Link href="/diagnostico" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-primary">Novo diagnóstico</Link></div></div></div></SectionCard>}
      <details className="rounded-2xl border bg-white/60 p-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary"><CircleHelp className="size-4" />Como chegamos a este resultado?</summary><div className="mt-4 grid gap-3 text-sm leading-6 text-muted sm:grid-cols-2"><p>O método comparou cinco pilares, ignorou respostas “não sei• na média e confirmou qual consequência pesa mais hoje.</p><p>Não existe nota geral da empresa. A decisão usa severidade, impacto, evidência e confiança separadamente.</p></div></details>
      <div className="flex gap-3 rounded-2xl border border-dashed bg-white/45 p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-muted">As aulas de 5 minutos são apoio. O trabalho principal acontece no diagnóstico, na aplicação e no acompanhamento com o COO.</p></div>
    </>}
  </div>;
}





