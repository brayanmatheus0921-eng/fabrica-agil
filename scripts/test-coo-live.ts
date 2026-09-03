import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { newWorkshop, readWorkshop } from "../src/core/coo-workshop";
loadEnvFile(".env");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const base = "http://127.0.0.1:3000";
async function main() {
  const diagnosis = await db.diagnosticSession.findFirstOrThrow({ where: { companyId: DEV_COMPANY_ID, status: "COMPLETED" }, orderBy: { completedAt: "desc" } });
  const thread = await db.conversationThread.create({ data: { companyId: DEV_COMPANY_ID, title: "QA — Plano colaborativo (dados fictícios)", workflowState: newWorkshop(diagnosis.id, diagnosis.title!) as never } });
  console.log("QA_THREAD", thread.id);
  const messages = [
    "Sou o gestor nesta simulação com dados fictícios. Confirmo que o diagnóstico retrata hoje: ordens esperam porque descobrimos material faltante só ao iniciar. Quero entender e reduzir essas esperas, não atribuir culpa a pessoas.",
    "Não medimos horas nem dinheiro. Na última semana, 4 de 12 ordens esperaram por ferragens. Eu registrei esses 12 pedidos numa lista. Nossa meta inicial sugerida é não liberar ordem sem conferir material, medindo por 7 dias. Não tenho meta de redução comprovada ainda.",
    "Quando a ordem entra, ninguém confere os materiais; compras recebe o aviso depois. Não há checklist ou responsável definido. Isso aconteceu nas 4 ordens da semana. Minha hipótese é falta de conferência antes da liberação. Quebra de máquina também ocorre, mas sem registro de horas. Retrabalho não está medido.",
    "Confirmo como prioridade principal organizar a conferência de materiais antes de liberar ordens. Concordo em deixar medir retrabalho e paradas como duas iniciativas de apoio. O motivo é parar de começar pedidos sem material; isso combina com a matriz. Quero manter a ordem original da matriz visível e a ordem acordada separada.",
    "Sou eu quem coordena, Ana lidera almoxarifado e conferência, João registra retrabalho e paradas. Podemos dedicar 15 minutos por dia. Prazo sugerido: checklist e lista de faltas em 7 dias; medição de retrabalho e paradas em 14 dias. Usaremos uma planilha existente, custos extras a estimar; não presuma zero. Onde: almoxarifado e produção. Reveremos registros juntos às sextas. Para materiais, medir ordens conferidas antes de iniciar; meta sugerida 100%, ponto de partida a medir. Para apoios, registrar ocorrências por 7 dias e só depois definir redução. Prova: planilha com pedido, data, causa e duração quando disponível.",
    "Confirmo essa proposta e os responsáveis e prazos sugeridos. Quero o rascunho completo para revisar no botão, ainda NÃO aprovo execução. Se faltar medição de base, registre a medir, sem inventar. Mantenha uma principal e as duas secundárias combinadas, cada uma com a ação de coleta ou conferência viável.",
  ];
  for (let i=0; i<12; i++) {
    const current = readWorkshop((await db.conversationThread.findUniqueOrThrow({where:{id:thread.id}})).workflowState)!;
    if (current.stage === "REVIEW") break;
    const last = await db.conversationMessage.findFirst({ where:{threadId:thread.id,role:"ASSISTANT"},orderBy:{createdAt:"desc"} });
    console.log("TURN",i+1,"STAGE",current.stage);
    const input = messages[Math.min(i,5)] + (i>=6 ? " Reutilize os dados que já informei. Confirmo a prioridade e o plano sugerido, mas a aprovação final será pelo botão." : "");
    if (i>=6) console.log("LAST_QUESTION",last?.content.slice(-1000));
    const response = await fetch(`${base}/api/assistant/chat`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({threadId:thread.id,requestId:randomUUID(),message:input})});
    assert.equal(response.status,200);
    let buffer="", deltas=0, done=false;
    const reader=response.body!.getReader(); const decoder=new TextDecoder();
    while(true) {const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end; while((end=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;const e=JSON.parse(line);if(e.type==="delta")deltas++;if(e.type==="error")throw Error(e.text);if(e.type==="done")done=true;} }
    assert.ok(done); assert.ok(deltas>1); console.log("STREAM_OK",deltas);
  }
  const state=readWorkshop((await db.conversationThread.findUniqueOrThrow({where:{id:thread.id}})).workflowState)!;
  assert.equal(state.stage,"REVIEW", "IA deve conseguir construir o rascunho com dados suficientes"); assert.ok(state.planId);
  const plan=await db.actionPlan.findUniqueOrThrow({where:{id:state.planId},include:{tasks:true}});
  assert.equal(plan.status,"DRAFT"); assert.ok(plan.tasks.length); assert.ok(plan.tasks.every(t=>t.status==="BACKLOG"&&!t.startsAt&&!t.dueAt));
  console.log("PASS",JSON.stringify({threadId:thread.id,planId:plan.id,stage:state.stage,initiatives:state.plan?.initiatives.length,tasks:plan.tasks.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
