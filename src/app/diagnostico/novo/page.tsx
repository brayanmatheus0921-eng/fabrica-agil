import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Route, Target } from "lucide-react";
import { StrategicDiagnosticForm } from "@/app/(product)/diagnostico/strategic-diagnostic-form";
import { finishStrategicDiagnostic, startStrategicDiagnostic } from "@/app/(product)/diagnostico/strategic-actions";
import { STRATEGIC_OPERATIONAL_METHOD_CODE } from "@/core/strategic-operational-method";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";

export const metadata: Metadata = { title: "Identificação Estratégica Operacional" };
export const dynamic = "force-dynamic";

export default async function NewDiagnosticPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; session?: string; review?: string }> }) {
  const company = await getDevCompany();
  if (company.onboardingStatus === "NOT_STARTED") redirect("/onboarding");
  const params = await searchParams;
  const template = await prisma.diagnosticTemplate.findFirst({ where: { code: STRATEGIC_OPERATIONAL_METHOD_CODE, status: "ACTIVE" }, orderBy: { version: "desc" }, include: { questions: { orderBy: { order: "asc" } } } });
  const session = template ? await prisma.diagnosticSession.findFirst({ where: { companyId: company.id, templateId: template.id, status: { in: ["DRAFT", "IN_PROGRESS"] }, ...(params.session ? { id: params.session } : {}) }, orderBy: { createdAt: "desc" }, include: { answers: true } }) : null;
  const index = Math.min(Math.max((Number(params.q) || 1) - 1, 0), Math.max((template?.questions.length ?? 1) - 1, 0));
  const current = session?.answers.find((answer) => answer.questionId === template?.questions[index]?.id);
  return <main className="h-dvh min-h-[520px] overflow-y-auto bg-[#f5f3ef] px-3 py-3 sm:px-8"><div className="mx-auto grid h-full max-w-5xl grid-rows-[3rem_minmax(0,1fr)] gap-2"><header className="flex items-center justify-between"><Link href="/dashboard" className="text-lg font-black text-[#0b1320]">Fábrica Ágil</Link><Link href="/diagnostico" className="rounded-xl border bg-white px-3.5 py-2 text-sm font-bold text-[#59616d]">Sair por agora</Link></header><div className="flex min-h-0 items-center justify-center">
    {!template ? <section className="w-full rounded-3xl border bg-white p-8 text-center"><h1 className="text-2xl font-bold">Método ainda não publicado</h1><p className="mt-2 text-sm text-muted">Execute a preparação do banco local.</p></section>
    : session && params.review ? <section className="w-full max-w-2xl rounded-3xl border bg-white p-7 text-center shadow-xl"><Target className="mx-auto size-9 text-primary"/><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-primary">Respostas salvas</p><h1 className="mt-2 text-3xl font-black">Gerar diagnóstico executivo</h1><p className="mt-3 text-sm leading-6 text-muted">O sistema calcula a matriz. Depois, o COO explica as forças, os desvios e de 3 a 5 oportunidades com base nas respostas salvas.</p><form action={finishStrategicDiagnostic}><input type="hidden" name="sessionId" value={session.id}/><button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-black text-white">Calcular e gerar resultado<ArrowRight className="size-4"/></button></form></section>
    : session ? <section className="flex h-full max-h-[760px] w-full min-h-0 flex-col overflow-hidden rounded-3xl border bg-white p-[clamp(.75rem,2.2dvh,1.25rem)] shadow-xl"><div className="mb-2 flex shrink-0 items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f5e8d8] text-primary"><Target className="size-5"/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Identificação Estratégica Operacional</p><p className="text-sm text-muted">{company.name}</p></div></div><StrategicDiagnosticForm sessionId={session.id} questions={template.questions} currentIndex={index} initialValue={current?.value} initialNotes={current?.notes ?? ""} error={params.error}/></section>
    : <section className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-xl"><Route className="mx-auto size-10 text-primary"/><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-primary">Diagnóstico operacional</p><h1 className="mt-2 text-3xl font-black">Veja onde a operação pode melhorar</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">São 46 perguntas curtas, divididas em 7 temas. Ao fim de cada tema, informe o efeito observado. O sistema calcula a nota, o desempenho e a posição na matriz.</p><p className="mt-3 text-xs font-semibold text-muted">Uma pergunta por tela · respostas salvas a cada avanço</p><form action={startStrategicDiagnostic}><button className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-black text-white">Iniciar diagnóstico<ArrowRight className="size-4"/></button></form></section>}
  </div></div></main>;
}
