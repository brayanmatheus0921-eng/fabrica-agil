# Canvas e acompanhamento por evidências

## Uso pelo gestor

1. Em Tarefas, abra uma tarefa para consultar as instruções e registrar contexto, aplicação, resultados ou dificuldades.
2. Em Ferramentas e arquivos, peça uma planilha ou documento. Na conversa do COO, use o botão Canvas ou peça diretamente no chat.
3. Preencha os campos e clique em Salvar alterações. Baixe planilhas em XLSX/CSV e documentos em DOCX.
4. Para devolver dados preenchidos fora do app, escolha Enviar arquivo preenchido. Aceita CSV, XLSX, DOCX, JPG e PNG, até 5 MB. Leitura de planilhas limitada a 500 linhas e 30 colunas; textos a 60 mil caracteres.
5. Confira a leitura da IA. Corrija ou desconsidere observações e confirme para alimentar o acompanhamento. Pontos incertos continuam identificados como incertos.

## O que atualiza o acompanhamento

- Status da tarefa: progresso de execução, nunca prova de melhoria.
- Registro “O que foi feito”: aplicação relatada.
- Registro “Resultado observado”: resultado relatado pelo gestor, com link à origem.
- Registro “Dificuldade encontrada”: histórico de obstáculos; não assume que todos continuam abertos.
- Leitura de arquivo confirmada: observações estruturadas, fonte e incertezas. Rascunhos e exemplos não entram como resultados.
- Editar um Canvas invalida a leitura anterior; é necessário ler e confirmar novamente.
- Questionários antigos de check-in não precisam ser preenchidos. Avaliações já realizadas continuam acessíveis.

## Arquivos de implementação

- `src/core/workspace-artifacts.ts`: contrato compartilhado e limites do Canvas.
- `src/server/ai/artifact-agent.ts`: instruções de geração e interpretação; modelo configurado no ambiente, com fallback Luna.
- `src/app/api/assistant/chat/route.ts`: ferramenta `criar_ferramenta_canvas` do COO e contexto de progresso automático.
- `src/server/artifact-files.ts`: exportadores e leitura de arquivos. Nenhuma execução de fórmulas, macros ou código enviado pelo usuário.
- `src/components/artifact-workspace.tsx`: editor nativo, downloads e revisão de leitura.
- `src/components/task-activity.tsx`: registros textuais de tarefas.
- `src/core/task-progress.ts`: consolidação determinística dos dados para acompanhamento.

## Persistência e limites

Tabela `WorkspaceArtifact` no PostgreSQL: documento estruturado, revisão, leitura da IA e original binário. Vinculada à empresa, tarefa e/ou conversa. Os originais não ficam na pasta pública. A exportação usa o conteúdo salvo, sem chamada à IA. Edições usam revisão otimista para não sobrescrever outra versão silenciosamente.

Esta é uma primeira versão de editor simples, não um substituto do Excel ou Word: sem fórmulas avançadas, macros, colaboração simultânea ou histórico completo de versões. O original de upload é preservado. Para escala, migrar binários a storage privado com quotas e varredura de arquivos, mantendo os vínculos no banco.

O app ainda utiliza a empresa de desenvolvimento (`DEV_COMPANY_ID`), conforme a versão local existente. **Não publicar este ambiente sem autenticação e autorização por empresa**, limites de uso e backups. Ter o arquivo fora de `/public` não substitui autenticação.

## Verificação

- Testes unitários: `pnpm test`.
- QA de integração: `pnpm exec tsx scripts/qa-canvas.ts setup`, depois `verify`. Usa chamadas reais de IA e fixtures identificadas como QA. Após testes visuais, executar `cleanup`; o script verifica que os planos/tarefas preexistentes não foram alterados antes de remover somente os registros de teste.
