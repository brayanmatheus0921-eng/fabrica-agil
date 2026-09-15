import assert from "node:assert/strict";
import test from "node:test";
import { applyWorkshopPatch, newWorkshop, revisitWorkshop, type WorkshopPatch } from "./coo-workshop";

const initial=newWorkshop("diagnosis","Diagnóstico de teste");
test("workshop começa sem plano nem prioridade inventada",()=>{assert.equal(initial.stage,"UNDERSTAND");assert.equal(initial.plan,null);assert.equal(initial.decision,null);});
test("não pula etapas comuns nem aprova pelo modelo",()=>{
  assert.throws(()=>applyWorkshopPatch(initial,{...initial,stage:"PLAN"},[],[],[]));
  assert.throws(()=>applyWorkshopPatch(initial,{...initial,stage:"FOLLOW_UP"},[],[],[]));
});
test("fatos e decisão exigem origem em mensagem do gestor",()=>{
  assert.throws(()=>applyWorkshopPatch(initial,{...initial,confirmedFacts:[{statement:"Atrasos",sourceMessageId:"inventado"}]},[],[],[]));
  const state=applyWorkshopPatch(initial,{...initial,confirmedFacts:[{statement:"Atrasos declarados",sourceMessageId:"user1"}],stage:"MEASURE"},["user1"],[],[]);
  assert.equal(state.revision,1);assert.equal(state.history.length,1);
  const back=revisitWorkshop(state,"UNDERSTAND");assert.equal(back.confirmedFacts.length,1);assert.equal(back.history.length,2);
});
test("revisão sem decisão e plano completo é rejeitada",()=>{
  assert.throws(()=>applyWorkshopPatch({...initial,stage:"PLAN"},{...initial,stage:"REVIEW"},[],[],[]));
});
test("não revisita etapa futura nem altera plano aprovado",()=>{
  assert.throws(()=>revisitWorkshop(initial,"PLAN"));
  assert.throws(()=>revisitWorkshop({...initial,stage:"FOLLOW_UP"},"UNDERSTAND"));
});

const userId="gestor-1";
function proposal(count:number): WorkshopPatch {
  const initiatives=Array.from({length:count},(_,index)=>({
    title:`Iniciativa ${index+1}`,kind:index===0?"PRIMARY" as const:"SECONDARY" as const,
    facts:"Relato do gestor",hypothesis:"Causa a confirmar",evidenceCodes:[userId],methodCode:null,
    actions:[{what:`Ação ${index+1}`,why:"Reduzir atrasos",who:"Brayan",whenDays:14,where:"Produção",how:"Registrar pedido e prazo",howMuch:"A estimar",indicator:"Pedidos atrasados",baseline:"A medir",target:"Definir após medição",proof:"Registro semanal",reviewCadence:"Semanal"}],
  }));
  return {stage:"REVIEW",summary:"Plano viável combinado",confirmedFacts:[{statement:"Há atrasos",sourceMessageId:userId}],hypotheses:["Fila é hipótese"],decision:{primaryTitle:"Iniciativa 1",reason:"Prioridade indicada pelo gestor",basis:"PREFERENCE",confirmedByMessageId:userId},plan:{objective:"Reduzir atrasos",initiatives}};
}

test("não aprova plano incompleto nem prioridade sem origem do gestor",()=>{
  const current=newWorkshop("diagnostico-1","Diagnóstico preenchido");
  assert.throws(()=>applyWorkshopPatch(current,proposal(1),[userId],[],[]),/3 a 5 iniciativas/);
  const invalid=proposal(3);invalid.decision!.confirmedByMessageId="id-da-ia";
  assert.throws(()=>applyWorkshopPatch(current,invalid,[userId],[],[]),/confirmação do gestor/);
});

test("permite propor revisão final diretamente quando já há 3 a 5 iniciativas completas",()=>{
  const current=newWorkshop("diagnostico-1","Diagnóstico preenchido");
  for(const count of [3,4,5]){
    const state=applyWorkshopPatch(current,proposal(count),[userId],[],[]);
    assert.equal(state.stage,"REVIEW");assert.equal(state.plan?.initiatives.length,count);
  }
});
