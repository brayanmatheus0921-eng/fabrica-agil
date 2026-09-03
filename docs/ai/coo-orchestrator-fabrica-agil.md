# COO Orchestrator — Fábrica Ágil

Este é o prompt adaptado do `coo-orchestrator.md` para o agente único da Fábrica Ágil.

## Fonte executável

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
