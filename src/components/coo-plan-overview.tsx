import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowLeft, CalendarDays, CheckCircle2 } from "lucide-react";
import { cooPlanSchema } from "@/core/coo-workshop";
import { CooWorkshopPlan } from "./coo-workshop-plan";

type OverviewTask = { id: string; title: string; status: string; dueAt: Date | null };
export function CooPlanOverview({plan,sourceDiagnosis,threadId,demo,approval,error}:{
  plan:{id:string;title:string;objective:string;status:string;targetOutcome:unknown;tasks:OverviewTask[]};
  sourceDiagnosis?:string;threadId?:string;demo:boolean;approval:ReactNode;error?:string;
}) {
  const parsed=cooPlanSchema.safeParse(plan.targetOutcome);if(!parsed.success)return null;
  const actions=parsed.data.initiatives.flatMap(i=>i.actions);
  const pending=plan.status==="DRAFT",active=plan.status==="ACTIVE";
  const nextIndex=plan.tasks.findIndex(task=>["TODO","IN_PROGRESS"].includes(task.status));
  const nextTask=nextIndex>=0?plan.tasks[nextIndex]:null;
  const nextAction=actions[nextIndex];
  const completed=plan.tasks.filter(t=>t.status==="DONE").length;
  const allDone=plan.tasks.length>0&&completed===plan.tasks.length;
  const consultant=threadId?`/assistente?chat=${threadId}`:"/assistente";
  const nextHref=pending?"#quadro-plano":active&&nextTask?`/tarefas/${nextTask.id}`:consultant;
  const nextLabel=pending?"Revisar meu plano":active&&nextTask?"Abrir próximo passo":allDone?"Revisar os resultados":"Conversar com o COO";
  return <div className="mx-auto max-w-6xl space-y-7 pb-5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">{sourceDiagnosis?<Link href={`/diagnostico?id=${sourceDiagnosis}`} className="inline-flex min-h-9 items-center gap-2 hover:text-primary"><ArrowLeft aria-hidden="true" className="size-3.5"/>Diagnóstico de origem</Link>:<span>Consultoria operacional</span>}<span>{pending?"Aguardando sua aprovação":plan.status==="PAUSED"?"Plano pausado":plan.status==="COMPLETED"?"Plano encerrado":"Plano aprovado"} · {completed}/{plan.tasks.length} tarefas concluídas</span></div>
    <header><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meu plano de ação</h1><p className="mt-2 text-xs leading-5 text-muted">{plan.title}</p></header>
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
    <section aria-label="Seu próximo passo" className="rounded-xl border border-[#d9e3ee] border-l-[3px] border-l-[#a17c55] bg-[#f1f5fa] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="max-w-2xl"><p className="text-xs font-semibold text-[#57708a]">{pending?"Antes de começar":active&&nextTask?"Seu próximo passo":allDone?"Hora de conferir o resultado":"Organize a próxima ação"}</p><h2 className="mt-2 text-lg font-semibold leading-7">{pending?"Confira o combinado. Você decide quando começar.":active&&nextTask?(nextAction?.execution?.steps[0]?.title??nextTask.title):allDone?"Concluir tarefas não é o mesmo que resolver o problema.":"Revise com o COO o que precisa acontecer agora."}</h2><p className="mt-2 text-sm leading-6 text-[#485b70]">{pending?"Veja uma iniciativa por vez no quadro abaixo. Depois de aprovar, os prazos e as tarefas são liberados.":active&&nextTask?(nextAction?.execution?.steps[0]?.instruction??nextTask.title):allDone?"Leve os registros ao COO para comparar o resultado com o ponto de partida.":"O plano permanece salvo. Nenhuma ação é iniciada por esta tela."}</p></div><Link href={nextHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white lg:self-center">{nextLabel}<ArrowRight aria-hidden="true" className="size-4"/></Link></div>
      {active&&nextAction?<div className="mt-4 border-t border-[#d9e3ee] pt-4"><p className="text-xs font-semibold text-[#57708a]">Por que começar por aqui</p><p className="mt-1 text-sm leading-6 text-[#485b70]">{nextAction.why}</p></div>:null}
    </section>
    <div className="border-b border-[#e2e6eb] pb-6"><p className="text-sm font-semibold text-primary">Objetivo deste ciclo</p><p className="mt-2 max-w-4xl text-sm leading-6 text-[#39485b]">{plan.objective}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden="true" className="size-3.5"/>{parsed.data.initiatives.length} iniciativas · uma de foco principal</span><span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3.5"/>{pending?"Prazos contam após a aprovação":"Prazos nas tarefas e no quadro abaixo"}</span></div></div>
    {demo?<details className="text-xs text-muted"><summary className="cursor-pointer">Sobre os dados deste exemplo</summary><p className="mt-2 max-w-3xl leading-5">O plano usa o diagnóstico salvo e relatos anteriores. Sugestões e exemplos não são resultados medidos. O modo Testar sem salvar não registra produção.</p></details>:null}
    <CooWorkshopPlan key={plan.id} outcome={plan.targetOutcome} tasks={plan.tasks.map(t=>({id:t.id,status:t.status,dueAt:t.dueAt?.toISOString()??null}))} status={plan.status}/>
    {pending?<section id="aprovar-plano" className="scroll-mt-24 rounded-xl border border-[#e2e6eb] bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">O plano faz sentido para sua fábrica?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Confira responsáveis e prazos. A aprovação libera até três tarefas por vez e define este como seu plano ativo.</p><div className="mt-5">{approval}</div></section>:null}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e6eb] pt-5 text-sm"><Link href={`/tarefas?plan=${plan.id}`} className="inline-flex min-h-10 items-center gap-2 font-semibold">Ver todas as tarefas<ArrowRight aria-hidden="true" className="size-4"/></Link><Link href={consultant} className="inline-flex min-h-10 items-center text-muted underline underline-offset-4">Tirar uma dúvida com o COO</Link></footer>
  </div>;
}
