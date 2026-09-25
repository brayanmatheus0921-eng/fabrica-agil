import test from "node:test";
import assert from "node:assert/strict";
import { validateCanvas, canvasCsv } from "./workspace-artifacts";
import { executionContext, taskProgress } from "./task-progress";
const sheet = {kind:"SPREADSHEET",title:"Paradas",purpose:"Medir",instructions:"Anote por ocorrência",sections:[],columns:["Pedido","Minutos"],rows:[["Pedido 01","12"]],example:["EXEMPLO","5"]};
test("Canvas valida tabela e mantém exemplo fora dos registros exportados",()=>{
  const content=validateCanvas(sheet);const csv=canvasCsv(content);
  assert.match(csv,/Pedido 01/);assert.doesNotMatch(csv,/EXEMPLO/);
  assert.throws(()=>validateCanvas({...sheet,rows:[["sem segunda coluna"]]}));
});
test("documento exige ao menos uma seção e aceita campos vazios para preencher",()=>{
  assert.throws(()=>validateCanvas({...sheet,kind:"DOCUMENT",sections:[]}));
  assert.equal(validateCanvas({...sheet,kind:"DOCUMENT",sections:[{heading:"Cargo",body:""}]}).sections[0].body,"");
});
test("acompanhamento ignora rascunhos e registra resultados sem inventar melhoria",()=>{
  const tasks=[{id:"t1",title:"Medir",status:"DONE",evidence:[{id:"n1",metadata:{kind:"TASK_UPDATE",category:"RESULT",text:"Saíram 12 peças"}}]}];
  const draft={id:"a1",title:"Planilha",taskId:"t1",confirmedAt:null,interpretation:{summary:"Dados",observations:[],uncertainties:[],recommendation:"Comparar períodos"}};
  const progress=taskProgress(tasks,[draft]);assert.equal(progress.percent,100);assert.equal(progress.results.length,1);assert.equal(progress.confirmed.length,0);
  assert.equal(taskProgress(tasks,[{...draft,confirmedAt:new Date()}]).confirmed.length,1);
  assert.equal(taskProgress(tasks,[{...draft,confirmedAt:new Date(),taskId:"outra"}]).confirmed.length,0);
});
test("canceladas não inflam progresso e registros desfeitos não contam",()=>{
  const progress=taskProgress([{id:"t1",title:"Medir",status:"TODO",evidence:[{id:"r1",metadata:{id:"r1",at:"2026-08-31",kind:"FORM_ENTRY",values:{a:"1"},voided:true}}]},{id:"t2",title:"Cancelada",status:"CANCELLED",evidence:[]}],[]);
  assert.equal(progress.total,1);assert.equal(progress.recordCount,0);assert.equal(progress.nextTask?.id,"t1");
});
test("acompanhamento considera registros reais recentes e bloqueios sem inventar resultado",()=>{
  const progress=taskProgress([
    {id:"t1",title:"Registrar produção",status:"IN_PROGRESS",evidence:[
      {id:"r1",metadata:{at:"2026-09-24T10:00:00.000Z",kind:"FORM_ENTRY",values:{pecas:"12"}}},
      {id:"r2",metadata:{at:"2026-09-25T10:00:00.000Z",kind:"FORM_ENTRY",values:{pecas:"14"}}},
      {id:"r3",metadata:{at:"2026-09-25T11:00:00.000Z",kind:"FORM_ENTRY",values:{pecas:"20"},voided:true}},
    ]},
    {id:"t2",title:"Resolver parada",status:"BLOCKED",evidence:[]},
  ],[]);
  assert.equal(progress.recordCount,2);
  assert.deepEqual(progress.recentRecords.map(r=>r.id),["r2","r1"]);
  assert.equal(progress.recentRecords[0].taskTitle,"Registrar produção");
  assert.equal(progress.blocked,1);
  assert.equal(progress.nextTask?.id,"t2");
  assert.equal(progress.results.length,0);
  assert.match(progress.assessment,/bloqueada/);
  const context=executionContext("plano-1",progress);
  assert.equal(context.planId,"plano-1");
  assert.equal(context.recordCount,2);
  assert.deepEqual(context.recentRecords.map(r=>r.id),["r2","r1"]);
});
