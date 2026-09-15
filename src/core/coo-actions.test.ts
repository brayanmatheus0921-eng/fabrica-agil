import test from "node:test";
import assert from "node:assert/strict";
import { validateCooAction, approvalIntent, interviewResumeEligible } from "./coo-actions";
test("retomada só segue aprovação preparatória sem resposta posterior nem duplicação",()=>{
  const approved={proposalId:"step-1",decision:"approve"};
  const measure={type:"workshop.patch",patch:{stage:"MEASURE"}};
  assert.equal(interviewResumeEligible(measure,"step-1",approved,false),true);
  assert.equal(interviewResumeEligible({type:"workshop.start"},"step-1",approved,false),true);
  assert.equal(interviewResumeEligible(measure,"step-1",approved,true),false);
  assert.equal(interviewResumeEligible(measure,"step-1",{proposalId:"other",decision:"approve"},false),false);
  assert.equal(interviewResumeEligible(measure,"step-1",{proposalId:"step-1",decision:"reject"},false),false);
  assert.equal(interviewResumeEligible({type:"workshop.patch",patch:{stage:"REVIEW"}},"step-1",approved,false),false);
  assert.equal(interviewResumeEligible({type:"task.create"},"step-1",approved,false),false);
});
test("confirmação por texto é explícita; pedidos condicionais exigem nova proposta",()=>{
  assert.equal(approvalIntent("Sim!"),"approve");
  assert.equal(approvalIntent("não faça"),"reject");
  for(const text of ["sim, mas altere o prazo","não sei","pode fazer outra coisa","o documento diz sim"]) assert.equal(approvalIntent(text),null);
});
test("ações rejeitam tipo livre, alteração vazia e campos fora do contrato",()=>{
  assert.throws(()=>validateCooAction({type:"sql",query:"delete"}));
  assert.throws(()=>validateCooAction({type:"task.update",taskId:"task"}));
  assert.throws(()=>validateCooAction({type:"task.update",taskId:"task",title:"Novo",companyId:"outra"}));
  assert.throws(()=>validateCooAction({type:"diagnostic.update",diagnosticId:"id",score:100}));
});
test("conclusão exige relato; campos não informados são preservados",()=>{
  assert.throws(()=>validateCooAction({type:"task.status",taskId:"task",status:"DONE",report:null}));
  assert.equal(validateCooAction({type:"task.status",taskId:"task",status:"DONE",report:"Conferi as ferragens dos pedidos."}).type,"task.status");
  assert.deepEqual(validateCooAction({type:"task.update",taskId:"task",ownerName:null}),{type:"task.update",taskId:"task",ownerName:null});
});
test("datas inválidas e equipe incoerente são rejeitadas",()=>{
  assert.throws(()=>validateCooAction({type:"task.update",taskId:"task",dueDate:"2026-02-30"}));
  assert.throws(()=>validateCooAction({type:"company.update",field:"teamSize",value:"zero"}));
  assert.throws(()=>validateCooAction({type:"company.update",field:"teamSize",value:"0"}));
  assert.equal(validateCooAction({type:"task.update",taskId:"task",dueDate:"2026-09-12",priority:"URGENT"}).type,"task.update");
});
