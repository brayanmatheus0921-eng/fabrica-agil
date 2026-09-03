import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantMarkdown } from "./assistant-markdown";

test("renderiza títulos, listas e tabelas Markdown sem mostrar os marcadores", () => {
  const html = renderToStaticMarkup(createElement(AssistantMarkdown, {
    text: "### Como usar\n\n- Primeiro passo\n- Segundo passo\n\n| Item | Estado |\n| --- | --- |\n| Pedido | Pronto |",
  }));
  assert.match(html, /<h3[^>]*>Como usar<\/h3>/);
  assert.match(html, /<ul/);
  assert.match(html, /<table/);
  assert.doesNotMatch(html, /### Como usar/);
});

test("não interpreta HTML enviado pelo modelo", () => {
  const html = renderToStaticMarkup(createElement(AssistantMarkdown, { text: "<script>alert('x')</script>\n\n**Seguro**" }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<strong[^>]*>Seguro<\/strong>/);
});
