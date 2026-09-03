import { loadEnvFile } from "node:process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Agent, run, setTracingDisabled } from "@openai/agents";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEV_COMPANY_ID } from "../src/core/development";
import { executableCooPlanSchema, readWorkshop } from "../src/core/coo-workshop";
import { INDUSTRIAL_CONSULTANT_INSTRUCTIONS } from "../src/server/ai/prompt";
loadEnvFile(".env.local");loadEnvFile(".env");setTracingDisabled(true);
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 const old=await db.actionPlan.findUniqueOrThrow({where:{id:"coo-plan-coo-workshop-cmtgmz3me0000hsupb2k68pxt"}});
 if(old.companyId!==DEV_COMPANY_ID)throw Error("Empresa incorreta");
 const thread=await db.conversationThread.findUniqueOrThrow({where:{id:"coo-workshop-cmtgmz3me0000hsupb2k68pxt"},include:{messages:{where:{role:"USER"},orderBy:{createdAt:"asc"}}}});
 const state=readWorkshop(thread.workflowState);if(!state)throw Error("Estado inválido");
 const diagnosis=await db.diagnosticSession.findUniqueOrThrow({where:{id:state.diagnosticId},include:{answers:{include:{question:true}}}});
 const methods=await db.improvementMethod.findMany({where:{status:"ACTIVE"},select:{code:true,name:true}});
 const matrix={...diagnosis.resultSnapshot as object} as Record<string,unknown>;delete matrix.analysis;delete matrix.analysisError;
 const agent=new Agent({name:"COO — exemplo executável",model:process.env.OPENAI_MODEL??"gpt-5.6-luna",outputType:executableCooPlanSchema,instructions:INDUSTRIAL_CONSULTANT_INSTRUCTIONS+"\n"+readFileSync("docs/ai/skills/coo-plano-colaborativo/SKILL.md","utf8")+`\nEXCEÇÃO AUTORIZADA: o proprietário do app pediu um exemplo FINALIZADO para testar, sem perguntas neste momento. Gere exatamente 3 iniciativas, cada uma com 1 ação bem detalhada (2 a 6 passos). Uma principal e duas de apoio, sem dispersar a equipe. Isto é rascunho de demonstração, não aprovado. Preserve a prioridade principal já confirmada sobre a lixa. Não altere a matriz. Use relatos reais abaixo como relatos, estimativas como estimativas. Não invente medições ou resultados; somente exemplos nos placeholders podem ser fictícios. As duas iniciativas secundárias são sugestões para revisão, não decisões confirmadas. Evidências: use apenas códigos de perguntas presentes ou IDs de mensagens USER presentes. Método apenas código do catálogo (ou null). Fale simples. 5W2H concreto, custo a estimar (não zero), horários e prazos sugeridos, primeira tarefa é medir, não contratar. PRODUCTION_LOG suporta um lote por vez; descreva como coleta de um posto/piloto, não de três operadores simultâneos; o tempo automático é tempo decorrido do posto, não horas-pessoa. Use esse registro na ação da lixa. FORM nas outras ações; no máximo 6 campos curtos. Passos de fila devem incluir entrada em espera e início de atendimento com data/hora, permitindo medir espera >1 dia, não só contar saídas. Se recomendar comparar etapas vizinhas explique como registrar com um FORM de fila por etapa. Não crie produto ERP, nem compare peças de tipos diferentes como produtividade. Metas de ganho só após base medida. Registros de exemplo não demonstram melhoria. Explique como testar uma correção pequena APÓS medir e como comparar períodos equivalentes sem piorar retrabalho. Prefira um ciclo de 7 dias, com revisão no dia 3 e 7; não prometa melhoria já constatada.`});
 const result=await run(agent,JSON.stringify({oldPlan:old.targetOutcome,workshop:state,matrix,answers:diagnosis.answers.map(a=>({code:a.question.code,question:a.question.prompt,value:a.value,notes:a.notes})),methods,messages:thread.messages.map(m=>({id:m.id,content:m.content}))}));
 const plan=executableCooPlanSchema.parse(result.finalOutput);
 if(plan.initiatives.length!==3||plan.initiatives.filter(i=>i.kind==="PRIMARY").length!==1)throw Error("Exemplo precisa de 3 iniciativas e 1 principal");
 const allowed=new Set([...diagnosis.answers.map(a=>a.question.code),...thread.messages.map(m=>m.id)]);
 for(const item of plan.initiatives){if(item.evidenceCodes.some(c=>!allowed.has(c)))throw Error("Evidência inexistente");if(item.methodCode&&!methods.some(m=>m.code===item.methodCode))throw Error("Método inexistente");}
 mkdirSync("backups",{recursive:true});writeFileSync("backups/executable-plan-candidate.json",JSON.stringify({oldPlanId:old.id,oldUpdatedAt:old.updatedAt,threadId:thread.id,diagnosticId:diagnosis.id,plan},null,2));
 console.log(JSON.stringify({status:"CANDIDATE_VALIDATED",initiatives:plan.initiatives.map(i=>({title:i.title,actions:i.actions.map(a=>({what:a.what,recording:a.execution.recording?.kind}))}))}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Falha na geração");process.exitCode=1;}).finally(()=>db.$disconnect());
