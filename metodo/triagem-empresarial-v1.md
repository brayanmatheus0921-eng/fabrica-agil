# Diagnóstico da Empresa — Triagem Empresarial V1

## Objetivo

Identificar se a prioridade provável da fábrica está na operação, no comercial
ou no financeiro antes de abrir um diagnóstico especializado.

Esta triagem não identifica sozinha a causa-raiz e não prescreve método. Ela
reduz o espaço de investigação e encaminha o usuário para o próximo diagnóstico.

## Experiência

- Uma pergunta por tela.
- 13 perguntas principais: uma de objetivo e quatro por área.
- Três respostas observáveis e a opção `Não sei / não medimos`.
- Uma pergunta adicional por área somente quando capacidade operacional,
  previsibilidade comercial ou lucro mensal indicarem atenção.
- Uma confirmação adaptativa apenas quando as duas áreas líderes ficam próximas.
- Um exemplo recente opcional para aumentar a confiança.
- Resposta salva antes de avançar.

## Áreas

### Operacional

Prazo, pressão da carteira sobre a capacidade, retrabalho, filas, paradas,
mudanças de prioridade, materiais e informações necessárias para produzir.

### Comercial

Quantidade, previsibilidade e regularidade de oportunidades, conversão de
orçamentos e qualidade das vendas entregues à fábrica.

### Financeiro

Margem, lucro mensal, formação de preço, caixa, custos, estoque e capital de
giro.

## Perguntas adaptativas por área

As respostas adicionais não aumentam nem reduzem a severidade da área. Elas
registram uma hipótese que orienta o próximo diagnóstico:

- Operacional: o que mais impede entregar quando a fábrica fica sobrecarregada.
- Comercial: o que mais prejudica a previsibilidade das vendas.
- Financeiro: onde o dinheiro parece ficar preso ou desaparecer.

Essas respostas nunca comprovam a causa. O método especializado ou a
investigação com dados deve confirmar ou refutar a percepção.

## Pontuação

As perguntas de área usam estados internos:

- `1`: situação mais controlada.
- `3`: precisa de atenção.
- `5`: situação crítica.
- `Não sei / não medimos`: não recebe nota e reduz a confiança.

A primeira pergunta de resultado desejado funciona apenas como sinal de
desempate. Ela acrescenta `0,25` ao índice de roteamento da área correspondente,
mas não altera a severidade observada.

Não existe nota geral da empresa.

## Decisão

1. Calcular a média de severidade separadamente por área.
2. Aplicar o pequeno sinal do resultado desejado apenas ao roteamento.
3. Ordenar as três áreas.
4. Se a diferença entre as duas primeiras for maior que `0,50`, encaminhar para
   a primeira.
5. Se a diferença for menor ou igual a `0,50`, pedir ao usuário que confirme
   qual das duas situações mais prejudica a empresa agora.
6. Registrar a segunda área como sinal secundário, nunca como uma segunda
   prioridade ativa.

## Confiança

A confiança considera:

- cobertura das doze perguntas pontuadas;
- quantidade de respostas desconhecidas;
- existência de um exemplo recente;
- presença de período, quantidade ou objeto verificável no exemplo;
- confirmação do usuário quando houve empate.

### Interpretação

- `ALTA`: `>= 0,75`.
- `MÉDIA`: `>= 0,50` e `< 0,75`.
- `BAIXA`: `< 0,50`.

Confiança baixa exige medição ou investigação adicional. Não autoriza uma
prescrição definitiva.

## Encaminhamento

- Operacional: abrir o ROTA 30.
- Comercial: abrir investigação comercial orientada; prescrever somente quando
  houver método comercial publicado.
- Financeiro: abrir investigação financeira orientada; prescrever somente
  quando houver método financeiro publicado.

## Regra de isolamento

Cada ciclo recebe nome e ID próprios. Respostas, evidências e conclusões de um
ciclo não podem ser misturadas com outro diagnóstico.
