"use client";
import { useState } from "react";
import { Check, Pencil, ShieldCheck, X } from "lucide-react";
import type { CooProposalView } from "@/core/coo-actions";
export function AssistantProposals({rows,busy,onAdjust,onApplied,onChanged}:{rows:CooProposalView[];busy:boolean;onAdjust:(text:string)=>void;onApplied:(proposal:CooProposalView)=>void;onChanged:(proposal:CooProposalView)=>void}) {
  const [working,setWorking]=useState<string|null>(null),[error,setError]=useState("");
  async function decide(id:string,decision:"approve"|"reject") {
    if(working||busy)return;setWorking(id);setError("");
    try {
      const r=await fetch("/api/assistant/proposals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision})});
      const data=await r.json(); if(!r.ok)throw Error(data.error);
      onChanged(data.proposal);
      if(data.proposal.status==="APPLIED")onApplied(data.proposal);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível confirmar. Confira o resultado antes de tentar novamente.");}finally{setWorking(null);}
  }
  const labels={PENDING:"Aguardando sua aprovação",APPLIED:"Aplicada com sua aprovação",REJECTED:"Recusada · nenhuma alteração",EXPIRED:"Expirada · peça uma nova proposta",STALE:"Proposta desatualizada · peça uma nova revisão"};
  return <div className="space-y-3" aria-label="Ações do COO">
    {error?<p role="alert" className="rounded-xl border p-3 text-sm text-red-700">{error}</p>:null}
    {rows.map(p=><section key={p.id} className={`coo-proposal rounded-2xl border bg-surface p-4 sm:p-5 ${p.status==="PENDING"?"border-primary/35 shadow-sm":""}`} aria-label={p.summary}>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted"><ShieldCheck className="size-4 shrink-0"/>{labels[p.status]}</p>
      <h3 className="break-words text-sm font-semibold leading-6">{p.summary}</h3>
      <details open={p.status==="PENDING"} className="mt-3"><summary className="cursor-pointer text-xs text-muted">Conferir os dados da ação</summary><ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm leading-6">{p.details.map((d,i)=><li key={i} className="whitespace-pre-wrap break-words border-l-2 pl-3 [overflow-wrap:anywhere]">{d}</li>)}</ul></details>
      {p.status==="PENDING"?<><p className="mt-4 text-xs text-muted">Só esta ação será executada. Você pode ajustar ou recusar.</p><div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy||!!working} onClick={()=>decide(p.id,"approve")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"><Check className="size-4"/>{working===p.id?"Processando…":"Aprovar ação"}</button>
        <button type="button" disabled={busy||!!working} onClick={()=>onAdjust(`Quero ajustar a proposta: ${p.summary} `)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm disabled:opacity-40"><Pencil className="size-4"/>Ajustar</button>
        <button type="button" disabled={busy||!!working} onClick={()=>decide(p.id,"reject")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm disabled:opacity-40"><X className="size-4"/>Recusar</button>
      </div></>:null}
      {p.result?<p className="mt-3 text-sm">{p.result.message} <a href={p.result.href} className="font-semibold underline underline-offset-4">Ver na plataforma →</a></p>:null}
    </section>)}
  </div>;
}
