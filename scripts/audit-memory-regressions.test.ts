// Audit-only characterization tests. Known gaps are TODO, not production fixes.
import assert from "node:assert/strict";
import test from "node:test";
import { consolidateMemory, emptyConversationMemory, resolveShortConfirmation } from "../src/core/conversation-memory";

test("confirmed short reply must survive memory consolidation even if the model paraphrases it",()=>{
 const previous={...emptyConversationMemory("PLAN"),awaitingConfirmation:{text:"Brayan será o responsável pelo plano",assistantMessageId:"a1"}};
 const messages=[{id:"a1",role:"ASSISTANT",content:"Brayan será o responsável pelo plano. Confirma?"},{id:"u1",role:"USER",content:"sim"}];
 assert.ok(resolveShortConfirmation(previous,messages));
 const next=consolidateMemory(previous,{...emptyConversationMemory("PLAN"),decisions:[{text:"A responsabilidade pelo plano é de Brayan",sourceMessageId:"u1",excerpt:"sim"}]},messages,"PLAN","a2","Qual prazo?");
 assert.equal(next.decisions.length,1);
});

test("memory cannot promote a hypothesis by quoting only the certain-looking part",()=>{
 const previous=emptyConversationMemory("PLAN");
 const next=consolidateMemory(previous,{...previous,confirmedFacts:[{text:"O principal problema é vendas",sourceMessageId:"u1",excerpt:"nosso problema seja vendas"}]},[{id:"u1",role:"USER",content:"Talvez nosso problema seja vendas, ainda não tenho certeza."}],"PLAN","a1","Vamos investigar?");
 assert.equal(next.confirmedFacts.length,0);
});

test("a previously confirmed decision remains grounded after leaving the recent window",()=>{
 const fact={text:"Brayan coordena",sourceMessageId:"old",excerpt:"Brayan coordena"};
 const previous={...emptyConversationMemory("PLAN"),decisions:[fact]};
 const recent=Array.from({length:50},(_,i)=>({id:`new-${i}`,role:i%2?"ASSISTANT":"USER",content:"Outros detalhes do plano"}));
 assert.deepEqual(consolidateMemory(previous,previous,recent,"PLAN","a2","Qual prazo?").decisions,[fact]);
});

test("an explicit correction can replace a superseded fact",()=>{
 const previous={...emptyConversationMemory("PLAN"),confirmedFacts:[{text:"Prioridade: retrabalho",sourceMessageId:"old",excerpt:"retrabalho"}]};
 const corrected={text:"Prioridade: aquisição",sourceMessageId:"new",excerpt:"A prioridade agora é aquisição"};
 const next=consolidateMemory(previous,{...previous,confirmedFacts:[corrected],hypotheses:[]},[{id:"new",role:"USER",content:"A prioridade agora é aquisição"}],"PLAN","a2","Vamos detalhar?");
 assert.deepEqual(next.confirmedFacts,[corrected]);
});
