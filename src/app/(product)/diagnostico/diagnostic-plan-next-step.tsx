import { requireAuth } from "@/server/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { diagnosticPlanId } from "@/core/diagnostic-plan";
import { GeneratePlanButton } from "./generate-plan-button";

export async function DiagnosticPlanNextStep({ sessionId }: { sessionId: string }) {
  const plan = await prisma.actionPlan.findFirst({ where: { companyId: (await requireAuth()).companyId, OR: [{ id: diagnosticPlanId(sessionId) }, { baseline: { path: ["diagnosticSessionId"], equals: sessionId } }] }, orderBy: { createdAt: "desc" } });
  return <section className="flex flex-col gap-5 rounded-2xl border bg-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
    <div><p className="text-xs font-semibold  text-[#9a6538]">Próximo passo</p>
      <h2 className="mt-2 text-xl font-semibold">{plan ? "Seu plano está salvo" : "Transforme este diagnóstico em um plano"}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{plan ? (plan.status === "DRAFT" ? "Plano e tarefas pendentes de aprovação. Revise as prioridades antes de começar." : "Abra o plano vinculado a este diagnóstico para acompanhar as tarefas.") : "Converse com o COO para entender as causas, combinar uma prioridade principal e até duas secundárias, e construir as ações. Nada começa sem sua aprovação."}</p>
    </div>
    <div className="shrink-0 space-y-3">{plan ? <Link href={`/plano-de-acao?id=${plan.id}`} className="block rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-white">{plan.status === "DRAFT" ? "Revisar plano" : "Abrir plano de ação"}</Link> : null}{plan ? <details><summary className="cursor-pointer py-2 text-center text-xs font-semibold text-muted">Rever as ações com o COO</summary><div className="pt-2"><GeneratePlanButton sessionId={sessionId} /></div></details> : <GeneratePlanButton sessionId={sessionId} />}</div>
  </section>;
}
