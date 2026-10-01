import assert from "node:assert/strict";
import test from "node:test";
import { conversationVisualsSchema, readConversationVisuals, visualToText, removeRepeatedVisualTables, conversationVisualContext } from "./conversation-visuals";

const table = { kind: "TABLE", id: "pareto", title: "Ocorrências", columns: ["Problema", "Quantidade"], rows: [["Acabamento", "25"], ["Faltou", "16"]], note: null };
test("valida documentos e tabelas e recupera somente metadados da versão suportada", () => {
  const blocks = conversationVisualsSchema.parse([table, { kind: "DOCUMENT", id: "analysis", title: "Análise", markdown: "## Fatos\n\n**25** ocorrências." }]);
  assert.deepEqual(readConversationVisuals({ conversationVisuals: { version: 1, blocks } }), blocks);
  assert.deepEqual(readConversationVisuals(null), []);
  assert.deepEqual(readConversationVisuals({ requestId: "old" }), []);
  assert.deepEqual(readConversationVisuals({ conversationVisuals: { version: 2, blocks } }), []);
});
test("rejeita linhas incompatíveis, IDs duplicados e excesso sem truncar silenciosamente", () => {
  for (const blocks of [[{ ...table, rows: [["25"]] }], [table, table], [{ ...table, rows: Array.from({ length: 201 }, () => ["a", "1"]) }], [{ kind: "HTML", id: "x", title: "x", html: "<script/>" }]]) {
    assert.equal(conversationVisualsSchema.safeParse(blocks).success, false);
    assert.deepEqual(readConversationVisuals({ conversationVisuals: { version: 1, blocks } }), []);
  }
});
test("copia dados como texto sem executar fórmulas ou interpretar HTML", () => {
  const blocks = conversationVisualsSchema.parse([{ ...table, rows: [["<script>alert(1)</script>", "=1+1"]] }]);
  assert.match(visualToText(blocks[0]), /=1\+1/);
  assert.match(visualToText(blocks[0]), /Problema\tQuantidade/);
});
test("remove somente tabela idêntica ao quadro, preservando justificativa, outras tabelas e código", () => {
  const reply = "Comece por acabamento.\n\n| Problema | Quantidade |\n| --- | ---: |\n| Acabamento | 25 |\n| Faltou | 16 |\n\nSão 41 casos.\n\n| Outro | Valor |\n| --- | --- |\n| X | 2 |\n\n```md\n| Problema | Quantidade |\n| --- | --- |\n| Acabamento | 25 |\n| Faltou | 16 |\n```";
  const result = removeRepeatedVisualTables(reply, conversationVisualsSchema.parse([table]));
  assert.equal((result.match(/\| Problema \| Quantidade \|/g) ?? []).length, 1);
  assert.match(result, /São 41 casos/);
  assert.match(result, /\| Outro \| Valor \|/);
  assert.match(result, /```md/);
});
test("limita tamanho agregado dos quadros para preservar contexto e desempenho", () => {
  const document = { kind: "DOCUMENT", id: "d", title: "Explicação", markdown: "x".repeat(20_000) };
  assert.equal(conversationVisualsSchema.safeParse([document, { ...document, id: "e" }, { ...document, id: "f" }]).success, false);
});
test("contexto preserva os dois quadros anteriores e mantém referências quando o orçamento termina", () => {
  const messages = ["first", "second"].map(id => ({ id, metadata: { conversationVisuals: { version: 1, blocks: [{ kind: "DOCUMENT", id, title: id, markdown: `Dados de ${id}` }] } } }));
  const full = conversationVisualContext(messages);
  assert.equal(full.length, 2);
  assert.ok(full.every(m => m.complete));
  assert.match(JSON.stringify(full[0]), /Dados de first/);
  const bounded = conversationVisualContext(messages, 1);
  assert.equal(bounded.length, 2);
  assert.equal(bounded[0].messageId, "first");
  assert.equal(bounded[0].complete, false);
  assert.equal(bounded[0].blocks[0].title, "first");
});
