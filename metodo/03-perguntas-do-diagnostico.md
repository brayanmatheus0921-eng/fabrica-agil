# Perguntas do diagnóstico

## 1. Contrato de resposta

Cada pergunta apresenta somente três respostas principais:

- **controlado — nota interna 1:** não limita o resultado;
- **recorrente — nota interna 3:** acontece e exige atenção;
- **crítico — nota interna 5:** limita o resultado com frequência;
- **não sei/não medimos:** não recebe nota e reduz a confiança.

O cliente não precisa interpretar uma escala de 1 a 5. Os textos são específicos para cada pergunta e sempre seguem a mesma direção: respostas mais problemáticas produzem maior severidade interna.

## 2. Contexto da empresa

As respostas abaixo não recebem nota. Elas qualificam o diagnóstico e o acompanhamento da IA.

| Código | Pergunta | Formato |
|---|---|---|
| CTX-001 | Qual é o nome da empresa? | texto curto |
| CTX-002 | Como sua fábrica produz? | sob medida; seriada/modulada; mista |
| CTX-003 | Quantas pessoas trabalham na empresa? | número |
| CTX-004 | Qual é a faixa de faturamento mensal? | três faixas; não sei/prefiro não informar |
| CTX-005 | Quantos pedidos a fábrica entrega por mês? | três faixas; não sei |
| CTX-006 | Como estão as entregas hoje? | três estados; não sei |
| CTX-007 | Com que frequência existe retrabalho? | três estados; não sei |
| CTX-008 | Quanto a operação depende do dono? | três estados |
| CTX-009 | Qual resultado mais importa nos próximos 90 dias? | quatro objetivos |

Faturamento é coletado por faixa, não por valor exato. “Não sei ou prefiro não informar” é uma resposta válida e não bloqueia o uso.

## 3. R — Raio-X operacional

São 25 perguntas: cinco por pilar. Cada uma mede somente um conceito.

### Fluxo e prazo

| Código | Pergunta | Período ou referência |
|---|---|---|
| FLUXO-001 | Quantos pedidos foram entregues depois do prazo prometido? | últimos 30 dias |
| FLUXO-002 | Os pedidos ficam parados esperando a próxima etapa? | fluxo atual |
| FLUXO-003 | Existe fila de peças ou pedidos antes de alguma etapa? | fluxo atual |
| FLUXO-004 | A fábrica inicia mais pedidos do que consegue terminar? | rotina atual |
| FLUXO-005 | A empresa sabe quanto tempo um pedido leva do início à entrega? | medição atual |

### Capacidade e gargalo

| Código | Pergunta | Período ou referência |
|---|---|---|
| CAP-001 | Existe uma máquina, setor ou pessoa que limita o ritmo da fábrica? | rotina atual |
| CAP-002 | Falhas de máquina interrompem a produção? | últimos 30 dias |
| CAP-003 | Trocas e preparações de máquina consomem muito tempo? | rotina atual |
| CAP-004 | A equipe precisa fazer hora extra para cumprir os prazos? | últimos 30 dias |
| CAP-005 | A fábrica conhece a capacidade das etapas críticas? | medição atual |

### Qualidade e retrabalho

| Código | Pergunta | Período ou referência |
|---|---|---|
| QUAL-001 | Peças ou pedidos precisam voltar para correção? | últimos 30 dias |
| QUAL-002 | Os erros são descobertos somente no final do processo? | rotina atual |
| QUAL-003 | O mesmo tipo de erro volta a acontecer? | últimos 30 dias |
| QUAL-004 | A causa do erro é registrada e tratada? | rotina atual |
| QUAL-005 | A fábrica mede quantas peças passam sem correção? | medição atual |

### Materiais e informação

| Código | Pergunta | Período ou referência |
|---|---|---|
| MAT-001 | A produção para por falta de material ou componente? | últimos 30 dias |
| MAT-002 | Os pedidos chegam à produção com informações incompletas? | rotina atual |
| MAT-003 | A empresa precisa fazer compras urgentes? | últimos 30 dias |
| MAT-004 | O saldo de estoque costuma ser diferente do estoque real? | rotina atual |
| MAT-005 | Atrasos de fornecedores mudam o plano de produção? | últimos 90 dias |

### Gestão e padronização

| Código | Pergunta | Período ou referência |
|---|---|---|
| GEST-001 | As etapas principais têm uma forma padrão de trabalho? | rotina atual |
| GEST-002 | A operação para quando o dono não está presente? | rotina atual |
| GEST-003 | Os problemas recebem um responsável e um prazo? | últimos 30 dias |
| GEST-004 | As prioridades mudam durante o dia sem um critério claro? | rotina atual |
| GEST-005 | A gestão acompanha indicadores da operação? | rotina atual |

## 4. Perguntas adaptativas

São feitas depois das 25 perguntas e limitadas a três.

### ADP-001 — Comparação

**Pergunta:** Qual destas duas situações mais prejudica a fábrica hoje?

**Opções:** os dois pilares com maior severidade calculável.

### ADP-002 — Impacto

**Pergunta:** Qual é a principal consequência desse problema?

**Opções:** atraso; perda de produção; retrabalho ou sucata; custo adicional; hora extra; reclamação ou perda de cliente; desgaste da equipe; outro.

**Complemento:** impacto baixo; médio; alto.

### ADP-003 — Evidência

A pergunta varia conforme o pilar escolhido:

- **Fluxo:** em qual etapa está a maior espera? Cite um pedido recente e, se souber, o tempo.
- **Capacidade:** qual recurso limita o ritmo? Quantas horas ou ocorrências foram perdidas?
- **Qualidade:** qual erro mais se repete? Quantas ocorrências, peças ou horas de correção houve?
- **Materiais:** qual material ou informação bloqueia pedidos? Quantos pedidos foram afetados?
- **Gestão:** qual processo varia por falta de padrão ou prioridade? Dê um exemplo recente.

## 5. Regras de experiência

- uma pergunta por tela;
- no máximo três respostas principais;
- “não sei” visível e tratado separadamente;
- nenhuma seleção avança automaticamente;
- voltar e avançar sem perder resposta;
- barra contínua de progresso;
- texto curto e um conceito por pergunta;
- contexto salvo antes do diagnóstico;
- possibilidade de sair e continuar depois;
- campos escritos somente quando acrescentam evidência.
