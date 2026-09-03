"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, CalendarDays, CircleHelp, Coins, ListChecks, MapPin, Target, UserRound } from "lucide-react";
import { cooPlanSchema } from "@/core/coo-workshop";
import { ExecutionInstructions } from "./execution-instructions";

export type PlanTaskPreview = { id: string; status?: string; dueAt?: string | null };

export function CooWorkshopPlan({ outcome, tasks = [], status = "DRAFT" }: {
  outcome: unknown; tasks?: PlanTaskPreview[]; status?: string;
}) {
  const [selected, setSelected] = useState(0);
  const panelId = useId();
  const parsed = cooPlanSchema.safeParse(outcome);
  if (!parsed.success) return null;
  const initiatives = parsed.data.initiatives;
  const activeIndex = Math.min(selected, initiatives.length - 1);
  const item = initiatives[activeIndex];
  const offset = initiatives.slice(0, activeIndex).reduce((sum, initiative) => sum + initiative.actions.length, 0);

  return <section id="quadro-plano" className="scroll-mt-24 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h2 className="text-lg font-semibold">Seu plano em uma página</h2><p className="mt-1 text-sm text-muted">Escolha uma iniciativa. Veja o combinado, depois abra a tarefa.</p></div>
      <span className="text-xs text-muted">{initiatives.length} {initiatives.length === 1 ? "iniciativa" : "iniciativas"}</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 lg:flex" role="group" aria-label="Escolher iniciativa">
      {initiatives.map((initiative, index) => <button key={index} type="button" aria-pressed={index === activeIndex} aria-controls={panelId} onClick={() => setSelected(index)} className={`flex min-h-16 min-w-0 flex-1 items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${index === activeIndex ? "border-[#9eb3ca] bg-[#edf2f8] text-primary shadow-sm" : "border-[#e2e6eb] bg-white text-muted hover:bg-[#f8fafc]"}`}>
        <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${index === activeIndex ? "bg-white text-primary shadow-sm" : "bg-[#f3f5f8] text-[#697789]"}`}>{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block text-sm font-semibold leading-5">{initiative.title}</span><span className="mt-1 block text-[11px] font-normal">{initiative.kind === "PRIMARY" ? "Foco principal" : "Apoio ao foco principal"}</span></span>
      </button>)}
    </div>
    <div id={panelId} key={activeIndex} className="space-y-4" aria-label={`Iniciativa ${activeIndex + 1}: ${item.title}`}>
      {item.actions.map((action, index) => {
        const task = tasks[offset + index];
        const due = task?.dueAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(task.dueAt)) : null;
        const rows = [
          { label: "O que fazer", code: "What", icon: ListChecks, text: action.what },
          { label: "Por que fazer", code: "Why", icon: CircleHelp, text: action.why },
          { label: "Quem cuida", code: "Who", icon: UserRound, text: action.who },
          { label: "Quando", code: "When", icon: CalendarDays, text: status === "DRAFT" ? `${action.whenDays} dias após a aprovação` : due ? `Prazo: ${due}` : `${action.whenDays} dias a partir da aprovação` },
          { label: "Onde", code: "Where", icon: MapPin, text: action.where },
          { label: "Como fazer", code: "How", icon: Target, text: action.how },
          { label: "Quanto custa", code: "How much", icon: Coins, text: action.howMuch },
        ];
        return <article key={index} className="overflow-hidden rounded-xl border border-[#dbe1e9] bg-white shadow-[0_2px_10px_rgba(11,19,32,0.03)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e6eb] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f5eee5] text-[#896340]"><ListChecks aria-hidden="true" className="size-5"/></span><div><h3 className="text-base font-semibold">Quadro 5W2H{item.actions.length > 1 ? ` · Ação ${index + 1}` : ""}</h3><p className="mt-1 text-xs text-muted">Sete respostas para executar sem adivinhar.</p></div></div>
            {task ? <Link href={`/tarefas/${task.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9e0e8] px-3 py-2 text-sm font-semibold hover:bg-[#f8fafc]">{status === "DRAFT" ? "Ver tarefa antes de aprovar" : "Abrir esta tarefa"}<ArrowUpRight aria-hidden="true" className="size-4"/></Link> : null}
          </header>
          <table className="hidden w-full table-fixed border-collapse text-left text-sm sm:table">
            <caption className="sr-only">5W2H de {item.title}, ação {index + 1}</caption>
            <thead><tr className="bg-[#f5f7fa] text-xs text-[#596575]"><th scope="col" className="w-[210px] px-6 py-3 font-semibold">Definição</th><th scope="col" className="px-6 py-3 font-semibold">O combinado</th></tr></thead>
            <tbody>{rows.map(({label,icon:Icon,text},rowIndex)=><tr key={label} className={rowIndex % 2 ? "bg-[#fafbfd]" : "bg-white"}><th scope="row" className="border-t border-[#e9edf2] px-6 py-4 align-top font-semibold"><span className="flex items-center gap-2.5"><Icon aria-hidden="true" className="size-4 shrink-0 text-[#788798]"/>{label}</span></th><td className="break-words border-t border-[#e9edf2] px-6 py-4 align-top font-normal leading-6 text-[#39485b]">{text}</td></tr>)}</tbody>
          </table>
          <dl className="divide-y divide-[#e9edf2] sm:hidden">{rows.map(({label,icon:Icon,text},rowIndex)=><div key={label} className={`px-5 py-4 ${rowIndex % 2 ? "bg-[#fafbfd]" : ""}`}><dt className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon aria-hidden="true" className="size-3.5"/>{label}</dt><dd className="mt-2 break-words text-sm leading-6 text-[#39485b]">{text}</dd></div>)}</dl>
          <details className="group border-t border-[#e2e6eb] px-5 sm:px-6"><summary className="cursor-pointer py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Como executar e conferir a entrega</summary><div className="pb-5">{action.execution ? <ExecutionInstructions guide={action.execution}/> : <p className="text-sm leading-6">{action.how}</p>}</div></details>
          <details className="border-t border-[#e2e6eb] px-5 sm:px-6"><summary className="cursor-pointer py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">O que medir e quando voltar ao COO</summary><dl className="grid gap-5 pb-6 text-sm sm:grid-cols-2">{Object.entries({"Indicador":action.indicator,"Ponto de partida":action.baseline,"Meta sugerida":action.target,"Entrega esperada":action.proof,"Quando revisar":action.reviewCadence}).map(([label,value])=><div key={label}><dt className="text-xs font-semibold text-[#596575]">{label}</dt><dd className="mt-1.5 leading-6">{value}</dd></div>)}</dl></details>
        </article>;
      })}
      <details className="rounded-xl border border-[#e2e6eb] bg-white px-5 sm:px-6"><summary className="cursor-pointer py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Por que esta iniciativa entrou no plano?</summary><div className="grid gap-5 pb-5 text-sm sm:grid-cols-2"><div><p className="text-xs font-semibold text-[#596575]">Fatos e relatos registrados</p><p className="mt-2 leading-6">{item.facts}</p></div><div><p className="text-xs font-semibold text-[#596575]">Hipótese — ainda precisa ser confirmada</p><p className="mt-2 leading-6">{item.hypothesis}</p></div></div><details className="border-t border-[#e9edf2] py-3"><summary className="cursor-pointer text-xs text-muted">Consultar referências do diagnóstico e da conversa</summary><p className="mt-2 break-all pb-2 text-xs leading-5 text-muted">{item.evidenceCodes.join(" · ")}</p></details></details>
    </div>
  </section>;
}
