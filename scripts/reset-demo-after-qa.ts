// Run ONLY after tests, with explicit user permission. Preserves company/catalog.
import { loadEnvFile } from "node:process";
import { mkdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
loadEnvFile(".env");
const url=new URL(process.env.DATABASE_URL!);
if(url.hostname!=="127.0.0.1"||url.port!=="5433")throw Error("Limpeza permitida somente no PostgreSQL local 5433.");
if(!process.argv.includes("--confirmed-after-tests"))throw Error("Requer autorização explícita e testes concluídos.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 assert.equal(await db.conversationThread.count({where:{companyId:DEV_COMPANY_ID,generationId:{not:null}}}),0,"Aguarde todas as respostas terminarem");
 const backupDir=path.resolve("backups"), backup=path.join(backupDir,`coo-before-reset-${new Date().toISOString().replace(/[:.]/g,"-")}.dump`);
 assert.ok(backup.startsWith(path.resolve(process.cwd())+path.sep)); assert.ok(!existsSync(backup));mkdirSync(backupDir,{recursive:true});
 const dumped=spawnSync("C:/Program Files/PostgreSQL/17/bin/pg_dump.exe",["-Fc","-f",backup],{env:{...process.env,PGHOST:url.hostname,PGPORT:url.port,PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)},encoding:"utf8",windowsHide:true});
 if(dumped.status!==0)throw Error("Backup falhou; nenhum dado foi excluído.");assert.ok(statSync(backup).size>0);
 const sessions=await db.diagnosticSession.findMany({where:{companyId:DEV_COMPANY_ID},select:{id:true,title:true}});
 const plans=await db.actionPlan.findMany({where:{companyId:DEV_COMPANY_ID},select:{id:true}});
 console.log("BACKUP",backup);console.log("TARGETS",JSON.stringify({diagnoses:sessions,plans:plans.map(p=>p.id)}));
 const seed=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/db-demo-strategic.ts"],{encoding:"utf8",windowsHide:true});
 if(seed.status!==0)throw Error("Novo exemplo falhou; dados antigos preservados.");
 const newId=seed.stdout.trim().split(/\r?\n/).at(-1)!;
 assert.ok(await db.diagnosticSession.findFirst({where:{id:newId,companyId:DEV_COMPANY_ID,status:"COMPLETED"}}));
 const sessionIds=sessions.map(s=>s.id),planIds=plans.map(p=>p.id);
 await db.$transaction(async tx=>{
   const tasks=await tx.task.findMany({where:{companyId:DEV_COMPANY_ID,actionPlanId:{in:planIds}},select:{id:true}});
   const checkins=await tx.progressCheckin.findMany({where:{companyId:DEV_COMPANY_ID,actionPlanId:{in:planIds}},select:{id:true}});
   const taskIds=tasks.map(t=>t.id),checkinIds=checkins.map(c=>c.id);
   await tx.evidenceOutput.deleteMany({where:{companyId:DEV_COMPANY_ID,OR:[{taskId:{in:taskIds}},{checkinId:{in:checkinIds}}]}});
   await tx.metricMeasurement.deleteMany({where:{companyId:DEV_COMPANY_ID,OR:[{diagnosticSessionId:{in:sessionIds}},{checkinId:{in:checkinIds}}]}});
   await tx.progressCheckin.deleteMany({where:{id:{in:checkinIds},companyId:DEV_COMPANY_ID}});
   await tx.lessonAssignment.deleteMany({where:{actionPlanId:{in:planIds},companyId:DEV_COMPANY_ID}});
   await tx.actionPlan.deleteMany({where:{id:{in:planIds},companyId:DEV_COMPANY_ID}});
   await tx.methodRecommendation.deleteMany({where:{companyId:DEV_COMPANY_ID,OR:[{diagnosticSessionId:{in:sessionIds}},{bottleneck:{diagnosticSessionId:{in:sessionIds}}}]}});
   await tx.bottleneckAssessment.deleteMany({where:{companyId:DEV_COMPANY_ID,diagnosticSessionId:{in:sessionIds}}});
   const oldWorkshops=await tx.conversationThread.findMany({where:{companyId:DEV_COMPANY_ID,OR:[{title:{startsWith:"QA —"}},...sessionIds.map(id=>({workflowState:{path:["diagnosticId"],equals:id}}))]},select:{id:true}});
   const threadIds=oldWorkshops.map(t=>t.id);
   // Remove only test messages from the new general QA conversation, not older user chats.
   const qaMessages=await tx.conversationMessage.findMany({where:{role:"USER",content:{startsWith:"Teste de funcionamento:"}},select:{threadId:true}});
   for(const q of qaMessages)if(q.threadId!=="cmtfyljqr0001bcupo0ckd4hd")threadIds.push(q.threadId);
   await tx.companyMemory.deleteMany({where:{companyId:DEV_COMPANY_ID,OR:[{sourceType:"DIAGNOSTIC",sourceId:{in:sessionIds}},{sourceType:"TASK",sourceId:{in:taskIds}},{sourceType:"CHECKIN",sourceId:{in:checkinIds}},{sourceType:"CONVERSATION",sourceId:{in:threadIds}}]}});
   await tx.conversationThread.deleteMany({where:{id:{in:threadIds},companyId:DEV_COMPANY_ID}});
   await tx.diagnosticSession.updateMany({where:{companyId:DEV_COMPANY_ID,originSessionId:{in:sessionIds}},data:{originSessionId:null}});
   await tx.diagnosticSession.deleteMany({where:{companyId:DEV_COMPANY_ID,id:{in:sessionIds}}});
 },{timeout:30000});
 assert.equal(await db.diagnosticSession.count({where:{companyId:DEV_COMPANY_ID}}),1);
 assert.equal(await db.actionPlan.count({where:{companyId:DEV_COMPANY_ID}}),0);
 assert.equal(await db.task.count({where:{companyId:DEV_COMPANY_ID}}),0);
 console.log("READY",`http://127.0.0.1:3000/diagnostico?id=${newId}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
