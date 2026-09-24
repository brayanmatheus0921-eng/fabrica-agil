import assert from "node:assert/strict";
import test from "node:test";
import { proposalOverview } from "./proposal-overview";

test("aprovação de plano resume objetivo e iniciativas antes dos detalhes extensos", () => {
  const details = ["Fato informado: Brayan executa", "Hipótese: poucas oportunidades", "Prioridade: Aquisição ativa", "Objetivo: dez contatos em 30 dias", "Iniciativas: 3", "Aquisição ativa", "Ação 1 · Brayan · 7 dias\nPor quê: captar clientes", "Ação 2 · Brayan · 14 dias\nPor quê: acompanhar", "Organizar contatos", "Ação 3 · Brayan · 30 dias\nPor quê: registrar", "Medir conversão"];
  assert.deepEqual(proposalOverview(details), ["Prioridade: Aquisição ativa", "Objetivo: dez contatos em 30 dias", "Iniciativas: 3", "Aquisição ativa", "Organizar contatos", "Medir conversão"]);
});

test("aprovação comum mostra poucos dados principais e mantém revisão completa separada", () => {
  assert.deepEqual(proposalOverview(["Alvo: tarefa A", "Mudança: prazo", "Novo prazo: amanhã", "Observação longa"]), ["Alvo: tarefa A", "Mudança: prazo", "Novo prazo: amanhã"]);
});
