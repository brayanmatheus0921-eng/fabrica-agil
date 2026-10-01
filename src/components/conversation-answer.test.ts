import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConversationAnswer } from "./conversation-answer";

test("ação prática aparece depois da análise e dos quadros, com Markdown seguro", () => {
  const html = renderToStaticMarkup(createElement(ConversationAnswer, { content: "Análise", visualBlocks: [{ kind: "TABLE", id: "x", title: "Dados", columns: ["Qtd"], rows: [["25"]], note: null }], nextAction: "**Comece aqui:** inspecione o acabamento. <script>attack()</script>" }));
  assert.ok(html.indexOf("Análise") < html.indexOf("<table"));
  assert.ok(html.indexOf("</table>") < html.indexOf("Comece aqui"));
  assert.match(html, /<strong[^>]*>Comece aqui:/);
  assert.doesNotMatch(html, /<script>/);
});

test("mensagens antigas continuam sem fechamento vazio", () => {
  const html = renderToStaticMarkup(createElement(ConversationAnswer, { content: "Resposta antiga" }));
  assert.match(html, /Resposta antiga/);
  assert.doesNotMatch(html, /data-next-action/);
});
