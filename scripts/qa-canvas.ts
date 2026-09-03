import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { taskProgress } from "../src/core/task-progress";

loadEnvFile(".env.local"); loadEnvFile(".env");
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const manifest = ".artifacts/canvas-qa.json", base = "http://127.0.0.1:3000";
async function api(url:string, init?:RequestInit) { const response=await fetch(base+url,init);const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data; }
function json(value:unknown) {return {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)};}
async function main() {
  const mode=process.argv[2]??"setup";
  if(mode==="setup") {
    const suffix=randomUUID(),planId=`qa-canvas-plan-${suffix}`,taskId=`qa-canvas-task-${suffix}`,threadId=`qa-canvas-thread-${suffix}`;
    const protectedData=await db.actionPlan.findMany({where:{companyId:DEV_COMPANY_ID},select:{id:true,updatedAt:true,tasks:{select:{id:true,status:true,updatedAt:true}}}});
    await db.actionPlan.create({data:{id:planId,companyId:DEV_COMPANY_ID,title:"QA temporário Canvas",objective:"Verificar persistência sem alterar dados reais",status:"ACTIVE",createdAt:new Date("2000-01-01"),tasks:{create:{id:taskId,companyId:DEV_COMPANY_ID,title:"QA — Anotar as saídas de pedidos",status:"TODO",sortOrder:1}}}});
    await db.conversationThread.create({data:{id:threadId,companyId:DEV_COMPANY_ID,title:"QA temporário Canvas",createdAt:new Date("2000-01-01")}});
    await mkdir(".artifacts",{recursive:true});await writeFile(manifest,JSON.stringify({planId,taskId,threadId,protectedData},null,2));console.log({planId,taskId,threadId});return;
  }
  const state=JSON.parse(await readFile(manifest,"utf8"));
  assert.ok(state.planId.startsWith("qa-canvas-plan-")&&state.taskId.startsWith("qa-canvas-task-")&&state.threadId.startsWith("qa-canvas-thread-"));
  if(mode==="photo") {
    const bytes=await readFile(".artifacts/canvas-photo-qa.jpg"),form=new FormData();
    form.set("taskId",state.taskId);form.set("file",new Blob([bytes],{type:"image/jpeg"}),"medicao-foto-qa.jpg");
    const uploaded=await api("/api/artifacts",{method:"POST",body:form});
    const read=await api(`/api/artifacts/${uploaded.artifact.id}/interpret`,{method:"POST"});
    assert.ok(read.artifact.interpretation.observations.length);assert.equal(read.artifact.confirmedAt,null);
    console.log("PASS leitura real de imagem pela IA, pendente de confirmação");return;
  }
  if(mode==="cleanup") {
    const rows=await db.actionPlan.findMany({where:{id:{in:state.protectedData.map((p:{id:string})=>p.id)}},select:{id:true,updatedAt:true,tasks:{select:{id:true,status:true,updatedAt:true}}}});
    assert.deepEqual(JSON.parse(JSON.stringify(rows)),state.protectedData,"Planos/tarefas anteriores mudaram");
    await db.workspaceArtifact.deleteMany({where:{companyId:DEV_COMPANY_ID,OR:[{taskId:state.taskId},{threadId:state.threadId}]}});
    await db.evidenceOutput.deleteMany({where:{taskId:state.taskId,companyId:DEV_COMPANY_ID}});
    await db.conversationMessage.deleteMany({where:{threadId:state.threadId}});
    await db.conversationThread.delete({where:{id:state.threadId}});
    await db.task.delete({where:{id:state.taskId}});await db.actionPlan.delete({where:{id:state.planId}});
    console.log("Fixtures removidas; planos e tarefas anteriores preservados.");return;
  }
  if(mode==="verify") {
    const note=await api(`/api/tasks/${state.taskId}/updates`,json({kind:"TASK_UPDATE",category:"APPLIED",text:"Teste controlado: contei dois pedidos.",requestId:randomUUID()}));assert.ok(note.note.id);console.log("PASS registro da tarefa");
    const generated=await api("/api/artifacts",json({taskId:state.taskId,threadId:state.threadId,prompt:"Crie uma planilha vazia simples para registrar pedido, data e quantidade de peças concluídas. Exemplo separado; sem dados inventados nas linhas reais."}));
    assert.equal(generated.artifact.kind,"SPREADSHEET");const content=generated.artifact.content;assert.equal(content.rows.length,0);console.log("PASS geração real de planilha pela IA");
    const edited={...content,rows:[content.columns.map((_:string,i:number)=>i===0?"P-QA-01":"12")]};
    const saved=await api(`/api/artifacts/${generated.artifact.id}`,{...json({intent:"SAVE",revision:generated.artifact.revision,content:edited}),method:"PATCH"});
    const conflict=await fetch(base+`/api/artifacts/${generated.artifact.id}`,{...json({intent:"SAVE",revision:generated.artifact.revision,content:edited}),method:"PATCH"});assert.equal(conflict.status,409);
    for(const format of ["csv","xlsx"]) {const downloaded=await fetch(base+`/api/artifacts/${saved.artifact.id}/download?format=${format}`);assert.equal(downloaded.status,200);assert.ok((await downloaded.arrayBuffer()).byteLength>30);}console.log("PASS edição persistida, conflito de versão, downloads CSV/XLSX");
    const csv=Buffer.from("Pedido;Pecas;Parada_minutos\nQA01;12;5\nQA02;8;10");const form=new FormData();form.set("taskId",state.taskId);form.set("threadId",state.threadId);form.set("file",new Blob([csv],{type:"text/csv"}),"resultado-qa.csv");
    const uploaded=await api("/api/artifacts",{method:"POST",body:form});
    const interpreted=await api(`/api/artifacts/${uploaded.artifact.id}/interpret`,{method:"POST"});assert.ok(interpreted.artifact.interpretation.observations.length);
    let tasks=await db.task.findMany({where:{id:state.taskId},include:{evidence:true}}),files=await db.workspaceArtifact.findMany({where:{taskId:state.taskId}});
    assert.equal(taskProgress(tasks,files).confirmed.length,0);
    await api(`/api/artifacts/${uploaded.artifact.id}`,{...json({intent:"CONFIRM",revision:interpreted.artifact.revision,interpretation:interpreted.artifact.interpretation}),method:"PATCH"});
    tasks=await db.task.findMany({where:{id:state.taskId},include:{evidence:true}});files=await db.workspaceArtifact.findMany({where:{taskId:state.taskId}});
    assert.equal(taskProgress(tasks,files).confirmed.length,1);assert.equal(taskProgress(tasks,files).applied.length,1);
    const original=await fetch(base+`/api/artifacts/${uploaded.artifact.id}/download`);assert.deepEqual(Buffer.from(await original.arrayBuffer()),csv);console.log("PASS upload, leitura real pela IA, confirmação, acompanhamento e original intacto");
    const chat=await fetch(base+"/api/assistant/chat",json({threadId:state.threadId,requestId:randomUUID(),message:`Crie agora no Canvas um documento simples de descrição do cargo de lixador, com campos para preencher e instruções curtas. Vincule à tarefa ${state.taskId}. Não crie nem altere o plano de ação. É um teste com dados fictícios.`}));
    assert.equal(chat.status,200);const events=(await chat.text()).trim().split("\n").map(line=>JSON.parse(line));const done=events.find(e=>e.type==="done");assert.ok(done?.artifact,JSON.stringify(events.filter(e=>e.type!=="delta")));
    const doc=await fetch(base+`/api/artifacts/${done.artifact.id}/download?format=docx`);assert.equal(doc.status,200);assert.ok((await doc.arrayBuffer()).byteLength>100);console.log("PASS conversa streaming gera Canvas e DOCX");
    console.log({taskUrl:base+"/tarefas/"+state.taskId,chatUrl:base+"/assistente?chat="+state.threadId});
  }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"QA failed");process.exitCode=1;}).finally(()=>db.$disconnect());
