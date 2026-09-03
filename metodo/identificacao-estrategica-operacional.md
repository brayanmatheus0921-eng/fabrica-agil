# Identificação Estratégica Operacional — versão 2

## Escopo

Diagnóstico de manufatura e chão de fábrica baseado nos anexos W.05, W.06 e W.07. Cobre PM3 — Processo de Manufatura e PM4 — Qualidade e Indicadores.

## Fluxo determinístico

1. A empresa responde 46 questões com `Sim`, `Parcial` ou `Não` e pode registrar evidências.
2. Ao final de cada um dos 7 temas, informa apenas o efeito observado do problema.
3. A plataforma calcula Status e Desempenho.
4. O efeito observado é convertido em Importância.
5. Importância e Desempenho entram na Matriz de Identificação Estratégica.
6. A matriz devolve o quadrante; somente depois a plataforma ordena os temas.
7. A ficha calculada é enviada à IA, que escolhe de 3 a 5 prioridades e gera o plano.

## Cálculos

### Nota de desempenho

- Sim = 100
- Parcial = 50
- Não = 0
- Nota do tema = média simples das respostas
- Muito bom = 80 a 100
- Bom = 50 a 79,9
- Ruim = abaixo de 50

### Status

`Existe` quando pelo menos 60% dos controles são Sim ou Parcial e existe ao menos um Sim. Nos demais casos, `Não existe`.

### Importância

- Sem impacto relevante = Pouco importante
- Perda de tempo ou retrabalho localizado = Importante
- Impacto em custo, produtividade, prazo ou capacidade = Muito importante
- Interrupção do fluxo, atraso de entrega ou impacto no cliente = Muito importante
- Não sabemos/não medimos = Precisa de evidência e não entra na matriz até ser esclarecido

## Matriz

| Importância | Desempenho | Área |
|---|---|---|
| Muito importante | Ruim | Ação urgente |
| Muito importante | Muito bom | Eficácia |
| Pouco importante | Ruim | Indiferença |
| Pouco importante | Muito bom | Excesso |
| Demais combinações | Combinação restante | Melhorias |

A matriz é sempre aplicada antes da priorização. A ordem dos quadrantes é Ação urgente, Melhorias, Eficácia, Excesso e Indiferença. Dentro do mesmo quadrante, pior nota, ausência do tema e quantidade de respostas Não/Parcial desempatarão a ordem.

## Relatório de maturidade

Antes do plano, o resultado apresenta radar e barras na escala 0–100, média operacional, nota e nível por tema, explicação do cálculo, status, importância, quadrante e lista completa de desvios. O radar serve para forma geral; as barras e cartões mostram os valores exatos.

## Papel da IA

A IA não recalcula a ficha. Ela recebe respostas, evidências, nota, nível, status, importância, matriz, desvios e ordem. Deve separar fatos, inferências e recomendações; consolidar causas relacionadas; selecionar 3 a 5 prioridades; e gerar o plano em 0–30, 31–90 e acima de 90 dias.

## Versionamento

Código: `MOVEIS-OPERACIONAL-IDENTIFICACAO-ESTRATEGICA-V2`, versão 2. Sessões anteriores permanecem vinculadas à versão usada quando foram respondidas.
