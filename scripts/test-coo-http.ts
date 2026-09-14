import { loadEnvFile } from "node:process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { CooProposalView } from "../src/core/coo-actions";
loadEnvFile(".env");
const base="http://127.0.0.1:3000";
assert.equal(new URL(process.env.DATABASE_URL!).hostname,"127.0.0.1");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
const accessDir=process.argv[2];
assert.ok(accessDir,"Informe a pasta privada dos acessos locais de QA.");
const account=JSON.parse(readFileSync(path.join(accessDir,"qa-admin.json"),"utf8"));
async function main(){
 const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:account.email,code:account.code})});
 assert.equal(login.status,200,"QA login");
 const cookie=login.headers.get("set-cookie")?.split(";")[0];assert.ok(cookie);
 const headers={"Content-Type":"application/json","Origin":base,"Cookie":cookie};
 const companyId=(await db.companyMembership.findFirstOrThrow({where:{user:{email:account.email}}})).companyId;
 const suffix=randomUUID().slice(0,8),projectTitle=`QA Fluxo COO ${suffix}`;
 let threadId="new";
 async function chat(message:string){
  const r=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers,body:JSON.stringify({threadId,requestId:randomUUID(),message}),signal:AbortSignal.timeout(175000)});
  assert.equal(r.status,200,"Chat HTTP");
  const events=(await r.text()).trim().split("\n").filter(Boolean).map(l=>JSON.parse(l));
  assert.ok(!events.some(e=>e.type==="error"||e.type==="stopped"),"Resposta deve concluir sem erro");
  const ack=events.find(e=>e.type==="ack"),done=events.find(e=>e.type==="done");assert.ok(ack&&done);
  threadId=ack.threadId;
  const proposal=done.proposal as CooProposalView;assert.ok(proposal,"IA deve preparar proposta com dados suficientes");assert.equal(proposal.status,"PENDING");
  return proposal;
 }
 async function approve(p:CooProposalView){
  const r=await fetch(`${base}/api/assistant/proposals`,{method:"POST",headers,body:JSON.stringify({id:p.id,decision:"approve"})});
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.proposal.status,"APPLIED",JSON.stringify(data));return data.proposal as CooProposalView;
 }
 const project=await chat(`Quero criar um projeto chamado "${projectTitle}", objetivo "Conferir os materiais antes de liberar os pedidos", prazo de 10 dias. Prepare a proposta para minha aprovação.`);
 assert.equal(await db.actionPlan.count({where:{companyId,title:projectTitle}}),0);
 const p=await approve(project);await approve(project);
 assert.equal(await db.actionPlan.count({where:{companyId,title:projectTitle}}),1);
 console.log("PASS live: proposta de projeto, nenhuma gravação antes da aprovação, aprovação e repetição idempotente");
 const plan=await db.actionPlan.findFirstOrThrow({where:{companyId,title:projectTitle}});
 const newTask=await chat(`No projeto "${projectTitle}" crie a tarefa "Conferir ferragens QA", descrição "Conferir ferragens dos pedidos do turno", responsável Ana, prioridade alta, prazo 15/09/2026. Prepare o cartão para eu aprovar.`);
 assert.equal(await db.task.count({where:{actionPlanId:plan.id}}),0);await approve(newTask);
 const task=await db.task.findFirstOrThrow({where:{actionPlanId:plan.id}});
 assert.equal(task.ownerName,"Ana");assert.equal(task.priority,"HIGH");assert.equal(task.dueAt?.toISOString().slice(0,10),"2026-09-15");
 const complete=await chat(`Concluí a tarefa "Conferir ferragens QA" do projeto "${projectTitle}". Conferi as ferragens de 3 pedidos e não faltou material. Quero registrar esse relato e marcar a tarefa como concluída. Prepare a proposta; não crie outra tarefa.`);
 assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).status,"TODO");await approve(complete);await approve(complete);
 const completed=await db.task.findUniqueOrThrow({where:{id:task.id},include:{evidence:true}});
 assert.equal(completed.status,"DONE");assert.equal(completed.evidence.length,1);assert.equal(Object(completed.evidence[0].metadata).kind,"TASK_UPDATE");
 console.log("PASS live: tarefa com campos corretos, conclusão e relato único após aprovação");
 for(const path of ["/assistente?chat="+threadId,p.result!.href,`/tarefas/${task.id}`,"/acompanhamento?project="+plan.id,"/empresa","/memoria","/diagnostico","/plano-de-acao"]){
  const response: Response=await fetch(base+path,{headers:{Cookie:cookie},redirect:"manual"});const html=await response.text();
  assert.equal(response.status,200,path);assert.ok(!html.includes("Application error"),path);
  if(path.startsWith("/tarefas/")){assert.ok(html.includes("Concluída"));assert.ok(html.includes("Ana"));}
 }
 const unauth=await fetch(`${base}/api/assistant/proposals?threadId=${threadId}`,{redirect:"manual"});assert.ok([401,307].includes(unauth.status));
 const csrf=await fetch(`${base}/api/assistant/proposals`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookie,Origin:"https://invalid.example"},body:JSON.stringify({id:complete.id,decision:"approve"})});assert.equal(csrf.status,403);
 writeFileSync(path.join(accessDir,"coo-qa-result.json"),JSON.stringify({threadId,planId:plan.id,taskId:task.id,companyId,projectTitle},null,2));
 console.log("PASS live: 8 páginas autenticadas, origem inválida e acesso sem sessão bloqueados. Dados fictícios isolados na empresa QA para inspeção visual.");
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Teste HTTP falhou");process.exitCode=1;}).finally(()=>db.$disconnect());
