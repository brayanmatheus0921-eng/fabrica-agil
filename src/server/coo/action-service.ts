import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Prisma, CooActionProposal } from "@/generated/prisma/client";
import { validateCooAction, assertCooWorkflow, taskStatusLabels, priorityLabels, projectStatusLabels, type CooAction, type CooProposalView, type CooActionResult } from "@/core/coo-actions";
import { applyWorkshopPatch, readWorkshop, newWorkshop, STAGE_LABELS } from "@/core/coo-workshop";
import { validateCanvas, type CanvasContent } from "@/core/workspace-artifacts";
import { activateDraftPlan } from "@/server/plans/approve-plan";
import { persistWorkshopPlan } from "@/server/ai/workshop-persistence";
import { readExecutionGuide, validateFormValues, validateProductionEvent } from "@/core/task-execution";
import { readRecords, eventsFrom } from "@/core/task-records";

type DB = Prisma.TransactionClient;
export type ActionActor = { companyId: string; userId: string; membershipId: string };
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const required = <T>(value: T | null, label: string): T => { if (!value) throw new Error(`${label} não encontrado nesta empresa.`); return value; };
const dueDate = (value: string | null) => value ? new Date(`${value}T12:00:00-03:00`) : null;
const dateLabel = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Não informado";
const display = (v: unknown) => v === null || v === undefined || v === "" ? "Não informado" : String(v);
function canvasPreview(c: CanvasContent) {
  return [`Finalidade: ${c.purpose}`,`Instruções: ${c.instructions}`,...c.sections.map(s=>`${s.heading}\n${s.body}`),...(c.columns.length?[`Colunas: ${c.columns.join(" · ")}`,...c.rows.map(row=>row.join(" · "))]:[]),...(c.example.length?[`Exemplo fictício: ${c.example.join(" · ")}`]:[])];
}
function guidePreview(raw: unknown) {
  const g=readExecutionGuide(raw); if(!g)return "Não informado";
  return [...g.steps.map((s,i)=>`${i+1}. ${s.title}: ${s.instruction}\nConferir: ${s.doneWhen}`),`Conclusão: ${g.completionCriteria}`,`Melhoria: ${g.improvementCriteria}`,`Revisão: ${g.reviewQuestion}`,...(g.recording?[`Registro: ${g.recording.title} · Unidade: ${g.recording.unit}\n${g.recording.instructions}`,...g.recording.fields.map(f=>`${f.label} (${f.type==="NUMBER"?"número":"texto"}, ${f.required?"obrigatório":"opcional"}): ${f.hint} · Exemplo fictício: ${f.example}`)]:[])].join("\n");
}

export function proposalView(row: CooActionProposal): CooProposalView {
  const action = object(row.action);
  return { id: row.id, threadId: row.threadId, sourceMessageId: row.sourceMessageId, summary: row.summary, details: row.details as string[], status: row.status, createdAt: row.createdAt.toISOString(), resumeInterview: action.type === "workshop.start" || action.type === "workshop.patch", ...(row.result ? { result: row.result as CooActionResult } : {}) };
}

async function authorize(db: DB, actor: ActionActor) {
  required(await db.companyMembership.findFirst({ where: { id: actor.membershipId, companyId: actor.companyId, userId: actor.userId } }), "Acesso");
}

