# Plano colaborativo do COO

## Arquivo editável do método

`docs/ai/skills/coo-plano-colaborativo/SKILL.md` é lido pelo servidor a cada conversa vinculada ao diagnóstico. Alterar esse arquivo muda as instruções sem editar o prompt geral do COO. O build inclui o arquivo no pacote do servidor.

## Fluxo

No diagnóstico, clique **Construir plano com a IA**. A conversa mantém o diagnóstico escolhido, não troca para o mais recente. O COO entende, mede, investiga causas, combina prioridades, detalha ações e prepara a revisão. Uma principal e até duas secundárias; não se inventam três problemas para preencher uma lista.

A matriz original fica no diagnóstico. A escolha de execução combinada com o gestor fica no plano, com justificativa e origem da confirmação. Métodos precisam existir no catálogo publicado. Ausências de dados permanecem lacunas ou ações de medição.

## Onde os dados ficam

- PostgreSQL local, `ConversationThread.workflowState`: etapa, resumo, fatos declarados com mensagem de origem, hipóteses, decisão, rascunho, revisão e histórico.
- `ConversationMessage`: mensagens originais e respostas, inclusive respostas interrompidas identificadas nos metadados.
- `ActionPlan`: rascunho DRAFT gerado somente ao chegar em Revisar; `Task`: BACKLOG, sem datas de execução antes da aprovação.
- O painel direito mostra as etapas e permite revisitar as etapas já percorridas antes de aprovar. Reabrir uma etapa invalida a aprovação do rascunho antigo até a nova revisão.
- Aprovar pelo botão muda o ciclo para Acompanhar e libera até três tarefas. O chat não aprova ações por conta própria. Um plano aprovado não é reescrito silenciosamente.

## Chat

POST `/api/assistant/chat` entrega eventos incrementais. A interface bloqueia o envio sincronamente, antes da atualização visual, e usa IDs estáveis para evitar duplicatas. Há bloqueio adicional no banco por conversa. Enter durante uma resposta não envia nem para. O botão Parar cancela a geração; a mensagem do gestor continua salva. Atualizações de etapas só são confirmadas ao concluir a resposta e a transação.

As frases de atividade são estados operacionais definidos pela aplicação, não o raciocínio privado do modelo. Apenas texto público da resposta é transmitido. A interface nunca executa HTML retornado pela IA.

## Verificações

- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `pnpm exec tsx scripts/test-chat-controls.ts`: API real, concorrência, cancelamento, duplicatas, origem e empresa.
- `pnpm exec tsx scripts/test-coo-live.ts`: conversa real com dados fictícios, streaming e rascunho. Consome API e cria registros QA; não executa limpeza automática.
- `pnpm exec tsx scripts/test-workshop-approval.ts`: revisão, aprovação e idempotência em transação revertida.

O sistema segue local e sem autenticação, conforme o escopo de desenvolvimento. Não publicar para clientes antes de implementar autenticação e isolamento por usuário/empresa.
