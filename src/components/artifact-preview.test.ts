import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactPreview } from "./artifact-preview";
import type { ArtifactView } from "@/core/workspace-artifacts";

const base: ArtifactView = {
  id: "art-1", taskId: "task-1", threadId: "thread-1", title: "Metas formais", kind: "SPREADSHEET",
  content: { kind: "SPREADSHEET", title: "Metas formais", purpose: "Acompanhar metas", instructions: "Preencha a meta semanal.", sections: [], columns: ["Meta", "Responsável"], rows: [["Entregar 10 pedidos", "Brayan"]], example: [] },
  interpretation: null, originalName: null, confirmedAt: null, revision: 1, updatedAt: "2026-09-25T00:00:00.000Z",
};

test("mostra uma planilha real no cartão da conversa", () => {
  const html = renderToStaticMarkup(createElement(ArtifactPreview, { artifact: base }));
  assert.match(html, /Metas formais/);
  assert.match(html, /<table/);
  assert.match(html, /Entregar 10 pedidos/);
  assert.match(html, /Brayan/);
});

test("documento mostra as seções sem interpretar HTML como código", () => {
  const html = renderToStaticMarkup(createElement(ArtifactPreview, { artifact: { ...base, kind: "DOCUMENT", content: { ...base.content!, kind: "DOCUMENT", sections: [{ heading: "Ação", body: "<script>alert(1)</script>" }], columns: [], rows: [] } } }));
  assert.match(html, /Ação/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
