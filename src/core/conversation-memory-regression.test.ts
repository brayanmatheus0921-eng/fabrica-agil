import assert from "node:assert/strict";
import test from "node:test";
import { consolidateMemory, conversationMemorySchema, emptyConversationMemory, readConversationMemory } from "./conversation-memory";
import { newWorkshop } from "./coo-workshop";

function factFrom(source: string, text: string, excerpt = text) {
  const previous = emptyConversationMemory("PLAN");
  return consolidateMemory(previous, { ...previous, confirmedFacts: [{ text, excerpt, sourceMessageId: "u1" }] }, [{ id: "u1", role: "USER", content: source }], "PLAN", "a1", "Vamos continuar?");
}

test("ressalva posterior impede promover afirmação a fato", () => {
  for (const separator of [" ", "\n"]) {
    assert.equal(factFrom(`Vendas é o principal problema.${separator}Ainda não tenho certeza.`, "Vendas é o principal problema").confirmedFacts.length, 0);
  }
});

test("fonte literal não autoriza números, nomes, datas ou certeza inventados", () => {
  for (const [source, fact] of [
    ["Ainda não medimos o prejuízo", "Perdemos R$ 50.000 por mês"],
    ["Perdemos R$ 500 por mês", "Perdemos R$ 50.000 por mês"],
    ["Brayan coordena o plano", "Anny coordena o plano"],
    ["A entrega é em 10/10/2026", "A entrega é em 10/11/2026"],
    ["Alguns pedidos atrasam", "Todos os pedidos atrasam"],
    ["Não perdemos pedidos", "Perdemos pedidos"],
    ["Ainda não confirmamos que vendas é o gargalo", "vendas é o gargalo"],
  ]) assert.equal(factFrom(source, fact, source).confirmedFacts.length, 0, fact);
  assert.equal(factFrom("Brayan coordena o plano. O prazo é 30 dias.", "Brayan coordena o plano").confirmedFacts.length, 1);
});

test("correção explícita preserva rótulo de prioridade sem mudar seu valor ou ressalvas", () => {
  const previous = { ...emptyConversationMemory("PLAN"), confirmedFacts: [{ text: "Prioridade: retrabalho", excerpt: "retrabalho", sourceMessageId: "old" }] };
  const corrected = { text: "Prioridade: aquisição", excerpt: "A prioridade agora é aquisição", sourceMessageId: "new" };
  const result = consolidateMemory(previous, { ...previous, confirmedFacts: [corrected] }, [{ id: "new", role: "USER", content: corrected.excerpt }], "PLAN", "a1", "Vamos detalhar?");
  assert.deepEqual(result.confirmedFacts, [corrected]);
  assert.equal(factFrom("A prioridade agora é aquisição", "Prioridade: vendas", "A prioridade agora é aquisição").confirmedFacts.length, 0);
  assert.equal(factFrom("A prioridade agora é aquisição se houver orçamento", "Prioridade: aquisição", "A prioridade agora é aquisição se houver orçamento").confirmedFacts.length, 0);
});

test("21ª decisão mantém a memória válida e preserva a nova confirmação", () => {
  const decisions = Array.from({ length: 20 }, (_, i) => ({ text: `Decisão ${i}`, sourceMessageId: `u${i}`, excerpt: `Decisão ${i}` }));
  const previous = { ...emptyConversationMemory("PLAN"), summary: "Plano em construção", decisions, awaitingConfirmation: { text: "Brayan coordena", assistantMessageId: "a21" } };
  const result = consolidateMemory(previous, { ...previous, awaitingConfirmation: null }, [{ id: "a21", role: "ASSISTANT", content: "Brayan coordena. Confirma?" }, { id: "u21", role: "USER", content: "sim" }], "PLAN", "a22", "Qual prazo?");
  assert.ok(conversationMemorySchema.safeParse(result).success);
  assert.equal(result.decisions.length, 20);
  assert.equal(result.decisions.at(-1)?.text, "Brayan coordena");
  assert.equal(readConversationMemory(result, "PLAN").summary, previous.summary);
});

test("consolidação inválida preserva última memória válida", () => {
  const previous = { ...emptyConversationMemory("PLAN"), summary: "Prioridade confirmada", currentStage: "PLAN" };
  assert.deepEqual(consolidateMemory(previous, { summary: 42 }, [], "PLAN", "a1", "Qual prazo?"), previous);
  assert.deepEqual(readConversationMemory({ summary: 42 }, "PLAN", { fallback: previous }), previous);
});

test("leitura recupera registro legado excedente sem apagar conteúdo válido", () => {
  const previous = { ...emptyConversationMemory("PLAN"), summary: "Não apagar", decisions: Array.from({ length: 21 }, (_, i) => ({ text: `Decisão ${i}`, sourceMessageId: `u${i}`, excerpt: `Decisão ${i}` })) };
  const result = readConversationMemory(previous, "PLAN");
  assert.equal(result.summary, "Não apagar");
  assert.equal(result.decisions.length, 20);
  assert.ok(conversationMemorySchema.safeParse(result).success);
});

test("workflow aprovado é fonte única da etapa do Registro inclusive na retomada", () => {
  const workflow = { ...newWorkshop("d1", "Diagnóstico"), stage: "FOLLOW_UP" as const, planId: "p1" };
  const memory = { ...emptyConversationMemory("PLAN"), currentStage: "REVIEW", pendingQuestions: ["Aprovar?"], awaitingConfirmation: { text: "Aprovar plano", assistantMessageId: "a1" } };
  const result = readConversationMemory(memory, "PLAN", { workshop: workflow });
  assert.equal(result.currentStage, workflow.stage);
  assert.deepEqual(result.pendingQuestions, []);
  assert.equal(result.awaitingConfirmation, null);
  assert.equal(readConversationMemory(result, "PLAN", { workshop: workflow }).currentStage, "FOLLOW_UP");
});
