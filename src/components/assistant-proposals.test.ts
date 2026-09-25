import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantProposals } from "./assistant-proposals";
import type { CooProposalView } from "@/core/coo-actions";
import type { ArtifactView } from "@/core/workspace-artifacts";

test("ferramenta aprovada aparece na própria conversa", () => {
  const artifact: ArtifactView = { id: "art-1", taskId: "task-1", threadId: "thread-1", title: "Metas formais", kind: "SPREADSHEET", content: { kind: "SPREADSHEET", title: "Metas formais", purpose: "Acompanhar metas", instructions: "", sections: [], columns: ["Meta"], rows: [["10 pedidos"]], example: [] }, interpretation: null, originalName: null, confirmedAt: null, revision: 1, updatedAt: "2026-09-25T00:00:00.000Z" };
  const proposal: CooProposalView = { id: "proposal-1", threadId: "thread-1", sourceMessageId: "message-1", summary: "Criar metas formais?", details: [], status: "APPLIED", createdAt: "2026-09-25T00:00:00.000Z", result: { message: "Ferramenta salva.", href: "/assistente?chat=thread-1", artifactId: artifact.id }, resumeInterview: false };
  const html = renderToStaticMarkup(createElement(AssistantProposals, { rows: [proposal], busy: false, onAdjust: () => {}, onApplied: () => {}, onChanged: () => {}, artifacts: { [artifact.id]: artifact }, onOpenArtifact: () => {} }));
  assert.match(html, /Metas formais/);
  assert.match(html, /<table/);
  assert.match(html, /10 pedidos/);
  assert.match(html, /Abrir para preencher/);
});

test("cartão anterior não duplica a prévia quando a confirmação já a mostra", () => {
  const artifact: ArtifactView = { id: "art-1", taskId: null, threadId: "thread-1", title: "Metas formais", kind: "SPREADSHEET", content: { kind: "SPREADSHEET", title: "Metas formais", purpose: "", instructions: "", sections: [], columns: ["Meta"], rows: [["10 pedidos"]], example: [] }, interpretation: null, originalName: null, confirmedAt: null, revision: 1, updatedAt: "2026-09-25T00:00:00.000Z" };
  const proposal: CooProposalView = { id: "proposal-1", threadId: "thread-1", sourceMessageId: "message-1", summary: "Criar metas formais?", details: [], status: "APPLIED", createdAt: "2026-09-25T00:00:00.000Z", result: { message: "Ferramenta salva.", href: "/assistente?chat=thread-1", artifactId: artifact.id }, resumeInterview: false };
  const html = renderToStaticMarkup(createElement(AssistantProposals, { rows: [proposal], busy: false, onAdjust: () => {}, onApplied: () => {}, onChanged: () => {}, artifacts: { [artifact.id]: artifact }, hideArtifactPreviewIds: new Set([proposal.id]) }));
  assert.doesNotMatch(html, /<table/);
  assert.doesNotMatch(html, /Ver na plataforma/);
});
