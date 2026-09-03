import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEV_COMPANY_ID } from "@/core/development";
import { sameOrigin } from "@/server/ai/chat-generation";
import { readExecutionGuide, validateFormValues, validateProductionEvent } from "@/core/task-execution";
import { eventsFrom, readRecords } from "@/core/task-records";
const bodySchema=z.object({requestId:z.string().uuid(),intent:z.enum(["SAVE","UNDO"]),values:z.record(z.string(),z.unknown()).optional(),event:z.unknown().optional()});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Origem não permitida."},{status:403});
 const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Confira o registro."},{status:400});
 const {id}=await params,input=parsed.data;
 try{
  const records=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "ActionPlan" WHERE id = (SELECT "actionPlanId" FROM "Task" WHERE id = ${id} AND "companyId" = ${DEV_COMPANY_ID}) FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM "Task" WHERE id = ${id} AND "companyId" = ${DEV_COMPANY_ID} FOR UPDATE`;
   const task=await tx.task.findFirst({where:{id,companyId:DEV_COMPANY_ID},include:{actionPlan:true}});
   if(!task)throw Error("Tarefa não encontrada.");
   if(task.actionPlan.status!=="ACTIVE"||!["TODO","IN_PROGRESS"].includes(task.status))throw Error("Aprove o plano e libere esta tarefa antes de registrar dados reais.");
   const guide=readExecutionGuide(task.executionGuide);if(!guide?.recording)throw Error("Esta tarefa não tem formulário.");
   const rows=await tx.evidenceOutput.findMany({where:{taskId:id,companyId:DEV_COMPANY_ID},orderBy:{createdAt:"asc"}}),existing=readRecords(rows);
   const recordId=`task-record-${input.requestId}`;
   const duplicate=await tx.evidenceOutput.findUnique({where:{id:recordId}});
   if(duplicate){if(duplicate.taskId!==id)throw Error("Identificador já usado.");return existing;}
   if(input.intent==="UNDO"){
    const last=existing.filter(r=>!r.voided).at(-1);if(!last)throw Error("Não há registro para desfazer.");
    await tx.evidenceOutput.update({where:{id:last.id},data:{metadata:{...last,voided:true,undoneAt:new Date().toISOString()}}});
    // Audit marker also makes retries idempotent; it is not a production record.
    await tx.evidenceOutput.create({data:{id:recordId,companyId:DEV_COMPANY_ID,taskId:id,type:"NOTE",label:"Correção de registro",metadata:{kind:"UNDO",targetId:last.id}}});
   }else{
    const at=new Date().toISOString();
    const metadata=guide.recording.kind==="PRODUCTION_LOG"?{id:recordId,at,kind:"PRODUCTION_EVENT",event:validateProductionEvent(eventsFrom(existing),input.event)}:{id:recordId,at,kind:"FORM_ENTRY",values:validateFormValues(guide,input.values??{})};
    await tx.evidenceOutput.create({data:{id:recordId,companyId:DEV_COMPANY_ID,taskId:id,type:"NOTE",label:guide.recording.title,textValue:JSON.stringify(metadata),metadata:metadata as never}});
   }
   return readRecords(await tx.evidenceOutput.findMany({where:{taskId:id,companyId:DEV_COMPANY_ID},orderBy:{createdAt:"asc"}}));
  });
  return Response.json({records});
 }catch(e){return Response.json({error:e instanceof Error&&!("code" in e)?e.message:"Não foi possível salvar. Tente novamente."},{status:400});}
}
