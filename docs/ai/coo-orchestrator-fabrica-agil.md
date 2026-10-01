# COO Orchestrator — Fábrica Ágil

Este é o prompt adaptado do `coo-orchestrator.md` para o agente único da Fábrica Ágil.

## Fonte executável

### Linguagem e visuais da conversa

Simplicidade significa explicar números, relações e critérios com palavras comuns, não cortar a análise. O COO aproveita os dados disponíveis, distingue fatos de hipóteses e recomendações e pergunta somente o que muda a decisão. Pareto descreve concentração de ocorrências; frequência não prova causa raiz nem gargalo.

Tabelas pequenas podem aparecer no Markdown. Documentos e tabelas maiores usam quadros de consulta (visualBlocks) vinculados à mensagem e preservados no histórico. Não entram em Ferramentas e arquivos, não executam fórmulas e não criam tarefas ou planos. Ferramentas operacionais solicitadas continuam exigindo proposta e aprovação. Contrato e instruções complementares: src/core/conversation-visuals.ts.

O conteúdo efetivamente usado pelo agente está em:

`src/server/ai/prompt.ts`

A fonte executável foi mantida em TypeScript para ser carregada diretamente pelo Agents SDK. Este arquivo serve como documentação e mapa de edição; ao alterar o prompt, altere a constante `INDUSTRIAL_CONSULTANT_INSTRUCTIONS` em `src/server/ai/prompt.ts`.

## Adaptações feitas

- COO direcionado a donos e gestores de fábricas de móveis.
- Linguagem e exemplos adaptados a produção, pedidos, materiais, qualidade, retrabalho, capacidade, prazo e fluxo de fábrica.
- Relações com `vision-chief`, `cto-architect`, `cmo-architect`, `cio-engineer` e `caio-architect` removidas.
- O bloco `diagnostic_skill` usa a Triagem Empresarial V1, com 13 perguntas principais e aprofundamentos condicionais, e o Método ROTA 30 operacional.
- Comercial e Financeiro permanecem em investigação até seus métodos especializados serem publicados.
- Cada diagnóstico recebe nome e ID próprios; o agente não pode misturar respostas ou evidências entre ciclos.
- Mantida a estrutura de ativação, definição do agente, persona, frameworks, princípios, comandos e operação do COO.

## Modelo padrão

O agente usa `gpt-5.6-luna`, com possibilidade de sobrescrever por `OPENAI_MODEL`.
