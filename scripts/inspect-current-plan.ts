import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
loadEnvFile(".env");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){console.log(JSON.stringify({plans:await db.actionPlan.findMany({where:{companyId:DEV_COMPANY_ID},orderBy:{createdAt:"desc"},include:{tasks:true}}),workshops:await db.conversationThread.findMany({where:{companyId:DEV_COMPANY_ID,workflowState:{not:Prisma.DbNull}},select:{id:true,workflowState:true}}),diagnoses:await db.diagnosticSession.findMany({where:{companyId:DEV_COMPANY_ID},select:{id:true,title:true,status:true}})},null,2));}
main().finally(()=>db.$disconnect());