// Snapshots include linked records. Any changed value forces a new proposal.
async function inspect(db: DB, actor: ActionActor, threadId: string, a: CooAction) {
  const companyId = actor.companyId;
  const thread = required(await db.conversationThread.findFirst({ where: { id: threadId, companyId } }), "Conversa");
  const workflow=readWorkshop(thread.workflowState);
  assertCooWorkflow(workflow,a);
  const plan = async (id: string, active = false) => {
    const row = required(await db.actionPlan.findFirst({ where: { id, companyId }, include: { tasks: { orderBy: { id: "asc" } } } }), "Projeto");
    if (active && row.status !== "ACTIVE") throw new Error("O projeto precisa estar ativo para essa ação.");
    return row;
  };
  const task = async (id: string) => {
    const row = required(await db.task.findFirst({ where: { id, companyId }, include: { actionPlan: true, evidence: { orderBy: { id: "asc" } } } }), "Tarefa");
    if (row.actionPlan.status !== "ACTIVE") throw new Error("Ative ou aprove o projeto antes de alterar suas tarefas.");
    return row;
  };
  const revision = { workflowState: thread.workflowState };
  switch (a.type) {
    case "project.create": return { existing: await db.actionPlan.findMany({ where: { companyId, title: { equals: a.title, mode: "insensitive" } }, select: { id: true, title: true } }) };
    case "project.update": {
      const project = await plan(a.planId);
      if (["DRAFT", "CANCELLED"].includes(project.status)) throw new Error("Revise e aprove o rascunho antes de alterar o projeto.");
      if (a.status === "COMPLETED" && project.tasks.some(t => !["DONE", "CANCELLED"].includes(t.status))) throw new Error("Há tarefas pendentes. Conclua ou cancele cada uma antes de concluir o projeto.");
      return { project };
    }
    case "task.create": return { project: await plan(a.planId, true) };
    case "task.update": return { task: await task(a.taskId), ...(a.planId ? { destination: await plan(a.planId, true) } : {}) };
    case "task.status": case "task.note": return { task: await task(a.taskId) };
    case "task.record": {
      const row=await task(a.taskId), guide=readExecutionGuide(row.executionGuide);
      if(!["TODO","IN_PROGRESS"].includes(row.status)||!guide?.recording)throw Error("Esta tarefa não está liberada para preencher registros.");
      const records=readRecords([...row.evidence].sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime()));
      if(a.intent==="UNDO") {if(!records.some(r=>!r.voided))throw Error("Não há registro para desfazer.");}
      else if(guide.recording.kind==="FORM")validateFormValues(guide,a.values??{});
      else validateProductionEvent(eventsFrom(records),a.event);
      return {task:row};
    }
    case "plan.approve": {
      const project = await plan(a.planId);
      if (project.status !== "DRAFT") throw new Error("Este plano não está aguardando aprovação.");
      const source = object(project.baseline).threadId;
      return { project, sourceThread: typeof source === "string" ? await db.conversationThread.findFirst({ where: { id: source, companyId }, select: { id: true, workflowState: true } }) : null };
    }
    case "workshop.start": {
      if (readWorkshop(thread.workflowState)) throw new Error("Esta conversa já tem um diagnóstico vinculado. Abra uma nova conversa para outro ciclo.");
      const diagnosis = required(await db.diagnosticSession.findFirst({ where: { id: a.diagnosticId, companyId, status: "COMPLETED" } }), "Diagnóstico preenchido");
      return { ...revision, diagnosis };
    }
    case "workshop.patch": {
      const state = required(readWorkshop(thread.workflowState), "Plano em construção");
      const diagnosis = required(await db.diagnosticSession.findFirst({ where: { id: state.diagnosticId, companyId, status: "COMPLETED" }, include: { answers: { include: { question: true } } } }), "Diagnóstico");
      const messages = await db.conversationMessage.findMany({ where: { threadId, role: "USER" }, select: { id: true, content: true } });
      const methods = await db.improvementMethod.findMany({ where: { status: "ACTIVE", versions: { some: { publishedAt: { not: null } } } }, select: { code: true } });
      applyWorkshopPatch(state, a.patch, messages, diagnosis.answers.map(r => r.question.code), methods.map(m => m.code));
      return { ...revision, diagnosis, project: state.planId ? await plan(state.planId) : null };
    }
    case "artifact.save": {
      validateCanvas(a.content);
      const destination=a.taskId?await task(a.taskId):null;
      if(workflow?.planId && destination?.actionPlanId!==workflow.planId)throw Error("A ferramenta deve pertencer a uma tarefa deste plano.");
      return { task: destination, artifact: a.replaceArtifactId ? required(await db.workspaceArtifact.findFirst({ where: { id: a.replaceArtifactId, companyId } }), "Arquivo") : null };
    }
    case "checkin.save": return { project: await plan(a.planId, true), checkin: a.checkinId ? required(await db.progressCheckin.findFirst({ where: { id: a.checkinId, companyId, actionPlanId: a.planId } }), "Acompanhamento") : null };
    case "evidence.correct": {
      const evidence = required(await db.evidenceOutput.findFirst({ where: { id: a.evidenceId, companyId }, include: {task:{select:{title:true,actionPlan:{select:{title:true}}}},checkin:{select:{summary:true,actionPlan:{select:{title:true}}}}} }), "Evidência");
      if (evidence.type !== "NOTE" || ["FORM_ENTRY", "PRODUCTION_EVENT"].includes(String(object(evidence.metadata).kind))) throw new Error("Use o formulário da tarefa para corrigir registros estruturados; uma nota não pode substituir uma medição.");
      if (object(evidence.metadata).voided) throw new Error("Este registro já foi corrigido.");
      return { evidence };
    }
    case "metric.record": return { metric: required(await db.metricDefinition.findFirst({ where: { id: a.metricId, companyId } }), "Indicador") };
    case "memory.save": return { memory: a.memoryId ? required(await db.companyMemory.findFirst({ where: { id: a.memoryId, companyId, invalidatedAt: null } }), "Memória") : null };
    case "company.update": return { company: required(await db.company.findUnique({ where: { id: companyId }, select: { name: true, sector: true, productionType: true, teamSize: true, onboardingData: true, updatedAt: true } }), "Empresa") };
  }
}

