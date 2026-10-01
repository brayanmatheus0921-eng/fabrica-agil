import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConversationVisual } from "./conversation-visual";

test("quadro de planilha exibe todos os dados como texto seguro e controles de consulta", () => {
  const html = renderToStaticMarkup(createElement(ConversationVisual, { visual: { kind: "TABLE", id: "x", title: "Pareto", columns: ["Causa", "Qtd"], rows: [["<script>attack()</script>", "25"], ["Faltou", "16"]], note: "Dados informados" } }));
  assert.match(html, /<table/);
  assert.match(html, /Faltou/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|Abrir para preencher|Aprovar|Ferramenta criada/);
  assert.match(html, /Copiar/);
  assert.match(html, /Recolher/);
});
test("documento utiliza Markdown seguro", () => {
  const html = renderToStaticMarkup(createElement(ConversationVisual, { visual: { kind: "DOCUMENT", id: "d", title: "Explicação", markdown: "## Fatos\n\n**25 ocorrências**\n\n<script>attack()</script>" } }));
  assert.match(html, /<h2[^>]*>Fatos/);
  assert.match(html, /<strong[^>]*>25 ocorrências/);
  assert.doesNotMatch(html, /<script>/);
});
