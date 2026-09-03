# Regras de diagnóstico e priorização

## 1. Unidade de análise

Cada pilar possui cinco perguntas. As três respostas visíveis de severidade recebem notas internas 1, 3 e 5.

“Não sei/não medimos” é armazenado separadamente e não recebe nota numérica.

## 2. Severidade por pilar

```text
Severidade do pilar = soma das notas válidas ÷ quantidade de notas válidas
```

Condição mínima:

- quatro ou cinco respostas válidas: cálculo normal;
- três respostas válidas: cálculo provisório e confiança reduzida;
- duas ou menos respostas válidas: não calcular conclusão para o pilar.

A severidade indica intensidade do problema, não maturidade geral da empresa.

## 3. Seleção dos candidatos

Ordenar os pilares por severidade.

Selecionar os dois primeiros quando:

- ambos tiverem pelo menos três respostas válidas;
- houver coerência mínima entre respostas e contexto.

Se somente um pilar for calculável, o sistema não deve tratá-lo automaticamente como prioridade. Deve pedir evidência.

## 4. Impacto

O impacto é informado somente para o candidato escolhido na comparação adaptativa:

- **1 — Baixo:** incômodo local sem efeito relevante no resultado;
- **2 — Médio:** provoca perda recorrente, mas administrável;
- **3 — Alto:** compromete cliente, prazo, capacidade, custo relevante ou continuidade.

Impacto não deve ser inferido apenas da nota de severidade.

## 5. Índice de prioridade

```text
Prioridade = Severidade × Impacto
```

Faixa possível: 1 a 15.

Interpretação inicial:

| Faixa | Interpretação |
|---:|---|
| 12 a 15 | candidato a ação urgente |
| 8 a 11,99 | área de melhoria prioritária |
| 4 a 7,99 | medir ou tratar depois |
| 1 a 3,99 | não priorizar agora |

Os limites são hipóteses da versão 1 e precisam de calibração com casos reais.

## 6. Confiança

### Componentes

- resposta completa;
- exemplo recente e específico;
- número, foto, registro ou documento;
- recorrência informada em período definido;
- coerência entre contexto e respostas;
- ausência de contradição relevante.

### Pontuação proposta

| Evidência | Pontos |
|---|---:|
| Quatro ou cinco respostas válidas no pilar | 0,20 |
| Três respostas válidas no pilar | 0,10 |
| Exemplo recente e específico | 0,25 |
| Número, foto, planilha ou registro | 0,30 |
| Frequência ou período informado | 0,15 |
| Coerência com contexto e demais respostas | 0,10 |
| Contradição relevante | -0,25 |

A nota fica limitada entre 0 e 1.

### Interpretação

- **Alta:** 0,75 a 1,00;
- **Média:** 0,50 a 0,74;
- **Baixa:** abaixo de 0,50.

### Regra de decisão

- confiança alta: pode concluir a hipótese prioritária;
- confiança média: apresentar como hipótese provisória e iniciar medição;
- confiança baixa: abster-se de recomendar intervenção e criar tarefa de coleta de dados.

## 7. Urgência

A urgência é independente da prioridade.

Pode ser:

- **Imediata:** risco, parada relevante em andamento ou compromisso crítico próximo;
- **Curto prazo:** impacto recorrente que precisa de ação no ciclo atual;
- **Programável:** pode entrar em ciclo posterior.

A urgência precisa de um motivo explícito. Não pode ser igualada automaticamente à severidade ou ao impacto.

## 8. Regras da matriz

### Área de ação urgente

- severidade igual ou superior a 4;
- impacto alto;
- confiança média ou alta.

### Área de melhorias

- severidade entre 3 e 3,99;
- impacto médio ou alto;
- ou prioridade de 8 a 11,99.

### Área de eficácia

- severidade até 2;
- impacto alto;
- prática controlada e evidência consistente.

Recomendação: proteger e padronizar.

### Área de indiferença

- severidade baixa;
- impacto baixo;
- ausência de evidência de dano relevante.

Recomendação: não priorizar.

### Potencial área de excesso

Só pode ser usada quando:

- desempenho é bom;
- importância é baixa;
- existe evidência de esforço, controle ou custo desproporcional.

Sem medir esforço, o sistema não pode afirmar que existe excesso.

### Área de medição

Adaptação do Fábrica Ágil:

- severidade aparente alta;
- impacto potencial alto;
- confiança baixa.

Recomendação: medir antes de intervir.

## 9. Empate

Existe empate quando:

- a diferença de severidade entre os dois primeiros pilares for menor que 0,5; ou
- a diferença de prioridade for inferior a 2 pontos; ou
- as evidências se contradisserem.

Nesses casos, usar `ADP-001`, `ADP-002` e `ADP-003`.

Se o empate permanecer, não escolher arbitrariamente. Criar uma medição curta comparando os dois problemas.

## 10. Regras de abstenção

A IA deve declarar que não sabe quando:

- houver menos de três respostas válidas no pilar candidato;
- não houver exemplo ou evidência mínima;
- a confiança ficar abaixo de 0,50;
- as respostas forem contraditórias e não houver esclarecimento;
- o problema estiver fora do escopo;
- nenhum método publicado for aplicável;
- a recomendação depender de cálculo técnico não disponível;
- a ação puder comprometer segurança, qualidade legal ou equipamento.

## 11. Contradições relevantes

Exemplos:

- afirmar que não existem atrasos e depois relatar vários pedidos atrasados;
- dizer que não há retrabalho e informar correções frequentes;
- declarar capacidade conhecida sem possuir qualquer medida;
- indicar prioridade estável e relatar mudanças diárias por urgência;
- apontar falta de material e, ao mesmo tempo, ausência total de pedidos bloqueados.

Contradição não significa que o cliente está mentindo. Pode indicar diferença de interpretação, período ou produto.

## 12. Contrato da saída

### Fato

- respostas utilizadas;
- período;
- exemplos;
- números;
- itens não medidos;
- contradições.

### Inferência

- pilar prioritário;
- severidade;
- impacto;
- urgência;
- confiança;
- hipótese de gargalo;
- alternativas consideradas.

### Recomendação

- método;
- justificativa;
- contraindicações;
- trade-offs;
- indicador;
- baseline necessária;
- três primeiras tarefas;
- data do check-in.

## 13. Score geral

Não usar uma nota única da fábrica na versão 1.

Motivo:

- os pilares representam problemas diferentes;
- uma média pode esconder um gargalo crítico;
- o produto precisa orientar ação, não classificar empresas.

Uma visão geral pode exibir os cinco pilares, desde que não seja apresentada como índice absoluto de produtividade.