function preview(a: CooAction, snapshot: unknown): { summary: string; details: string[] } {
  const s = object(snapshot), p = object(s.project), t = object(s.task);
  const target = t.title ? [`Tarefa: ${t.title}`, `Projeto: ${object(t.actionPlan).title}`] : p.title ? [`Projeto: ${p.title}`] : [];
  const changes = (fields: Record<string, unknown>, original: Record<string, unknown>, labels: Record<string, string>) => Object.entries(fields).filter(([k]) => labels[k]).map(([k, v]) => `${labels[k]}: ${display(original[k])} → ${display(v)}`);
  switch (a.type) {
    case "project.create": return { summary: `Posso criar o projeto “${a.title}”?`, details: [`Objetivo: ${a.objective}`, `Prazo: ${a.horizonDays} dias após aprovação`, ...(Array.isArray(s.existing) && s.existing.length ? ["Atenção: já existe projeto com esse nome. Esta ação criará outro projeto."] : [])] };
    case "project.update": return { summary: `Posso atualizar o projeto “${p.title}”?`, details: [...target, ...changes({ title: a.title, objective: a.goal, windowDays: a.horizonDays, status: a.status ? projectStatusLabels[a.status] : undefined }, { ...p, status: projectStatusLabels[p.status as keyof typeof projectStatusLabels] }, { title: "Nome", objective: "Objetivo", windowDays: "Prazo em dias", status: "Situação" }).filter(line => !line.endsWith("→ Não informado"))] };
    case "task.create": return { summary: `Posso criar a tarefa “${a.title}”?`, details: [...target, `Descrição: ${display(a.description)}`, `Responsável: ${display(a.ownerName)}`, `Prazo: ${dateLabel(dueDate(a.dueDate))}`, `Prioridade: ${priorityLabels[a.priority]}`, ...(Array.isArray(p.tasks) && p.tasks.some(x => String(object(x).title).toLowerCase() === a.title.toLowerCase()) ? ["Atenção: já existe tarefa com esse nome neste projeto."] : [])] };
    case "task.update": return { summary: `Posso atualizar a tarefa “${t.title}”?`, details: [...target, ...changes(Object.fromEntries(Object.entries(a).filter(([,v]) => v !== undefined)), t, { title: "Nome", description: "Descrição", ownerName: "Responsável", expectedOutput: "Entrega esperada" }), ...(a.dueDate !== undefined ? [`Prazo: ${dateLabel(t.dueAt)} → ${dateLabel(dueDate(a.dueDate))}`] : []), ...(a.priority ? [`Prioridade: ${priorityLabels[t.priority as keyof typeof priorityLabels]} → ${priorityLabels[a.priority]}`] : []), ...(a.planId ? [`Mover para: ${object(s.destination).title}`] : [])] };
    case "task.status": return { summary: `Posso marcar “${t.title}” como ${taskStatusLabels[a.status].toLowerCase()}?`, details: [...target, `Situação: ${taskStatusLabels[t.status as keyof typeof taskStatusLabels]} → ${taskStatusLabels[a.status]}`, ...(a.report ? [`Relato do gestor: ${a.report}`] : [])] };
    case "task.note": return { summary: `Posso registrar esta informação em “${t.title}”?`, details: [...target, `Tipo: ${{CONTEXT:"Contexto",APPLIED:"Execução",RESULT:"Resultado",BLOCKER:"Bloqueio"}[a.category]}`, `Relato do gestor: ${a.text}`] };
    case "task.record": {
      const guide=readExecutionGuide(t.executionGuide)!;
      const last=Array.isArray(t.evidence)?readRecords(t.evidence as Array<{id:string;metadata:unknown}>).filter(r=>!r.voided).sort((a,b)=>a.at.localeCompare(b.at)).at(-1):null;
      return {summary:`Posso ${a.intent==="UNDO"?"desfazer o último registro":"preencher este registro"} de “${t.title}”?`,details:[...target,`Formulário: ${guide.recording!.title}`,a.intent==="UNDO"?`Último registro: ${last?.at} · ${JSON.stringify(last?.values??last?.event)}`:a.event?`Evento: ${a.event.event} · Pedido: ${a.event.order} · Peça: ${a.event.product} · Quantidade: ${a.event.quantity} · Nota: ${a.event.note}`:guide.recording!.fields.map(f=>`${f.label}: ${display(a.values?.[f.key])}`).join("\n"),"O horário de registro é automático. Os dados são informados pelo gestor."]};
    }
    case "plan.approve": return { summary: `Posso aprovar e iniciar “${p.title}”?`, details: [...target, `Objetivo: ${p.objective}`, `Ciclo: ${p.windowDays} dias`, ...((p.tasks as Array<Record<string, unknown>>) ?? []).map(task => `Tarefa: ${task.title} · ${display(task.expectedOutput)}`), "As primeiras três tarefas serão liberadas. Os outros projetos continuam ativos."] };
    case "workshop.start": return { summary: "Posso usar este diagnóstico para construir o plano?", details: [`Diagnóstico: ${object(s.diagnosis).title}`, `Concluído em: ${dateLabel(object(s.diagnosis).completedAt)}`, "As respostas e a matriz do diagnóstico serão preservadas."] };
    case "workshop.patch": return { summary: a.patch.stage === "REVIEW" ? "Posso aprovar o plano completo e liberar as tarefas?" : `Posso salvar esta etapa de preparação · ${STAGE_LABELS[a.patch.stage]}?`, details: [a.patch.summary, ...a.patch.confirmedFacts.map(f => `Fato informado: ${f.statement}`), ...a.patch.hypotheses.map(h => `Hipótese: ${h}`), ...(a.patch.decision ? [`Prioridade: ${a.patch.decision.primaryTitle} — ${a.patch.decision.reason}`] : []), ...(a.patch.plan ? [`Objetivo: ${a.patch.plan.objective}`, `Iniciativas: ${a.patch.plan.initiatives.length}`, ...a.patch.plan.initiatives.flatMap(i => [i.title, ...i.actions.map(x => `${x.what} · ${x.who} · ${x.whenDays} dias\nPor quê: ${x.why}\nOnde: ${x.where}\nComo: ${x.how}\nCusto: ${x.howMuch}\nIndicador: ${x.indicator}\nBase: ${x.baseline}\nMeta: ${x.target}\nEntrega: ${x.proof}\nRevisão: ${x.reviewCadence}\nGuia: ${guidePreview(x.execution)}`)])] : []), a.patch.stage === "REVIEW" ? "Ao aprovar, o plano aparecerá em Projetos/Plano e as tarefas serão liberadas." : "Esta aprovação salva só a etapa de preparação; ainda não cria nem inicia o plano ou as tarefas."] };
    case "artifact.save": return { summary: `Posso ${a.replaceArtifactId ? "substituir" : "criar"} “${a.content.title}”?`, details: [`Tipo: ${a.content.kind==="DOCUMENT"?"Documento":"Planilha"}`, `Tarefa: ${display(t.title)}`, ...(a.replaceArtifactId ? [`Arquivo atual: ${object(s.artifact).title} · revisão ${object(s.artifact).revision}`] : []), ...canvasPreview(a.content)] };
    case "checkin.save": return { summary: "Posso salvar este acompanhamento?", details: [...target, `Execução: ${a.summary}`, `Resultado informado: ${a.observedOutcome}`, `Bloqueios: ${display(a.blockers)}`, `Evidência informada: ${a.evidence}`, ...(a.checkinId ? ["Atualiza o registro selecionado; a versão anterior ficará na auditoria."] : [])] };
    case "evidence.correct": { const e=object(s.evidence), parent=object(e.task??e.checkin); return { summary: "Posso corrigir este registro?", details: [`Projeto: ${display(object(parent.actionPlan).title)}`, `Tarefa ou acompanhamento: ${display(parent.title??parent.summary)}`, `Registro: ${e.label} · ${dateLabel(e.createdAt)}`, `Antes: ${e.textValue}`, `Correção: ${a.text}`, `Motivo: ${a.reason}`, "O original ficará marcado como corrigido no histórico."] }; }
    case "metric.record": return { summary: `Posso registrar uma medição de “${object(s.metric).name}”?`, details: [`Valor: ${a.value} ${object(s.metric).unit}`, `Data: ${dateLabel(dueDate(a.measuredDate))}`, `Fonte informada: ${a.source}`] };
    case "memory.save": return { summary: `Posso salvar “${a.title}” na memória da empresa?`, details: [a.content, `Classificação: ${{FACT:"Fato informado",DECISION:"Decisão",ASSUMPTION:"Hipótese",OUTCOME:"Resultado informado",PREFERENCE:"Preferência"}[a.kind]}`, ...(s.memory ? [`Substitui: ${object(s.memory).content}`] : [])] };
    case "company.update": { const c = object(s.company); return { summary: "Posso atualizar este dado da empresa?", details: [`Campo: ${companyFieldLabels[a.field]}`, `Antes: ${display(c[a.field] ?? object(c.onboardingData)[a.field])}`, `Depois: ${a.value}`] }; }
  }
}
export const companyFieldLabels: Record<string, string> = { name:"Nome", sector:"Setor", productionType:"Tipo de produção", teamSize:"Equipe", monthlyRevenueRange:"Faturamento mensal", monthlyOrderVolume:"Pedidos mensais", onTimeDeliveryRange:"Entregas no prazo", reworkRange:"Retrabalho", ownerDependency:"Dependência do dono", mainGoal:"Objetivo", biggestChallenge:"Desafio", productionStages:"Etapas produtivas" };

