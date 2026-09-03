import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { readWorkshop, revisitWorkshop } from "../src/core/coo-workshop";
import { activateDraftPlan } from "../src/server/plans/approve-plan";
loadEnvFile(".env");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 const thread=await db.conversationThread.findFirstOrThrow({where:{companyId:DEV_COMPANY_ID,title:"QA — Plano colaborativo (dados fictícios)"},orderBy:{createdAt:"desc"}});
 const state=readWorkshop(thread.workflowState)!;assert.equal(state.stage,"REVIEW");assert.ok(state.planId);
 const rollback=new Error("ROLLBACK_QA");
 try {await db.$transaction(async tx=>{
   await tx.conversationThread.update({where:{id:thread.id},data:{workflowState:revisitWorkshop(state,"PRIORITIZE") as never}});
   assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,state.planId!),false,"Revisita deve invalidar aprovação antiga");
   await tx.conversationThread.update({where:{id:thread.id},data:{workflowState:state as never}});
   assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,state.planId!),true);
   assert.equal(readWorkshop((await tx.conversationThread.findUniqueOrThrow({where:{id:thread.id}})).workflowState)?.stage,"FOLLOW_UP");
   assert.equal(await activateDraftPlan(tx,DEV_COMPANY_ID,state.planId!),false);
   assert.equal(await tx.task.count({where:{actionPlanId:state.planId!,status:"TODO"}}),3);
   throw rollback;
 },{timeout:20000});}catch(e){if(e!==rollback)throw e;}
 assert.equal((await db.actionPlan.findUniqueOrThrow({where:{id:state.planId}})).status,"DRAFT");
 console.log("PASS: revisão invalida aprovação antiga; aprovação libera acompanhamento e 3 tarefas; duplicada não executa novamente; QA revertido.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
