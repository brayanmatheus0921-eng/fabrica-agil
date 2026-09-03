import { loadEnvFile } from "node:process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { readWorkshop,revisitWorkshop } from "../src/core/coo-workshop";
import { activateDraftPlan } from "../src/server/plans/approve-plan";
loadEnvFile(".env");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 const {planId}=JSON.parse(readFileSync("backups/executable-plan-result.json","utf8")),rollback=new Error("ROLLBACK_QA");
 try{await db.$transaction(async tx=>{
  const plan=await tx.actionPlan.findFirstOrThrow({where:{id:planId,companyId:DEV_COMPANY_ID,status:"DRAFT"}});
  const threadId=String(Object(plan.baseline).threadId),thread=await tx.conversationThread.findUniqueOrThrow({where:{id:threadId}}),state=readWorkshop(thread.workflowState)!;
  await tx.conversationThread.update({where:{id:threadId},data:{workflowState:revisitWorkshop(state,"PLAN") as never}});
  assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,planId),false);
  await tx.conversationThread.update({where:{id:threadId},data:{workflowState:state as never}});
  assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,planId),true);
  assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,planId),false);
  assert.equal(await tx.task.count({where:{actionPlanId:planId,status:"TODO"}}),3);
  assert.equal(await tx.progressCheckin.count({where:{actionPlanId:planId}}),1);
  throw rollback;
 },{timeout:20000});}catch(e){if(e!==rollback)throw e;}
 assert.equal((await db.actionPlan.findUniqueOrThrow({where:{id:planId}})).status,"DRAFT");
 assert.equal(await db.evidenceOutput.count({where:{task:{actionPlanId:planId}}}),0);
 console.log("PASS: aprovação, bloqueio após revisitar, 3 tarefas e check-in; transação revertida, exemplo permanece pendente e sem dados de teste.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
