import { loadEnvFile } from "node:process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readAccessConfig, sessionTokenHash } from "../src/core/access-credentials";
import { AUTH_COOKIE_NAME } from "../src/core/auth-config";
import { newWorkshop, readWorkshop } from "../src/core/coo-workshop";
import { readExecutionGuide } from "../src/core/task-execution";
import { taskProgress } from "../src/core/task-progress";
import { planThreadId } from "../src/core/plan-thread";

loadEnvFile(".env.local");
loadEnvFile(".env");
assert.equal(new URL(process.env.DATABASE_URL!).hostname,"127.0.0.1","QA aceita só banco local");
const config=readAccessConfig(process.env);
assert.ok(config,"Auth local precisa estar configurada");
assert.ok(process.env.OPENAI_API_KEY,"IA local precisa estar configurada");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
const base="http://127.0.0.1:3000";
const runId=randomUUID().slice(0,8);

async function main(){
  const brayan=await db.user.findFirstOrThrow({where:{OR:[{name:{contains:"brayan",mode:"insensitive"}},{email:{contains:"brayan",mode:"insensitive"}}]},include:{memberships:true}});
  assert.equal(brayan.memberships.length,1,"QA deve selecionar uma única empresa do Brayan");
  const companyId=brayan.memberships[0].companyId;
  const template=await db.diagnosticTemplate.findFirstOrThrow({where:{status:"ACTIVE",questions:{some:{required:true}}},include:{questions:{where:{required:true},orderBy:{order:"asc"},take:1}}});
  const token=randomBytes(32).toString("base64url");
  const session=await db.authSession.create({data:{userId:brayan.id,tokenHash:sessionTokenHash(token,config!),expiresAt:new Date(Date.now()+3600_000)}});
  const diagnosis=await db.diagnosticSession.create({data:{companyId,templateId:template.id,status:"COMPLETED",title:`QA retrabalho ${runId}`,completedAt:new Date(),resultSummary:"Diagnóstico sintético para testar entrevista; não representa dados da fábrica.",resultSnapshot:{source:"QA_SYNTHETIC",themes:[{themeCode:"REWORK",priorityOrder:1,answers:[{questionCode:template.questions[0].code}]}]},answers:{create:[{questionId:template.questions[0].id,value:"QA sintético: dificuldades de conferência",notes:"Exclusivamente teste técnico"}]}}});
  const thread=await db.conversationThread.create({data:{id:planThreadId(diagnosis.id),companyId,title:`QA plano de ação ${runId}`,workflowState:newWorkshop(diagnosis.id,diagnosis.title!) as never}});
  let activeThreadId=thread.id;
  let executionThreadId:string|null=null;
  const headers={"Content-Type":"application/json","Origin":base,"Cookie":`${AUTH_COOKIE_NAME}=${token}`};
  try{
    async function chat(message:string){
      const response=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers,body:JSON.stringify({threadId:activeThreadId,requestId:randomUUID(),message}),signal:AbortSignal.timeout(175000)});
      assert.equal(response.status,200,"chat deve aceitar mensagem do Brayan");
      const events=(await response.text()).trim().split("\n").filter(Boolean).map(line=>JSON.parse(line));
      const errors=events.filter(event=>["error","stopped"].includes(event.type));
      assert.equal(errors.length,0,"agente não deve falhar ou parar");
      const done=events.find(event=>event.type==="done");assert.ok(done,"resposta deve terminar");
      const answer=events.filter(event=>event.type==="delta").map(event=>event.text).join("");
      console.log(JSON.stringify({turn:message.slice(0,35),answered:Boolean(answer),question:/\?(?:\*{1,2}|_{1,2})?\s*$/.test(answer.trim()),proposal:done.proposal?.status??null,answerText:answer.slice(-550)}));
      return {answer,proposal:done.proposal};
    }
    const first=await chat("No diagnóstico parece que manutenção pesa, mas quase nunca temos paradas de máquina. Quero investigar o problema verdadeiro antes de fazer o plano.");
    assert.equal(first.proposal,null,"primeiro relato não aprova plano");
    assert.match(first.answer,/\?(?:\*{1,2}|_{1,2})?\s*$/);
    const second=await chat("O retrabalho de medidas em móveis sob encomenda está consumindo tempo. Eu, Brayan, preciso revisar desenhos e liberar muitas decisões. Ainda não medimos frequência nem horas perdidas.");
    assert.equal(second.proposal,null,"duas respostas vagas não finalizam plano");
    assert.match(second.answer,/\?(?:\*{1,2}|_{1,2})?\s*$/);
    const third=await chat("Os erros de medida aparecem sobretudo no desenho antes de liberar a produção. Quero priorizar o retrabalho de medidas; a dependência de mim para conferir desenhos pode contribuir, ainda é hipótese. Brayan responde pela coordenação e o conferente registra os erros e executa a checagem. Temos 30 dias para agir. Nossa equipe pode dedicar duas horas por semana por responsável. Podemos usar o formulário da plataforma e até R$ 300 em materiais; custos exatos serão estimados antes de comprar. Quero entre três e cinco iniciativas viáveis: medir os erros, padronizar conferência, delegar a checagem e revisar semanalmente.");
    let final=third;
    if(!final.proposal)final=await chat("Confirmo: medir os erros de medida nos últimos 5 pedidos é a iniciativa principal para descobrir a base e a origem, sem adiar as ações. Padronizar a conferência, delegar a checagem e revisar semanalmente são complementares. O conferente registra os casos; Brayan coordena e estima os custos dos materiais em até 3 dias, antes de qualquer compra. Prazo total de 30 dias, duas horas por semana por pessoa e até R$ 300 de recursos. Meta inicial: reduzir em 20% a frequência de erros nos próximos pedidos comparáveis ao levantamento inicial; sem prometer ganho antes da medição. Complete as ações com passos, prova e revisão.");
    assert.ok(final.proposal,"com acordos completos o COO deve preparar revisão final");
    assert.match(final.proposal.details.at(-1),/plano aparecerá em Projetos\/Plano/);
    assert.equal(await db.actionPlan.count({where:{companyId,baseline:{path:["threadId"],equals:thread.id}}}),0,"antes de aprovar não cria plano");
    const approval=await fetch(`${base}/api/assistant/proposals`,{method:"POST",headers,body:JSON.stringify({id:final.proposal.id,decision:"approve"})});
    assert.equal(approval.status,200,"aprovação final deve funcionar");
    const applied=await approval.json();assert.equal(applied.proposal.status,"APPLIED");
    const plan=await db.actionPlan.findFirstOrThrow({where:{companyId,baseline:{path:["threadId"],equals:thread.id}},include:{tasks:true,checkins:true}});
    const state=readWorkshop((await db.conversationThread.findUniqueOrThrow({where:{id:thread.id}})).workflowState);
    assert.equal(plan.status,"ACTIVE");assert.equal(state?.stage,"FOLLOW_UP");
    assert.ok(state!.plan!.initiatives.length>=3&&state!.plan!.initiatives.length<=5);
    assert.ok(plan.tasks.length>=3&&plan.tasks.every(task=>Boolean(task.ownerName&&task.dueAt&&task.executionGuide)));
    assert.equal(plan.checkins.length,1);
    console.log(JSON.stringify({result:"PASS",initiatives:state!.plan!.initiatives.length,tasks:plan.tasks.length,owners:plan.tasks.every(task=>Boolean(task.ownerName)),checkins:plan.checkins.length}));
    async function decide(id:string,decision:"approve"|"reject"="approve"){
      const response=await fetch(`${base}/api/assistant/proposals`,{method:"POST",headers,body:JSON.stringify({id,decision})});
      assert.equal(response.status,200);return (await response.json()).proposal;
    }
    const usersBefore=await db.conversationMessage.count({where:{threadId:thread.id,role:"USER"}});
    const resume=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers,body:JSON.stringify({threadId:thread.id,requestId:randomUUID(),resumeProposalId:final.proposal.id}),signal:AbortSignal.timeout(175000)});
    assert.equal(resume.status,200);
    const resumeEvents=(await resume.text()).trim().split("\n").filter(Boolean).map(line=>JSON.parse(line));
    assert.ok(resumeEvents.some(e=>e.type==="done")&&!resumeEvents.some(e=>["error","stopped"].includes(e.type)),"aprovação final retoma próximo passo");
    assert.equal(await db.conversationMessage.count({where:{threadId:thread.id,role:"USER"}}),usersBefore,"retomada não inventa resposta do gestor");
    const repeatedResume=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers,body:JSON.stringify({threadId:thread.id,requestId:randomUUID(),resumeProposalId:final.proposal.id})});
    assert.equal(repeatedResume.status,409);
    const followUpProposal=resumeEvents.find(e=>e.type==="done").proposal;
    if(followUpProposal)await decide(followUpProposal.id,"reject");
    console.log("PASS retomada após aprovação final, sem mensagem falsa ou duplicação.");
    await decide(final.proposal.id);
    assert.equal(await db.task.count({where:{actionPlanId:plan.id}}),plan.tasks.length,"aprovação repetida não duplica tarefas");
    const executionThread=await db.conversationThread.create({data:{companyId,title:`QA execução COO ${runId}`}});
    executionThreadId=executionThread.id;activeThreadId=executionThread.id;
    const revisionBefore=await fetch(`${base}/api/company/revision`,{headers}).then(r=>r.json());
    const measure=plan.tasks.find(task=>["TODO","IN_PROGRESS"].includes(task.status)&&readExecutionGuide(task.executionGuide)?.recording?.kind==="FORM");
    assert.ok(measure,"medição deve ter formulário executável");
    const guide=readExecutionGuide(measure.executionGuide)!;
    const values=Object.fromEntries(guide.recording!.fields.map(field=>[field.key,field.type==="NUMBER"?"2":"Pedido QA001: erro de medida no desenho detectado antes da produção"]));
    const record=await chat(`Não vou preencher na aba. Preencha para mim o formulário da tarefa "${measure.title}" do plano "${plan.title}" com estes dados: ${guide.recording!.fields.map(field=>`${field.label}: ${values[field.key]}`).join("; ")}. Prepare a proposta para registrar, sem concluir a tarefa ainda.`);
    assert.ok(record.proposal,"relato deve produzir proposta de registro");
    const recordAction=Object((await db.cooActionProposal.findUniqueOrThrow({where:{id:record.proposal.id}})).action);
    assert.equal(recordAction.type,"task.record");assert.equal(recordAction.taskId,measure.id);
    assert.equal(await db.evidenceOutput.count({where:{taskId:measure.id}}),0);
    await decide(record.proposal.id);await decide(record.proposal.id);
    assert.equal(await db.evidenceOutput.count({where:{taskId:measure.id}}),1);
    const revisionAfter=await fetch(`${base}/api/company/revision`,{headers}).then(r=>r.json());
    assert.notEqual(revisionAfter.revision,revisionBefore.revision,"registro muda a revisão usada pelas telas");
    const completed=await chat(`Concluí a tarefa "${measure.title}" deste plano. Conferi os cinco pedidos comparáveis e registrei os erros encontrados no desenho, sem comprovar melhoria ainda. Registre esse relato e marque como concluída; prepare para eu aprovar.`);
    assert.ok(completed.proposal);
    assert.notEqual((await db.task.findUniqueOrThrow({where:{id:measure.id}})).status,"DONE");
    await decide(completed.proposal.id);await decide(completed.proposal.id);
    const freshTasks=await db.task.findMany({where:{actionPlanId:plan.id},include:{evidence:true}});
    const progress=taskProgress(freshTasks,[]);
    assert.equal(progress.completed,1);assert.equal(progress.results.length,1);assert.equal(progress.recordCount,1);
    const toolTask=plan.tasks.find(task=>task.id!==measure.id)!;
    const tool=await chat(`Agora crie um documento checklist de conferência de medidas ligado à tarefa "${toolTask.title}" deste plano aprovado. Inclua conferir pedido, comparar cotas e registrar divergências; sem dados reais preenchidos. Prepare a proposta para minha aprovação.`);
    assert.ok(tool.proposal);
    const toolAction=Object((await db.cooActionProposal.findUniqueOrThrow({where:{id:tool.proposal.id}})).action);
    assert.equal(toolAction.type,"artifact.save");assert.equal(toolAction.taskId,toolTask.id);
    await decide(tool.proposal.id);
    assert.equal(await db.workspaceArtifact.count({where:{threadId:executionThread.id,taskId:toolTask.id}}),1);
    const note=await chat(`Na tarefa "${measure.title}" registre a observação "A próxima revisão de resultados será discutida na reunião semanal". Prepare para eu aprovar.`);
    assert.ok(note.proposal);await decide(note.proposal.id,"reject");
    assert.equal((await decide(note.proposal.id)).status,"REJECTED","recusa não pode virar aprovação");
    assert.equal(await db.evidenceOutput.count({where:{taskId:measure.id}}),2);
    for(const page of ["/tarefas",`/tarefas/${measure.id}`,`/plano-de-acao?id=${plan.id}`,`/acompanhamento?project=${plan.id}`,`/assistente?chat=${executionThread.id}`]){
      const response=await fetch(base+page,{headers,redirect:"manual"});assert.equal(response.status,200,page);
      const html=await response.text();assert.ok(!html.includes("Application error"),page);
      if(page.startsWith("/acompanhamento")){assert.ok(html.includes("Concluída"));assert.ok(html.includes("cinco pedidos"));}
    }
    console.log(JSON.stringify({result:"PASS",chatForm:true,chatCompletion:true,progress:progress.percent,linkedTool:true,rejection:true,idempotency:true,pages:5,revisionChanged:true}));
  }finally{
    const plans=await db.actionPlan.findMany({where:{companyId,baseline:{path:["threadId"],equals:thread.id}},select:{id:true}});
    const planIds=plans.map(plan=>plan.id);
    const tasks=await db.task.findMany({where:{companyId,actionPlanId:{in:planIds}},select:{id:true}});
    const checkins=await db.progressCheckin.findMany({where:{companyId,actionPlanId:{in:planIds}},select:{id:true}});
    await db.evidenceOutput.deleteMany({where:{companyId,OR:[{taskId:{in:tasks.map(task=>task.id)}},{checkinId:{in:checkins.map(checkin=>checkin.id)}}]}});
    const threadIds=[thread.id,...(executionThreadId?[executionThreadId]:[])];
    await db.workspaceArtifact.deleteMany({where:{companyId,threadId:{in:threadIds}}});
    await db.progressCheckin.deleteMany({where:{companyId,actionPlanId:{in:planIds}}});
    await db.task.deleteMany({where:{companyId,actionPlanId:{in:planIds}}});
    await db.actionPlan.deleteMany({where:{companyId,id:{in:planIds}}});
    await db.cooActionProposal.deleteMany({where:{companyId,threadId:{in:threadIds}}});
    await db.conversationMessage.deleteMany({where:{threadId:{in:threadIds}}});
    await db.conversationThread.deleteMany({where:{id:{in:threadIds}}});
    await db.diagnosticSession.delete({where:{id:diagnosis.id}});
    await db.authSession.delete({where:{id:session.id}});
    console.log("QA temporal da conta Brayan removido.");
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"QA falhou");process.exitCode=1}).finally(()=>db.$disconnect());
