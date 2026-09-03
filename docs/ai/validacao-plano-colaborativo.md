# Validação — COO colaborativo e chat

Data: 30/08/2026 (horário de São Paulo).

## Resultado verificado

- Skill validada pelo validador de skills; Prisma validado e migração aplicada no PostgreSQL local.
- 33 testes automatizados aprovados. Typecheck e build aprovados. Lint sem erros; três avisos preexistentes em arquivo temporário de apresentação, fora desta alteração.
- Conversa real com OpenAI: o ciclo final de QA chegou à revisão em seis mensagens do gestor fictício. Plano com três iniciativas e três tarefas BACKLOG, sem datas de execução ou aprovação automática.
- API testada para bloqueio simultâneo, cancelamento, IDs duplicados, origem externa recusada e conversa fora do escopo recusada.
- Aprovação testada em transação revertida: revisitar invalida o rascunho anterior, aprovar libera acompanhamento e até três tarefas; segunda aprovação não duplica ações.
- Navegador: Enter bloqueia imediatamente, repetição não duplica mensagem; botão Parar interrompe; resposta normal devolve o botão Enviar. Painel à direita abre sem substituir o chat; histórico e etapas aparecem. Revisita testada pelo painel.
- Celular 375×667 e 390×844, tablet 768×1024, notebook/desktop 1366×768 e monitor 1920×1080: sem overflow horizontal ou rolagem da página do chat. Mensagens têm rolagem própria; campo permanece visível. Abertura nas últimas mensagens verificada após hidratação.

## Correções encontradas nos testes

- Origem local bloqueava controles do desenvolvimento e envio da API: corrigidas as verificações para o host local.
- Modelo tentava saltar etapas e repetir confirmações: a ferramenta agora expõe somente etapas permitidas, com a próxima etapa explícita.
- Botão de aprovação não podia continuar habilitado ao revisitar: corrigido na interface e no servidor.

## Exemplo entregue

Diagnóstico: `cmtgmz3me0000hsupb2k68pxt`, **Diagnóstico 01 — Exemplo operacional · novo ciclo**.

Após os testes, foram removidos dez diagnósticos antigos/legados e três planos (incluindo rascunhos de QA), com seus dados dependentes. Empresa, cadastro, biblioteca metodológica e conversas anteriores não pertencentes ao QA foram preservados. Estado verificado: um diagnóstico, zero planos e zero tarefas.

Backup integral anterior à limpeza: `backups/coo-before-reset-2026-08-31T02-45-43-864Z.dump`, formato PostgreSQL pg_dump custom. Não é enviado ao Git. Permite recuperação com pg_restore, mediante escolha explícita para evitar sobrescrever dados novos.

## Limites

Testes aprovados não garantem ausência absoluta de erros nem eliminam a possibilidade de uma resposta inadequada do modelo. O plano deve continuar sendo revisado pelo gestor. Não foi realizado teste de carga multiempresa nem implantação em produção. O app permanece local e sem login por decisão de escopo.
