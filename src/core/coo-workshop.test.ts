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
  const state=applyWorkshopPatch(initial,{...initial,confirmedFacts:[{statement:"Atrasos declarados",sourceMessageId:"user1"}],stage:"MEASURE"},[{id:"user1",content:"Temos atrasos."}],[],[]);
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
const managerContent="Priorize o retrabalho de medidas. Brayan responde pelas ações. Temos 30 dias para executar. A equipe dispõe de duas horas por semana. O custo ainda não sei; Brayan fará a estimativa antes de comprar.";
const managerMessages=[{id:userId,content:managerContent}];
function proposal(count:number): WorkshopPatch {
  const initiatives=Array.from({length:count},(_,index)=>({
    title:`Iniciativa ${index+1}`,kind:index===0?"PRIMARY" as const:"SECONDARY" as const,
    facts:"Relato do gestor",hypothesis:"Causa a confirmar",evidenceCodes:[userId],methodCode:null,
    actions:[{what:`Ação ${index+1}`,why:"Reduzir atrasos",who:"Brayan",whenDays:14,where:"Produção",how:"Registrar pedido e prazo",howMuch:"A estimar",indicator:"Pedidos atrasados",baseline:"A medir",target:"Definir após medição",proof:"Registro semanal",reviewCadence:"Semanal"}],
  }));
  const agreement=(excerpt:string)=>({sourceMessageId:userId,excerpt});
  return {stage:"REVIEW",summary:"Plano viável combinado",confirmedFacts:[{statement:"Há atrasos",sourceMessageId:userId}],hypotheses:["Fila é hipótese"],decision:{primaryTitle:"Iniciativa 1",reason:"Prioridade indicada pelo gestor",basis:"PREFERENCE",confirmedByMessageId:userId},planningAgreement:{priority:agreement("Priorize o retrabalho de medidas"),ownership:agreement("Brayan responde pelas ações"),deadline:agreement("Temos 30 dias para executar"),capacity:agreement("A equipe dispõe de duas horas por semana"),resources:agreement("O custo ainda não sei; Brayan fará a estimativa antes de comprar")},plan:{objective:"Reduzir atrasos",initiatives}};
}

test("não aprova plano incompleto nem prioridade sem origem do gestor",()=>{
  const current=newWorkshop("diagnostico-1","Diagnóstico preenchido");
  assert.throws(()=>applyWorkshopPatch(current,proposal(1),managerMessages,[],[]),/3 a 5 iniciativas/);
  const invalid=proposal(3);invalid.decision!.confirmedByMessageId="id-da-ia";
  assert.throws(()=>applyWorkshopPatch(current,invalid,managerMessages,[],[]),/confirmação do gestor/);
});

test("revisão final exige acordos explícitos e trechos reais do gestor",()=>{
  const current=newWorkshop("diagnostico-1","Diagnóstico preenchido");
  const missing=proposal(3);missing.planningAgreement=null;
  assert.throws(()=>applyWorkshopPatch(current,missing,managerMessages,[],[]),/confirme prioridade/);
  const invented=proposal(3);invented.planningAgreement!.capacity.excerpt="A equipe dispõe de vinte horas por semana";
  assert.throws(()=>applyWorkshopPatch(current,invented,managerMessages,[],[]),/trecho real/);
});

test("permite propor revisão final diretamente quando já há 3 a 5 iniciativas completas",()=>{
  const current=newWorkshop("diagnostico-1","Diagnóstico preenchido");
  for(const count of [3,4,5]){
    const state=applyWorkshopPatch(current,proposal(count),managerMessages,[],[]);
    assert.equal(state.stage,"REVIEW");assert.equal(state.plan?.initiatives.length,count);
  }
});

test("acordo curto exige confirmação vinculada à sugestão, nunca sim solto", () => {
  const patch = proposal(3);
  patch.planningAgreement!.capacity = { sourceMessageId: "yes", excerpt: "sim" };
  const messages = [...managerMessages, { id: "yes", content: "sim" }];
  assert.throws(() => applyWorkshopPatch(initial, patch, messages, [], []), /inequívoca/);
  assert.equal(applyWorkshopPatch(initial, patch, messages, [], [], ["yes"]).stage, "REVIEW");
});
