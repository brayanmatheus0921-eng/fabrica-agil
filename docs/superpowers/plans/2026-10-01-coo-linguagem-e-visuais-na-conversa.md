# COO: linguagem simples e visuais na conversa — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans para executar após aprovação do usuário, tarefa por tarefa. Não delegar automaticamente.

**Goal:** Entregar análises compreensíveis e completas, com tabelas e documentos visuais vinculados à mensagem, sem criar ferramentas operacionais automaticamente.

**Architecture:** Reutilizar AssistantMarkdown para texto e tabelas comuns. Para quadros maiores, aceitar blocos tipados DOCUMENT/TABLE na resposta, validá-los e persistir em ConversationMessage.metadata; renderizar como quadros consultáveis dentro do chat. Não usar o serviço de artifacts para esses blocos.

**Tech Stack:** Next.js, React, TypeScript, Zod, Prisma, react-markdown/remark-gfm; sem dependência nova prevista.

**Spec:** Pedido do usuário nesta conversa em 01/10/2026: simplificar linguagem sem empobrecer análise; mostrar documentos e planilhas visuais na conversa sem salvá-los como ferramentas. Referência: tabela de Pareto fornecida no print.

## Restrições

- Apenas planejamento nesta etapa; implementação, testes da alteração e deploy dependem da aprovação posterior.
- Simples significa palavras comuns, explicação concreta e boa organização; não limite arbitrário de palavras, parágrafos ou itens em análises.
- Expor dados, cálculos e justificativa da conclusão; distinguir fatos, hipóteses e recomendações. Não expor pensamento interno.
- Manter Plano e COO separados e preservar aprovação de mutações operacionais.
- Visual faz parte do histórico da mensagem; não cria Artifact, tarefa, projeto, plano ou proposta de aprovação.
- Não incluir editor de planilhas, fórmulas executáveis, exportação, gráficos ou alteração global de layout nesta etapa.
- Preservar a mudança local preexistente em src/app/globals.css.

## Evidências da leitura

- src/server/ai/prompt.ts orienta respostas curtas e até cinco itens.
- src/server/coo/instructions.ts reforça linguagem curta e encaminha documentos/planilhas para criar_ferramenta_canvas.
- src/components/assistant-markdown.tsx já usa remark-gfm, tabelas e bloqueio de HTML.
- src/app/api/assistant/chat/route.ts retorna reply/memory e persiste metadata da mensagem.
- prisma/schema.prisma já tem ConversationMessage.metadata Json opcional; não há migração prevista.
- Essa leitura confirma regras potencialmente conflitantes, mas não prova qual delas causou a resposta do print. Não foi feita avaliação ao vivo nesta etapa.

## Review Focus

- Dados ambíguos: manter rótulos originais; agrupamentos devem ser explícitos e não virar causas comprovadas (tarefa 1).
- Conteúdo malformado ou hostil: rejeitar blocos inválidos e nunca executar HTML, scripts ou fórmulas (tarefa 2).
- Retomada e troca de conversa: carregar apenas os quadros da mensagem/conversa autorizada (tarefa 3).
- Tabelas grandes no celular: rolagem interna, expansão e fechamento sem perder a posição do chat (tarefa 3).
- Pedido de análise sem plano aprovado: visual informativo permitido, sem liberar mutações bloqueadas ou criar ferramentas (tarefas 1 e 4).

## Tarefa 1 — Ajustar comportamento consultivo

**Arquivos:** src/server/ai/prompt.ts; src/server/coo/instructions.ts; docs/ai/skills/coo-modos-de-trabalho/SKILL.md; documentação correspondente em docs/ai/coo-orchestrator-fabrica-agil.md. Ler as instruções combinadas antes de editar.

**Contrato:** análise aproveita dados disponíveis, explica critérios e limitações, oferece recomendação fundamentada e pergunta somente o que muda a decisão. Pareto e Teoria das Restrições são usados quando pertinentes e explicados com exemplos concretos. Análise não inicia fluxo de plano automaticamente.

