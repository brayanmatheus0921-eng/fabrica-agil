import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDevCompany } from "@/server/dev-company";
import { readExecutionGuide } from "@/core/task-execution";
import { readRecords } from "@/core/task-records";
import { ExecutionInstructions } from "@/components/execution-instructions";
import { TaskRecorder } from "@/components/task-recorder";
import { TaskActivity, type TaskNoteView } from "@/components/task-activity";
import { ArtifactWorkspace } from "@/components/artifact-workspace";
import { taskNoteSchema } from "@/core/workspace-artifacts";
import { updateTaskStatus } from "../actions";
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
export const dynamic="force-dynamic";
export const metadata={title:"Detalhes da tarefa"};
export default async function TaskPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,company=await getDevCompany();
 const task=await prisma.task.findFirst({where:{id,companyId:company.id},include:{actionPlan:true}});if(!task)notFound();
 const guide=readExecutionGuide(task.executionGuide),evidence=await prisma.evidenceOutput.findMany({where:{taskId:id,companyId:company.id},orderBy:{createdAt:"asc"}});
 const baseline=Object(task.actionPlan.baseline),threadId=typeof baseline.threadId==="string"?baseline.threadId:null;
 const related=await prisma.task.findMany({where:{actionPlanId:task.actionPlanId,companyId:company.id,id:{not:id}},orderBy:{sortOrder:"asc"},select:{id:true,title:true,sortOrder:true}});
 const notes: TaskNoteView[] = evidence.flatMap(row => { const p = taskNoteSchema.safeParse(row.metadata); return p.success ? [{ id: row.id, category: p.data.category, text: p.data.text, at: row.createdAt.toISOString() }] : []; }).reverse();
 const statusLabel = {TODO:"A fazer",IN_PROGRESS:"Em andamento",DONE:"Concluída",BACKLOG:"Próxima etapa",BLOCKED:"Bloqueada",IN_REVIEW:"Em revisão",CANCELLED:"Cancelada"}[task.status];
 return <div className="mx-auto max-w-4xl space-y-6 pb-6">
   <Link className="inline-flex min-h-9 items-center gap-2 text-xs text-muted" href={`/tarefas?project=${task.actionPlanId}`}><ArrowLeft aria-hidden="true" className="size-3.5"/>Voltar ao projeto</Link>
   <header><p className="text-xs text-muted">Tarefa {task.sortOrder} · {task.actionPlan.status==="DRAFT"?"Pendente de aprovação":"Execução acompanhada"}</p><h1 className="mt-2 text-2xl font-medium tracking-tight">{guide?.recording?.title??task.title}</h1>{guide?.recording?<p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{task.title}</p>:null}</header>
   <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 text-sm"><span className="rounded-full bg-surface-muted px-3 py-1">{statusLabel}</span><span className="text-muted">Projeto: {task.actionPlan.title}</span><span className="text-muted">Prazo: {task.dueAt?.toLocaleDateString("pt-BR") ?? "A combinar"}</span>{task.actionPlan.status === "ACTIVE" && task.status !== "CANCELLED" ? <form action={updateTaskStatus} className="ml-auto"><input type="hidden" name="taskId" value={id}/><input type="hidden" name="returnToTask" value="1"/><input type="hidden" name="intent" value={task.status === "DONE" ? "reopen" : task.status === "IN_PROGRESS" ? "complete" : "start"}/><button className="rounded-lg border px-3 py-2 text-xs font-semibold">{task.status === "DONE" ? "Reabrir tarefa" : task.status === "IN_PROGRESS" ? "Marcar como concluída" : "Começar tarefa"}</button></form> : null}</div>
   {guide?<>
     <section className="rounded-xl border border-[#d9e3ee] bg-[#f1f5fa] p-5"><p className="text-xs font-medium text-[#57708a]">Comece por aqui</p><p className="mt-2 text-sm leading-6 text-[#39485b]">{guide.steps[0].instruction}</p>{guide.recording?<a href="#registro-tarefa" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium">Ir para o registro<ArrowDown aria-hidden="true" className="size-4"/></a>:null}</section>
     <details className="rounded-xl border border-[#e2e6eb] bg-white px-5"><summary className="cursor-pointer py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">Ver passo a passo e critérios de conclusão</summary><div className="pb-5"><ExecutionInstructions guide={guide}/></div></details>
     <section id="registro-tarefa" className="scroll-mt-24"><TaskRecorder taskId={id} guide={guide} initialRecords={readRecords(evidence)} canRecord={task.actionPlan.status==="ACTIVE"&&["TODO","IN_PROGRESS"].includes(task.status)}/></section>
   </>:<p className="whitespace-pre-line text-sm leading-6">{task.description}</p>}
   <section className="rounded-xl border bg-white p-5"><ArtifactWorkspace taskId={id} threadId={threadId ?? undefined}/></section>
   <TaskActivity taskId={id} notes={notes} active={task.actionPlan.status === "ACTIVE"}/>
   <div className="grid gap-5 border-t border-[#e2e6eb] pt-5 sm:grid-cols-2"><div><p className="text-xs text-muted">O que entregar ao concluir</p><p className="mt-2 text-sm leading-6">{task.expectedOutput}</p></div><div><p className="text-xs text-muted">Próxima conversa</p><p className="mt-2 text-sm leading-6">{guide?.reviewQuestion??"Conte ao COO o que mudou e o que travou."}</p><Link href={threadId?`/assistente?chat=${threadId}`:"/assistente"} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium">Levar resultado ao COO<ArrowRight aria-hidden="true" className="size-4"/></Link></div></div>
   {related.length?<details className="border-t border-[#e2e6eb] pt-4"><summary className="cursor-pointer text-sm text-muted">Outros registros e tarefas deste plano</summary><nav aria-label="Outras tarefas do plano" className="mt-3 space-y-2">{related.map(t=><Link key={t.id} href={`/tarefas/${t.id}`} className="block rounded-lg border bg-white px-4 py-3 text-sm leading-6">{t.sortOrder}. {t.title}</Link>)}</nav></details>:null}
   <p className="text-xs leading-5 text-muted">Registrar dados não conclui a tarefa automaticamente. Concluir a tarefa não comprova, sozinho, que o problema foi resolvido.</p>
 </div>;
}
