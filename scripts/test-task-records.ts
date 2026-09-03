import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
loadEnvFile(".env");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 const candidate=JSON.parse(readFileSync("backups/executable-plan-candidate.json","utf8"));
 const id=`qa-records-${randomUUID()}`;
 const plan=await db.actionPlan.create({data:{id,companyId:DEV_COMPANY_ID,title:"QA temporário — registros",objective:"Teste isolado",status:"DRAFT",windowDays:7,tasks:{create:candidate.plan.initiatives.map((i: {actions:Array<{execution:object}>},n:number)=>({id:`${id}-${n}`,companyId:DEV_COMPANY_ID,title:`QA ${n}`,status:"TODO",executionGuide:i.actions[0].execution}))}}});
 const post=async (n:number,body:object,origin="http://127.0.0.1:3000")=>{const r=await fetch(`http://127.0.0.1:3000/api/tasks/${id}-${n}/records`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({requestId:randomUUID(),intent:"SAVE",...body})});return {status:r.status,...await r.json()};};
 try{
  const start={event:"START",order:"QA104",product:"Porta teste",quantity:0,note:""};
  assert.equal((await post(0,{event:start})).status,400);
  await db.actionPlan.update({where:{id},data:{status:"ACTIVE"}});
  assert.equal((await post(0,{event:start},"https://untrusted.example")).status,403);
  const requestId=randomUUID(),first=await post(0,{requestId,event:start});assert.equal(first.status,200,JSON.stringify(first));
  assert.equal((await post(0,{requestId,event:start})).records.length,1);
  assert.equal((await post(0,{event:start})).status,400);
  assert.equal((await post(0,{event:{...start,event:"PAUSE",note:"Aguardando material"}})).status,200);
  assert.equal((await post(0,{event:{...start,event:"OUTPUT",quantity:8}})).status,400);
  assert.equal((await post(0,{event:{...start,event:"RESUME"}})).status,200);
  assert.equal((await post(0,{event:{...start,event:"OUTPUT",quantity:8}})).status,200);
  const undoId=randomUUID();assert.equal((await post(0,{intent:"UNDO",requestId:undoId})).records.filter((r:{voided?:boolean})=>!r.voided).length,3);
  assert.equal((await post(0,{intent:"UNDO",requestId:undoId})).records.filter((r:{voided?:boolean})=>!r.voided).length,3);
  assert.equal((await post(0,{event:{...start,event:"OUTPUT",quantity:5}})).status,200);
  assert.equal((await post(0,{event:{...start,event:"FINISH"}})).status,200);
  assert.equal((await post(1,{values:{}})).status,400);
  const fields=candidate.plan.initiatives[1].actions[0].execution.recording.fields;
  const values=Object.fromEntries(fields.map((f:{key:string;example:string})=>[f.key,f.example]));
  assert.equal((await post(1,{values})).status,200);
  assert.equal(await db.evidenceOutput.count({where:{taskId:`${id}-1`}}),1);
  assert.equal((await db.task.findUniqueOrThrow({where:{id:`${id}-0`}})).status,"TODO");
  console.log("PASS: bloqueio pendente/origem; produção; validação; idempotência; desfazer; formulário; persistência; sem conclusão automática.");
 }finally{await db.evidenceOutput.deleteMany({where:{companyId:DEV_COMPANY_ID,taskId:{in:[0,1,2].map(n=>`${id}-${n}`)}}});await db.actionPlan.delete({where:{id:plan.id}});}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