export async function prepareAction(db: DB, actor: ActionActor, threadId: string, raw: unknown) {
  const action = validateCooAction(raw);
  return { action, ...preview(action, await inspect(db, actor, threadId, action)) };
}

export async function proposeAction(db: DB, actor: ActionActor, threadId: string, sourceMessageId: string, raw: unknown) {
  await authorize(db, actor);
  required(await db.conversationMessage.findFirst({ where: { id: sourceMessageId, threadId, role: "USER", authorUserId: actor.userId, thread: { companyId: actor.companyId } } }), "Mensagem de origem");
  const action = validateCooAction(raw);
  const snapshot = await inspect(db, actor, threadId, action);
  const dedupeKey = createHash("sha256").update(JSON.stringify([actor.companyId, sourceMessageId, action])).digest("hex");
  const existing = await db.cooActionProposal.findUnique({ where: { dedupeKey } });
  if (existing) return existing;
  // A new proposal replaces the old one; a prior 'yes' can never approve edited data.
  await db.cooActionProposal.updateMany({ where: { companyId: actor.companyId, threadId, status: "PENDING" }, data: { status: "STALE" } });
  return db.cooActionProposal.create({ data: { companyId: actor.companyId, threadId, sourceMessageId, proposedByUserId: actor.userId, action: json(action), expectedSnapshot: json(snapshot), ...preview(action, snapshot), dedupeKey, expiresAt: new Date(Date.now() + 30 * 60_000) } });
}

