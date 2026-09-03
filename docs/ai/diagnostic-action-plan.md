# Plano de ação por diagnóstico

> Fluxo anterior, mantido para leitura de planos já gerados. Novos planos usam a conversa e a skill descritas em `docs/ai/plano-colaborativo.md`. O botão atual é **Construir plano com a IA**; não gera mais um plano fechado automaticamente.

- `/diagnostico`: lista de ciclos; nunca seleciona automaticamente o último.
- `/diagnostico?id=...`: resultado escolhido e botão **Criar plano com IA**.
- A geração reutiliza o prompt COO de `src/server/ai/prompt.ts`, com o modo específico de `src/server/ai/diagnostic-plan-agent.ts`.
- A entrada contém somente a empresa, as respostas do ciclo selecionado, a matriz calculada e os métodos ativos com versão publicada. A análise textual anterior não define a ordem.
- `src/core/diagnostic-plan.ts` valida exatamente 3 prioridades, os códigos de evidência, os métodos e a precedência da matriz. Sem evidência suficiente, o agente deve propor aprofundamento identificado como tal.
- Plano `DRAFT` e tarefas `BACKLOG` aparecem como **Pendente de aprovação**, sem datas de início ou vencimento. Não há check-in antes da aprovação.
- A aprovação é explícita. Torna o plano ativo, pausa o plano anterior, libera até 3 tarefas e calcula os prazos a partir daquele momento.
- Um ID estável por diagnóstico impede duplicação do plano em tentativas repetidas. O vínculo de origem fica em `ActionPlan.baseline.diagnosticSessionId`; o resultado estruturado fica em `targetOutcome`.
- Excluir um diagnóstico também exclui seus planos e tarefas, após a confirmação já existente.

## Verificação

`pnpm check` executa os testes de contrato. `pnpm exec tsx scripts/test-plan-approval.ts` valida a aprovação no banco local dentro de uma transação integralmente revertida, sem alterar planos reais.
