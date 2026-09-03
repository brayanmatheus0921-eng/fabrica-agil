# Contrato do método de diagnóstico

Use este arquivo para enviar o método. Não é necessário escrever código.

## 1. Identificação

- Nome do método:
- Versão:
- Responsável técnico:
- Objetivo:
- Tipos de fábrica aos quais se aplica:
- Tipos de fábrica aos quais não se aplica:

## 2. Saídas esperadas

Liste todas as saídas possíveis.

- Score geral existe? Como é calculado?
- Quais scores por pilar existem?
- Quais gargalos podem ser concluídos?
- Qual nível de urgência pode ser atribuído?
- Como a confiança é calculada?

## 3. Pilares

Repita o bloco para cada pilar.

### Pilar: nome

- Objetivo do pilar:
- Peso no resultado:
- Evidência mínima:
- Condições que exigem aprofundamento:

## 4. Perguntas

| Código | Pilar | Pergunta | Tipo de resposta | Opções ou faixa | Obrigatória | Peso | Regra de pontuação |
|---|---|---|---|---|---:|---:|---|
| EX-001 | Exemplo | Pergunta de exemplo | Escala 1–5 | 1, 2, 3, 4, 5 | Sim | 1 | A definir |

Tipos aceitos no setup: texto, número, sim/não, escolha única, múltipla escolha e escala.

## 5. Regras de gargalo

Para cada gargalo possível, informe:

### Gargalo: nome

- Definição:
- Sintomas que aumentam a probabilidade:
- Evidências obrigatórias:
- Evidências que contradizem a hipótese:
- Fórmula ou regra:
- Impacto:
- Urgência:
- Confiança mínima para concluir:
- Perguntas adicionais quando a confiança for baixa:

## 6. Regras de abstenção

A IA deve declarar que não sabe quando:

- faltarem quais respostas?
- houver quais contradições?
- a confiança ficar abaixo de qual valor?
- o caso estiver fora de quais limites?
- houver risco de recomendar uma ação inadequada?

## 7. Mapeamento entre gargalo e método

Repita para cada combinação relevante.

### Gargalo → Método

- Gargalo:
- Método recomendado:
- Condições de aplicabilidade:
- Contraindicações:
- Alternativas:
- Trade-offs:
- Inputs necessários:
- Prazo típico:
- Dificuldade:
- Output esperado:
- Indicadores de sucesso:

## 8. Passos do método

| Ordem | Ação | Responsável sugerido | Prazo | Output esperado | Indicador | Evidência exigida |
|---:|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |

## 9. Aulas relacionadas

| Método ou passo | Aula | Objetivo | Duração | Tarefa prática | Obrigatória |
|---|---|---|---:|---|---:|
|  |  |  |  |  |  |

## 10. Exemplos completos

Forneça pelo menos:

1. um caso claro em que o sistema conclui um gargalo;
2. um caso ambíguo em que faz perguntas adicionais;
3. um caso fora do escopo em que se abstém;
4. um caso em que dois métodos são possíveis e os trade-offs decidem.

## 11. Separação obrigatória das respostas

Toda saída do motor deverá usar:

- **Fato:** resposta ou evidência observada.
- **Inferência:** conclusão derivada do método, com confiança.
- **Recomendação:** método ou ação sugerida, com justificativa e trade-offs.