async function apply(db: DB, actor: ActionActor, proposal: CooActionProposal, a: CooAction): Promise<CooActionResult> {
  const { companyId } = actor, threadId = proposal.threadId, now = new Date();
  const s = object(proposal.expectedSnapshot), project = object(s.project);
  const note = (taskId: string, text: string, category: string) => db.evidenceOutput.create({ data: { companyId, taskId, type: "NOTE", label: category, textValue: text, metadata: { kind: "TASK_UPDATE", category, text, source: "COO_APPROVED", proposalId: proposal.id, reportedBy: actor.userId } } });
  switch (a.type) {
    case "project.create": {
      const p = await db.actionPlan.create({ data: { companyId, title: a.title, objective: a.objective, windowDays: a.horizonDays, status: "ACTIVE", startsAt: now, dueAt: new Date(now.getTime() + a.horizonDays * 86400000), baseline: { source: "MANUAL", createdBy: "COO_APPROVED", proposalId: proposal.id }, targetOutcome: { source: "MANUAL" } } });
      return { message: "Projeto criado.", href: `/tarefas?project=${p.id}` };
    }
    case "project.update": {
      await db.actionPlan.update({ where: { id: a.planId }, data: { title: a.title, objective: a.goal, status: a.status, windowDays: a.horizonDays, ...(a.horizonDays ? { dueAt: new Date(new Date(String(project.startsAt ?? now)).getTime() + a.horizonDays * 86400000) } : {}) } });
      return { message: "Projeto atualizado.", href: `/tarefas?project=${a.planId}` };
    }
    case "task.create": {
      const tasks = project.tasks as Array<{sortOrder:number}>;
      const t = await db.task.create({ data: { companyId, actionPlanId: a.planId, title: a.title, description: a.description, ownerName: a.ownerName, dueAt: dueDate(a.dueDate), priority: a.priority, status: "TODO", startsAt: now, sortOrder: Math.max(0, ...tasks.map(t => t.sortOrder)) + 1 } });
      return { message: "Tarefa criada.", href: `/tarefas/${t.id}` };
    }
    case "task.update": {
      const destination = object(s.destination);
      await db.task.update({ where: { id: a.taskId }, data: { title: a.title, description: a.description, ownerName: a.ownerName, dueAt: a.dueDate === undefined ? undefined : dueDate(a.dueDate), priority: a.priority, expectedOutput: a.expectedOutput, actionPlanId: a.planId, ...(a.planId ? { sortOrder: Math.max(0, ...(destination.tasks as Array<{sortOrder:number}>).map(t=>t.sortOrder)) + 1 } : {}) } });
      return { message: "Tarefa atualizada.", href: `/tarefas/${a.taskId}` };
    }
    case "task.status": await db.task.update({ where: { id: a.taskId }, data: { status: a.status, completedAt: a.status === "DONE" ? now : null } }); if (a.report) await note(a.taskId, a.report, a.status === "DONE" ? "RESULT" : "CONTEXT"); return { message: `Tarefa: ${taskStatusLabels[a.status]}.`, href: `/tarefas/${a.taskId}` };
    case "task.note": await note(a.taskId, a.text, a.category); return { message: "Relato registrado.", href: `/tarefas/${a.taskId}` };
    case "task.record": {
      const task=await db.task.findUniqueOrThrow({where:{id:a.taskId}}),guide=readExecutionGuide(task.executionGuide)!;
      const existing=readRecords(await db.evidenceOutput.findMany({where:{companyId,taskId:a.taskId},orderBy:{createdAt:"asc"}}));
      const recordId=`coo-record-${proposal.id}`,at=now.toISOString();
      if(a.intent==="UNDO"){
        const last=existing.filter(r=>!r.voided).at(-1)!;
        await db.evidenceOutput.update({where:{id:last.id},data:{metadata:json({...last,voided:true,undoneAt:at,proposalId:proposal.id})}});
        await db.evidenceOutput.create({data:{id:recordId,companyId,taskId:a.taskId,type:"NOTE",label:"Correção de registro",metadata:{kind:"UNDO",targetId:last.id,proposalId:proposal.id}}});
      }else{
        const metadata=guide.recording!.kind==="PRODUCTION_LOG"?{id:recordId,at,kind:"PRODUCTION_EVENT",event:validateProductionEvent(eventsFrom(existing),a.event)}:{id:recordId,at,kind:"FORM_ENTRY",values:validateFormValues(guide,a.values??{})};
        await db.evidenceOutput.create({data:{id:recordId,companyId,taskId:a.taskId,type:"NOTE",label:guide.recording!.title,textValue:JSON.stringify(metadata),metadata:json({...metadata,source:"COO_APPROVED",proposalId:proposal.id})}});
      }
      return {message:a.intent==="UNDO"?"Último registro desfeito; histórico preservado.":"Registro preenchido.",href:`/tarefas/${a.taskId}`};
    }
    case "plan.approve": if (!await activateDraftPlan(db, companyId, a.planId)) throw new Error("O plano mudou ou está sendo revisado. Solicite uma nova proposta."); return { message: "Plano aprovado e tarefas liberadas.", href: `/plano-de-acao?id=${a.planId}` };
    case "workshop.start": await db.conversationThread.update({ where: { id: threadId }, data: { workflowState: json(newWorkshop(a.diagnosticId, String(object(s.diagnosis).title ?? "Diagnóstico"))) } }); return { message: "Diagnóstico selecionado. Podemos construir o plano nesta conversa.", href: `/assistente?chat=${threadId}` };
    case "workshop.patch": {
      const thread = await db.conversationThread.findUniqueOrThrow({ where: { id: threadId } });
      const current = required(readWorkshop(thread.workflowState), "Plano em construção");
      const next = { ...current, ...a.patch, revision: current.revision + 1, furthestStage: Math.max(current.furthestStage, ["UNDERSTAND","MEASURE","CAUSES","PRIORITIZE","PLAN","REVIEW","FOLLOW_UP"].indexOf(a.patch.stage)), history: [...current.history, { revision: current.revision, stage: current.stage, summary: current.summary, at: now.toISOString() }] };
      const state = await persistWorkshopPlan(db, companyId, threadId, next);
      await db.conversationThread.update({ where: { id: threadId }, data: { workflowState: json(state) } });
      if (a.patch.stage === "REVIEW") {
        if (!state.planId || !await activateDraftPlan(db, companyId, state.planId)) throw new Error("Não foi possível iniciar o plano completo. Revise a proposta.");
        return { message: "Plano completo aprovado e tarefas liberadas.", href: `/plano-de-acao?id=${state.planId}` };
      }
      return { message: "Etapa de preparação salva. Ainda faltam o plano completo e sua aprovação.", href: `/assistente?chat=${threadId}` };
    }
    case "artifact.save": {
      const content = validateCanvas(a.content);
      const data = { threadId, taskId: a.taskId, kind: content.kind, title: content.title, content: json(content), confirmedAt: null };
      const file = a.replaceArtifactId ? await db.workspaceArtifact.update({ where: { id: a.replaceArtifactId }, data: { ...data, revision: { increment: 1 } } }) : await db.workspaceArtifact.create({ data: { companyId, ...data } });
      return { message: "Ferramenta salva.", href: `/assistente?chat=${threadId}`, artifactId: file.id };
    }
    case "checkin.save": {
      const data = { summary: a.summary, observedOutcome: a.observedOutcome, blockers: a.blockers || null, submittedByMembershipId: actor.membershipId, status: "SUBMITTED" as const, submittedAt: now, aiEvaluation: null, nextPriority: null, reviewedAt: null };
      const checkin = a.checkinId ? await db.progressCheckin.update({ where: { id: a.checkinId }, data }) : await db.progressCheckin.create({ data: { companyId, actionPlanId: a.planId, ...data } });
      await db.evidenceOutput.create({ data: { companyId, checkinId: checkin.id, type: "NOTE", label: "Evidência informada no chat", textValue: a.evidence, metadata: { source: "COO_APPROVED", proposalId: proposal.id } } });
      return { message: "Acompanhamento salvo.", href: "/acompanhamento" };
    }
    case "evidence.correct": {
      const old = await db.evidenceOutput.findUniqueOrThrow({ where: { id: a.evidenceId } });
      await db.evidenceOutput.update({ where: { id: old.id }, data: { metadata: json({ ...object(old.metadata), voided: true, correctionReason: a.reason, proposalId: proposal.id }) } });
      await db.evidenceOutput.create({ data: { companyId, taskId: old.taskId, checkinId: old.checkinId, type: "NOTE", label: old.label, textValue: a.text, metadata: json({ ...object(old.metadata), text: a.text, voided: false, replaces: old.id, source: "COO_APPROVED", proposalId: proposal.id }) } });
      return { message: "Registro corrigido; original preservado.", href: old.taskId ? `/tarefas/${old.taskId}` : "/acompanhamento" };
    }
    case "metric.record": await db.metricMeasurement.create({ data: { companyId, metricId: a.metricId, value: a.value, measuredAt: dueDate(a.measuredDate)!, source: a.source, note: `Relato aprovado no COO · ${proposal.id}` } }); return { message: "Medição registrada.", href: "/acompanhamento" };
    case "memory.save": if (a.memoryId) await db.companyMemory.update({ where: { id: a.memoryId }, data: { invalidatedAt: now } }); await db.companyMemory.create({ data: { companyId, title: a.title, content: a.content, kind: a.kind, sourceType: "CONVERSATION", sourceId: threadId } }); return { message: "Memória salva.", href: "/memoria" };
    case "company.update": {
      const c = object(s.company);
      const data = ["name","sector","productionType","teamSize"].includes(a.field) ? { [a.field]: a.field === "teamSize" ? Number(a.value) : a.value } : { onboardingData: json({ ...object(c.onboardingData), [a.field]: a.field === "productionStages" ? a.value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean) : a.value }) };
      await db.company.update({ where: { id: companyId }, data });
      return { message: "Dados da empresa atualizados.", href: "/empresa" };
    }
  }
}

