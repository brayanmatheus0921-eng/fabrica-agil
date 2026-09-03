# Método de diagnóstico — ROTA 30

O método ativo é `MOVEIS-OPERACIONAL-ROTA-V1`, versão 2. A fonte de verdade editável está na pasta `metodo/`, começando por `metodo/README.md`. O contrato estruturado usado pelo sistema está em `src/core/rota30-diagnostic-method.ts`.

ROTA significa Raio-X, Ordem de prioridade, Tratamento e Acompanhamento. O ciclo tem 30 dias, duas revisões semanais e termina com uma decisão explícita: manter, ajustar, substituir ou encerrar o método.

O diagnóstico possui 25 perguntas curtas, cinco por pilar. Cada tela mostra três estados principais e “não sei”; internamente os três estados equivalem a 1, 3 e 5. O contexto inclui tamanho, faturamento por faixa, volume de pedidos, prazo, retrabalho, dependência do dono e objetivo de 90 dias.

Regras obrigatórias: uma prioridade operacional, um método, um indicador principal e no máximo três tarefas ativas. Respostas “não sei/não medimos” não recebem nota e reduzem a confiança. Faturamento qualifica o contexto, mas não prova gargalo. Não existe nota geral da empresa. Quando a evidência ou confiança é insuficiente, o sistema se abstém de prescrever uma intervenção e orienta a medição.

Os diagnósticos realizados com o código provisório anterior permanecem no banco como histórico e não são recalculados.
