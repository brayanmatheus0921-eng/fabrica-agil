import { z } from "zod";
export const recordFieldSchema=z.object({key:z.string().regex(/^[a-z][a-z0-9_]*$/),label:z.string().min(1),hint:z.string().min(1),example:z.string().min(1),type:z.enum(["TEXT","NUMBER"]),required:z.boolean()});
export const executionGuideSchema=z.object({
  steps:z.array(z.object({title:z.string().min(1),instruction:z.string().min(12),doneWhen:z.string().min(5)})).min(2).max(6),
  recording:z.object({kind:z.enum(["PRODUCTION_LOG","FORM"]),title:z.string().min(1),unit:z.string().min(1),instructions:z.string().min(10),fields:z.array(recordFieldSchema).min(1).max(7)}).nullable(),
  completionCriteria:z.string().min(10),improvementCriteria:z.string().min(10),reviewQuestion:z.string().min(5),
});
export type ExecutionGuide=z.infer<typeof executionGuideSchema>;
export function readExecutionGuide(value:unknown){const p=executionGuideSchema.safeParse(value);return p.success?p.data:null;}
export const productionEventSchema=z.object({event:z.enum(["START","PAUSE","RESUME","OUTPUT","FINISH"]),order:z.string().trim().max(100),product:z.string().trim().max(100),quantity:z.number().int().min(0).max(1000000),note:z.string().trim().max(500)});
export type ProductionEvent=z.infer<typeof productionEventSchema>&{at:string};
export function productionState(events:ProductionEvent[]){
 let mode:"IDLE"|"RUNNING"|"PAUSED"="IDLE",order="",product="",quantity=0,workMs=0,pauseMs=0,lastAt=0;
 for(const e of events){const time=Date.parse(e.at);if(!Number.isFinite(time))continue;if(mode==="RUNNING")workMs+=Math.max(0,time-lastAt);if(mode==="PAUSED")pauseMs+=Math.max(0,time-lastAt);
  if(e.event==="START"){mode="RUNNING";order=e.order;product=e.product;}
  if(e.event==="PAUSE")mode="PAUSED";if(e.event==="RESUME")mode="RUNNING";if(e.event==="FINISH")mode="IDLE";if(e.event==="OUTPUT")quantity+=e.quantity;lastAt=time;
 }return{mode,order,product,quantity,workMinutes:Math.round(workMs/6000)/10,pauseMinutes:Math.round(pauseMs/6000)/10};
}
export function validateProductionEvent(events:ProductionEvent[],input:unknown){
 const e=productionEventSchema.parse(input),s=productionState(events);
 if(e.event==="START"&&(s.mode!=="IDLE"||!e.order||!e.product))throw Error("Informe pedido e tipo de peça e encerre o lote anterior.");
 if(["PAUSE","OUTPUT","FINISH"].includes(e.event)&&s.mode!=="RUNNING")throw Error("Inicie ou retome o lote primeiro.");
 if(e.event==="RESUME"&&s.mode!=="PAUSED")throw Error("Não há parada aberta.");
 if(e.event==="PAUSE"&&!e.note)throw Error("Informe o motivo da parada.");
 if(e.event==="OUTPUT"&&e.quantity<1)throw Error("Informe quantas peças boas saíram.");
 if(e.event!=="START"){e.order=s.order;e.product=s.product;}
 return e;
}
export function validateFormValues(guide:ExecutionGuide,values:Record<string,unknown>){
 if(guide.recording?.kind!=="FORM")throw Error("Formulário não disponível.");
 const output:Record<string,string>={};
 for(const f of guide.recording.fields){const value=String(values[f.key]??"").trim();if(value.length>1000)throw Error("Texto muito longo.");if(f.required&&!value)throw Error(`Preencha ${f.label}.`);if(value&&f.type==="NUMBER"&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error(`Confira ${f.label}.`);output[f.key]=value;}
 return output;
}