// Caller MUST wrap this in a Serializable transaction. The model cannot call it.
export async function decideAction(db: DB, actor: ActionActor, id: string, decision: "approve" | "reject") {
  await authorize(db, actor);
  await db.$queryRaw`SELECT id FROM "Company" WHERE id = ${actor.companyId} FOR UPDATE`;
  const p = required(await db.cooActionProposal.findFirst({ where: { id, companyId: actor.companyId, proposedByUserId: actor.userId } }), "Proposta");
  if (p.status !== "PENDING") return p;
  const setStatus = (status: "REJECTED" | "EXPIRED" | "STALE") => db.cooActionProposal.update({ where: { id }, data: { status, decidedByUserId: actor.userId, decidedAt: new Date() } });
  if (decision === "reject") {
    const rejected=await setStatus("REJECTED");
    await db.conversationMessage.create({data:{threadId:p.threadId,role:"USER",authorUserId:actor.userId,content:`Recusei: ${p.summary}`,metadata:{proposalId:id,decision:"reject"}}});
    return rejected;
  }
  if (p.expiresAt.getTime() <= Date.now()) return setStatus("EXPIRED");
  const thread = required(await db.conversationThread.findFirst({ where: { id: p.threadId, companyId: actor.companyId } }), "Conversa");
  if (thread.generationId) throw new Error("Aguarde a resposta terminar antes de aprovar.");
  const action = validateCooAction(p.action);
  let snapshot;
  try { snapshot = await inspect(db, actor, p.threadId, action); } catch { return setStatus("STALE"); }
  if (!isDeepStrictEqual(json(snapshot), p.expectedSnapshot)) return setStatus("STALE");
  const result = await apply(db, actor, p, action);
  const applied = await db.cooActionProposal.update({ where: { id }, data: { status: "APPLIED", result: json(result), decidedByUserId: actor.userId, decidedAt: new Date() } });
  await db.conversationMessage.create({ data: { threadId: p.threadId, role: "USER", authorUserId: actor.userId, content: `Aprovei: ${p.summary}`, metadata: { proposalId: id, decision: "approve" } } });
  await db.conversationMessage.create({ data: { threadId: p.threadId, role: "ASSISTANT", content: `${result.message} [Ver na plataforma](${result.href})`, metadata: { proposalId: id, applied: true } } });
  return applied;
}
