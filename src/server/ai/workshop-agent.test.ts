import assert from "node:assert/strict";
import test from "node:test";
import { renderInterviewQuestion } from "./workshop-agent";

test("entrevista não pode terminar sem pergunta nem pedir aprovação sem proposta",()=>{
  for(const question of [null,"Já está pronto.","Posso aprovar este plano?","Posso criar as tarefas?"]){
    assert.throws(()=>renderInterviewQuestion("Entendi.",question));
  }
  assert.equal(renderInterviewQuestion("Há retrabalho.","Quem fará a conferência?"),"Há retrabalho.\n\nQuem fará a conferência?");
});
