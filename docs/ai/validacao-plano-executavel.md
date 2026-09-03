# Plano executável — validação em 31/08/2026

## Entrega

- Plano: `coo-plan-demo-739bb0be-51b7-42df-b7c3-a3df3650e388`.
- Diagnóstico preservado: `cmtgmz3me0000hsupb2k68pxt`.
- Estado final: DRAFT, 3 iniciativas, 3 tarefas BACKLOG, nenhum registro real de execução.
- Mantida a prioridade da lixa confirmada na conversa anterior. Fila e retrabalho são sugestões de apoio, não decisões já aprovadas.
- Geração real pelo modelo configurado, com o prompt COO, skill, matriz e mensagens anteriores. Revisão posterior corrigiu instruções para os botões disponíveis, registro de fila por eventos, distinção entre ocorrências e peças únicas e separação entre coleta de base e melhoria.
- 5W2H, passos com conferência, formulário pronto, prova de conclusão e critério de melhoria separados.

## Testes

- `pnpm test`: 41 aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm lint`: sem erros; os avisos encontrados estavam em arquivos temporários, fora do projeto versionado.
- `pnpm build`: aprovado; rotas de detalhe e registros de tarefas incluídas.
- `scripts/test-task-records.ts`: gravação PostgreSQL, formulário, início/parada/retomada/saída/fim, rejeição de eventos inválidos, bloqueio antes da aprovação, origem inválida, idempotência, desfazer com auditoria, não concluir tarefa automaticamente. Registros e plano temporários removidos no final.
- `scripts/test-example-approval.ts`: aprovação libera as 3 tarefas e check-in, duplicata não repete, revisitar invalida aprovação antiga. Teste dentro de transação revertida: exemplo continua pendente.
- Navegador: 5W2H expandido, navegação para tarefa, produção e formulário em modo de teste, encerramento/desfazer, celular 390px e tablet 768px sem rolagem horizontal observada; desktop conferido visualmente.

## Preservação e limites

Somente o plano anterior e os registros dependentes de suas tarefas/check-ins foram removidos. Diagnóstico e mensagens anteriores preservados. Backup recuperável: `backups/plan-before-replacement-2026-08-31T15-53-53-396Z.dump`.

PRODUCTION_LOG acompanha um posto e um lote por vez; os tempos são decorridos, não horas-pessoa. FORM salva anotações sequenciais, não edita registros antigos. Desfazer corrige somente a última anotação e preserva auditoria. Não há agregador automático de espera entre etapas: o formulário preserva os eventos e o COO recebe as evidências para acompanhamento. Nenhum ganho foi medido ou prometido. O contexto de acompanhamento contém até 100 evidências recentes por tarefa e deve verificar cobertura antes de concluir.

O modo de teste usa memória da página, nunca o banco. Os formulários reais só são liberados para tarefa TODO/IN_PROGRESS de plano ACTIVE. A instalação permanece local e sem autenticação; o servidor desta validação foi iniciado em 127.0.0.1.
