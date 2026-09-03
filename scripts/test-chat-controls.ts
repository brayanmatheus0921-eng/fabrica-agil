import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
loadEnvFile(".env");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
const base="http://127.0.0.1:3000";
async function main(){
 const thread=await db.conversationThread.create({data:{companyId:DEV_COMPANY_ID,title:"QA — Cancelamento e concorrência"}});
 const id=randomUUID(); const body={threadId:thread.id,requestId:id,message:"Teste: explique de forma detalhada como acompanhar um plano sem inventar dados."};
 const first=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers:{"Content-Type":"application/json",origin:base},body:JSON.stringify(body)});
 assert.equal(first.status,200);
 const second=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,requestId:randomUUID()})}); assert.equal(second.status,409);
 const stop=await fetch(`${base}/api/assistant/stop`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({threadId:thread.id,requestId:id})}); assert.equal(stop.status,200);
 const result=await first.text(); assert.ok(!result.includes('"type":"done"')); assert.ok(result.includes('"type":"stopped"'));
 assert.equal(await db.conversationMessage.count({where:{threadId:thread.id,role:"USER"}}),1);
 const latest=await db.conversationThread.findUniqueOrThrow({where:{id:thread.id}}); assert.equal(latest.generationId,null);
 const duplicate=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});assert.equal(duplicate.status,409);
 const foreign=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers:{"Content-Type":"application/json",origin:"https://untrusted.example"},body:JSON.stringify({...body,requestId:randomUUID()})});assert.equal(foreign.status,403);
 const invalid=await fetch(`${base}/api/assistant/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,requestId:randomUUID(),threadId:"not-this-company"})});assert.equal(invalid.status,409);
 console.log("PASS: origem local, exclusão mútua, cancelamento, persistência, idempotência e isolamento.",thread.id);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
