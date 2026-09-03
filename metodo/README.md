# Método Fábrica Ágil

> Método operacional ativo: [Identificação Estratégica Operacional V2](./identificacao-estrategica-operacional.md). O ROTA 30 abaixo permanece documentado como histórico e biblioteca de apoio, mas não inicia novas sessões.

## Status

- Nome de trabalho: **Método ROTA 30**
- Identificador: `MOVEIS-OPERACIONAL-ROTA-V1`
- Versão documental: `2.0.0`
- Situação: versão 2 publicada para novas sessões; versões anteriores permanecem históricas
- Foco inicial: pequenas e médias fábricas de produção discreta, começando por fábricas de móveis

## Finalidade

Esta pasta é a fonte de verdade humana do método de diagnóstico, priorização, recomendação e acompanhamento do Fábrica Ágil.

O método transforma informações simples da fábrica em:

1. hipótese de gargalo operacional;
2. prioridade explicada;
3. método de melhoria adequado;
4. plano de 30 dias;
5. acompanhamento com evidências;
6. decisão de continuar, ajustar ou trocar o foco.

O cliente não preencherá todos os documentos desta pasta. A experiência do cliente continua curta:

- 9 perguntas rápidas de contexto;
- 25 perguntas de diagnóstico;
- até 3 perguntas adaptativas;
- tempo esperado de 7 a 9 minutos;
- uma pergunta por tela;
- salvamento a cada resposta.

## Conteúdo

1. [Conceituação e escopo](01-conceituacao-e-escopo.md)
2. [Fluxo do Método ROTA 30](02-fluxo-rota-30.md)
3. [Perguntas do diagnóstico](03-perguntas-do-diagnostico.md)
4. [Regras de diagnóstico e priorização](04-regras-de-diagnostico-e-priorizacao.md)
5. [Gargalos e métodos de melhoria](05-gargalos-e-metodos.md)
6. [Acompanhamento de 30 dias](06-acompanhamento-30-dias.md)
7. [Validação, limites e governança](07-validacao-e-governanca.md)
8. [Casos de teste do método](08-casos-de-teste.md)
9. [Mapeamento para implementação](09-mapeamento-para-implementacao.md)
10. [Template de saída do diagnóstico](templates/saida-do-diagnostico.md)
11. [Template de plano de 30 dias](templates/plano-de-30-dias.md)
12. [Template de check-in](templates/check-in-semanal.md)

## Decisões centrais

- O método diagnostica produtividade operacional, não a empresa inteira.
- Finanças, marketing, exportação, estratégia societária, ERP, ESG e conformidade detalhada ficam fora do núcleo inicial.
- Uma nota alta significa problema mais severo.
- “Não sei/não medimos” é falta de evidência, não desempenho ruim automático.
- Impacto, severidade, urgência e confiança são conceitos diferentes.
- O sistema recomenda um método por ciclo.
- O plano mantém no máximo três tarefas ativas.
- A IA deve se abster quando a evidência não sustentar uma conclusão.
- Toda saída separa fato, inferência e recomendação.

## Relação com a aplicação

O contrato técnico ativo está em `src/core/rota30-diagnostic-method.ts`. A lógica de cálculo está em `src/core/rota30-engine.ts`.

Toda alteração futura deve:

1. receber uma nova versão;
2. ser convertida para o contrato estruturado;
3. ser publicada no banco somente para novas sessões;
4. preservar perguntas e resultados associados a diagnósticos anteriores.

## Fontes de adaptação

- `Anexo W.04 - Ficha de Informações da Empresa.pdf`
- `Anexo W.05 - Questões de Identificação Estratégica da Empresa.pdf`
- `Anexo W.06 - Identificação Estratégica da Empresa.pdf`
- `Anexo W.07 - Matriz de Identificação Estratégica.pdf`

Do método original foram preservados o contexto da empresa, a avaliação por temas, a separação entre importância e desempenho e a matriz de prioridade. A quantidade de perguntas e as áreas fora de produtividade foram reduzidas.
