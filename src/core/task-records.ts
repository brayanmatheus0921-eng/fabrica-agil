import { z } from "zod";
import { productionEventSchema, type ProductionEvent } from "./task-execution";
export const savedRecordSchema=z.object({id:z.string(),at:z.string(),kind:z.enum(["PRODUCTION_EVENT","FORM_ENTRY"]),values:z.record(z.string(),z.string()).optional(),event:productionEventSchema.optional(),voided:z.boolean().optional()});
export type SavedRecord=z.infer<typeof savedRecordSchema>;
export function readRecords(rows:Array<{id:string;metadata:unknown}>):SavedRecord[]{return rows.flatMap(row=>{const p=savedRecordSchema.safeParse({...Object(row.metadata),id:row.id});return p.success?[p.data]:[];});}
export function eventsFrom(records:SavedRecord[]):ProductionEvent[]{return records.filter(r=>!r.voided&&r.event).map(r=>({...r.event!,at:r.at}));}