- [ ] Preparar avaliação com o exemplo de 138 ocorrências, uma dúvida simples, dados ambíguos e uma análise sem plano aprovado; registrar resposta anterior.
- [ ] Remover conflito entre concisão obrigatória e análise completa, mantendo respostas proporcionais à pergunta.
- [ ] Diferenciar tabela informativa/documento visual de ferramenta reutilizável e esclarecer essa diferença nas instruções da tool existente.
- [ ] Reavaliar: preservar números e justificativas; não inventar custos, causas, metas ou gargalos. Conferir 53/138 = 38,4% e 69/138 = 50,0% com cálculo independente.

## Tarefa 2 — Contrato dos quadros da mensagem

**Criar:** src/core/conversation-visuals.ts e src/core/conversation-visuals.test.ts.

**Interfaces propostas:** ConversationVisual = DOCUMENT { id, title, markdown } | TABLE { id, title, columns, rows, note? }. conversationVisualsSchema valida a lista; readConversationVisuals(metadata) retorna somente blocos válidos. visualBlocks é opcional na resposta; metadata.conversationVisuals usa { version: 1, blocks }.

- [ ] Testar DOCUMENT/TABLE válidos, metadados antigos sem blocos, tipo desconhecido, linha incompatível e limites excedidos.
- [ ] Implementar validação: até 4 blocos, título até 120 caracteres, documento até 20 mil caracteres, tabela até 12 colunas e 200 linhas; células são texto, sem execução de fórmulas. Acima do limite, informar recorte e total, nunca truncar silenciosamente.
- [ ] Executar pnpm exec tsx --test src/core/conversation-visuals.test.ts.

## Tarefa 3 — Renderização e histórico

**Arquivos:** src/app/api/assistant/chat/route.ts; src/components/assistant-chat.tsx; src/components/assistant-markdown.tsx; novo src/components/conversation-visual.tsx e teste. Identificar o carregador de mensagens usado pelo chat e preservar seu controle de acesso ao incluir metadata validada.

**Contrato:** tabela pequena permanece no Markdown da explicação. Documento/tabela maior usa quadro com título, conteúdo e controles de expandir/recolher/copiar; somente leitura. Blocos persistidos são a fonte da retomada; não são regenerados ao recarregar.

- [ ] Testar integração de resposta, persistência e leitura, inclusive mensagem antiga e bloco inválido; bloco inválido não deve apagar uma resposta textual válida nem ser gravado como ferramenta.
- [ ] Adicionar visualBlocks opcional à resposta do COO, ao evento de conclusão e ao estado/hidratação das mensagens. Não mudar o contrato da entrevista do Plano nesta etapa.
- [ ] Renderizar documentos com AssistantMarkdown e tabelas com texto escapado. Preservar alinhamento numérico, títulos e rolagem horizontal interna. Não habilitar HTML arbitrário.
- [ ] Testar abrir/fechar/copiar, recarregar e trocar conversas, temas claro/escuro e celular; manter foco e posição de rolagem.

## Tarefa 4 — Validação de produto e regressões

- [ ] Testar na conta do Brayan: análise de assistências com tabela; documento explicativo maior; pergunta sem necessidade de visual; retomada; conversa diferente.
- [ ] Comparar banco antes/depois: mensagens podem ser criadas; análise visual não cria Artifact, ActionProposal, ActionPlan nem Task. Memória continua distinguindo hipótese de fato.
- [ ] Testar pedido explícito de ferramenta: deve continuar pelo fluxo existente de proposta e confirmação, sem usar o quadro como autorização.
- [ ] Conferir que chat Plano mantém contexto próprio e regras existentes.
- [ ] Executar pnpm test, pnpm lint, pnpm typecheck e pnpm build; corrigir falhas da alteração e registrar bloqueios externos separadamente.
- [ ] Entregar evidência visual e resultados. Deploy somente conforme autorização vigente na etapa de execução.

## Ordem e critério de aceite

1. Linguagem e distinção análise/ferramenta.
2. Contrato validado dos quadros.
3. UI e persistência na conversa.
4. Avaliação das respostas, testes e validação visual.

Aceite: o diretor entende os números e a recomendação; quadros abrem no chat e reaparecem na retomada; nenhum recurso operacional é criado por uma visualização; pedidos explícitos de ferramentas preservam a confirmação.
