import assert from "node:assert/strict";
import test from "node:test";
import { emptyConversationMemory, consolidateMemory, resolveShortConfirmation, workshopFromMemory } from "./conversation-memory";
import { newWorkshop } from "./coo-workshop";

test("sim confirma somente a sugestão inequívoca imediatamente anterior", () => {
  const memory = { ...emptyConversationMemory("PLAN"), awaitingConfirmation: { text: "Mateus será o responsável pelo piloto", assistantMessageId: "a1" } };
  const messages = [{ id: "a1", role: "ASSISTANT", content: "Mateus será o responsável pelo piloto. Você confirma?" }, { id: "u1", role: "USER", content: "sim" }];
  assert.equal(resolveShortConfirmation(memory, messages)?.text, "Mateus será o responsável pelo piloto");
  assert.equal(resolveShortConfirmation(memory, [...messages, { id: "a2", role: "ASSISTANT", content: "Qual prazo?" }, { id: "u2", role: "USER", content: "sim" }]), null);
  assert.equal(resolveShortConfirmation(memory, [messages[0], { ...messages[1], content: "sim, mas só depois" }]), null);
  assert.equal(resolveShortConfirmation(emptyConversationMemory("PLAN"), messages), null);
});

test("registro preserva fatos antigos e rebaixa afirmações sem fonte literal para hipótese", () => {
  const previous = emptyConversationMemory("PLAN");
  const fact = { text: "Mateus é responsável", sourceMessageId: "old", excerpt: "Mateus é responsável" };
  const draft = { ...previous, confirmedFacts: [fact], hypotheses: ["Falta de padrão pode contribuir"], summary: "Piloto em definição", currentStage: "PLAN", nextStep: "Combinar prazo", awaitingConfirmation: null };
  const messages = [{ id: "old", role: "USER", content: "Mateus é responsável" }];
  const saved = consolidateMemory(previous, draft, messages, "PLAN", "a1", "Qual prazo?");
  assert.deepEqual(saved.confirmedFacts, [fact]);
  assert.equal(saved.hypotheses.length, 1);
  const invented = consolidateMemory(previous, { ...draft, confirmedFacts: [{ ...fact, sourceMessageId: "invented" }] }, messages, "PLAN", "a1", "Qual prazo?");
  assert.equal(invented.confirmedFacts.length, 0);
  assert.ok(invented.hypotheses.includes("A confirmar: Mateus é responsável"));
  const uncertain = consolidateMemory(previous, { ...draft, confirmedFacts: [{ ...fact, excerpt: "Talvez Mateus" }] }, [{ id: "old", role: "USER", content: "Talvez Mateus" }], "PLAN", "a1", "Qual prazo?");
  assert.equal(uncertain.confirmedFacts.length, 0);
  assert.ok(uncertain.hypotheses.includes("A confirmar: Mateus é responsável"));
});

test("progresso da entrevista acompanha registro sem criar plano nem tarefas", () => {
  const memory = { ...emptyConversationMemory("PLAN"), currentStage: "PLAN", summary: "Responsável e prioridade definidos", nextStep: "Combinar recursos" };
  const result = workshopFromMemory(newWorkshop("d1", "Diagnóstico"), memory);
  assert.equal(result.stage, "PLAN");
  assert.equal(result.summary, "Responsável e prioridade definidos");
  assert.equal(result.planId, null);
  assert.equal(result.plan, null);
  assert.equal(result.furthestStage, 4);
});

test("registro é limitado e não permite usar etapa operacional no Plano", () => {
  const memory = emptyConversationMemory("PLAN");
  assert.throws(() => consolidateMemory(memory, { ...memory, hypotheses: Array(31).fill("Hipótese") }, [], "PLAN", "a1", "Pergunta?"));
  assert.throws(() => consolidateMemory(memory, { ...memory, currentStage: "EXECUTION" }, [], "PLAN", "a1", "Pergunta?"));
});
