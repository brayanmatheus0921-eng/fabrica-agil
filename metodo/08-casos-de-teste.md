# Casos de teste do método

Os casos são fictícios e servem para testar regras. Não representam resultados validados.

## Caso 1 — Gargalo claro de fluxo

### Fatos

- atrasos frequentes;
- pedidos passam vários dias aguardando montagem;
- fila constante antes da montagem;
- cinco pedidos recentes confirmam a espera;
- impacto alto em prazo e cliente.

### Resultado esperado

- pilar: fluxo e prazo;
- confiança: alta;
- gargalo: fluxo e fila;
- método: Fluxo e Fila Controlada;
- primeira ação: acompanhar cinco pedidos e definir limite de fila.

### Condição de falha

O sistema não pode concluir fluxo se a fila existir apenas porque a máquina da montagem ficou quebrada.

## Caso 2 — Empate entre fluxo e materiais

### Fatos

- pedidos atrasam;
- existem filas;
- também ocorrem paradas por falta de ferragem;
- severidades com diferença inferior a 0,5;
- ainda não existe contagem de pedidos bloqueados.

### Resultado esperado

- pedir comparação entre os dois problemas;
- perguntar consequência;
- solicitar pedido recente e item faltante;
- se a falta de material explicar a fila, priorizar materiais;
- se a evidência continuar insuficiente, iniciar medição.

### Condição de falha

O sistema não pode desempatar apenas porque um pilar aparece primeiro na lista.

## Caso 3 — Confiança baixa

### Fatos

- dono acredita que a capacidade é baixa;
- não sabe qual recurso limita;
- não existem filas observadas;
- não há registro de horas ou produção.

### Resultado esperado

- inferência: possível problema de capacidade;
- confiança: baixa;
- nenhuma intervenção definitiva;
- plano inicial: medir produção, disponibilidade e fila por cinco dias.

### Condição de falha

Não recomendar compra de máquina.

## Caso 4 — Qualidade ou padronização

### Fatos

- retrabalho frequente na montagem;
- operadores executam a furação de formas diferentes;
- o mesmo erro aparece em vários pedidos;
- não existe instrução visual.

### Opções

- Redução de Retrabalho;
- Trabalho Padronizado e Gestão à Vista.

### Trade-off

- se o defeito estiver bem delimitado, iniciar por Redução de Retrabalho;
- se vários defeitos forem causados pela variação do método, iniciar por padrão de trabalho;
- registrar o método alternativo.

### Resultado esperado

A recomendação deve explicar por que um método foi escolhido e o outro adiado.

## Caso 5 — Problema não prioritário

### Fatos

- processo possui bom desempenho;
- impacto baixo;
- não existe reclamação, atraso ou custo relevante;
- gestor mencionou o tema apenas porque viu uma prática em outra empresa.

### Resultado esperado

- classificar como não prioritário;
- explicar custo de oportunidade;
- não gerar plano;
- manter no backlog.

## Caso 6 — Hipótese refutada no acompanhamento

### Diagnóstico inicial

- capacidade apontada como prioridade;
- confiança média;
- recurso candidato: CNC.

### Evidência da semana 1

- CNC possui horas ociosas;
- pedidos ficam parados por falta de projeto aprovado.

### Resultado esperado

- refutar gargalo de capacidade;
- reclassificar para materiais e informação;
- trocar para Liberação Completa do Pedido;
- preservar o histórico da hipótese anterior.
