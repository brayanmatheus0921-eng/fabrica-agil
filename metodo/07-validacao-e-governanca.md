# Validação, limites e governança

## 1. Situação atual

### Fatos

- Existe uma versão 2 implementada com 25 perguntas curtas e cinco pilares.
- A aplicação já possui estrutura para perguntas, gargalos, métodos, versões, planos, tarefas, evidências e check-ins.
- Os documentos dos consultores fornecem uma lógica de avaliação e priorização.

### Inferências

- O núcleo atual é compatível com a adaptação ROTA 30.
- As maiores lacunas estão em impacto, confiança, evidência, abstenção e acompanhamento metodológico.

### Hipóteses não validadas

- o cliente conclui o fluxo em até 9 minutos;
- 25 perguntas curtas são suficientes para selecionar dois candidatos;
- três perguntas adaptativas elevam a confiança;
- cinco gargalos cobrem a maioria dos casos iniciais;
- duas interações semanais geram acompanhamento sem rejeição;
- um ciclo de 30 dias é adequado.

## 2. Alerta principal

O maior risco é apresentar precisão que o método não possui.

Uma média de respostas não prova:

- causa raiz;
- impacto financeiro;
- urgência;
- capacidade real;
- retorno do método.

Por isso, confiança e evidência são obrigatórias.

## 3. Riscos

| Risco | Consequência | Controle |
|---|---|---|
| Autorrelato otimista ou pessimista | prioridade errada | pedir exemplo e evidência |
| Cliente não mede | falsa certeza | categoria “não sei” e plano de medição |
| Pergunta ambígua | nota inconsistente | teste de compreensão |
| Dois gargalos conectados | recomendação simplista | comparação adaptativa |
| Método genérico | ação sem efeito | aplicabilidade e contraindicação |
| Tarefas demais | abandono | máximo de três ativas |
| IA inventar causa | perda de confiança | fatos, inferência e abstenção |

## 4. Plano de validação

### Etapa 1 — Revisão técnica

Participantes recomendados:

- consultor industrial;
- gestor de fábrica;
- responsável pelo produto;
- responsável pela implementação.

Objetivo:

- revisar perguntas;
- revisar sinais e contradições;
- verificar mapeamento de métodos;
- identificar riscos.

### Etapa 2 — Teste de compreensão

Aplicar o formulário sem explicar as perguntas.

Observar:

- termos que geram dúvida;
- exemplos insuficientes;
- tempo por pergunta;
- abandono;
- uso de “não sei”;
- divergência entre interpretação esperada e real.

### Etapa 3 — Piloto acompanhado

Recomendação inicial: 5 a 10 fábricas do mesmo perfil.

Comparar:

- conclusão da IA;
- conclusão independente do consultor;
- evidências observadas;
- método escolhido;
- resultado do primeiro ciclo.

### Etapa 4 — Calibração

Ajustar:

- redação;
- limites de prioridade;
- pesos;
- confiança;
- perguntas adaptativas;
- critérios de abstenção;
- aplicabilidade dos métodos.

## 5. Métricas de validação

Metas abaixo são hipóteses para o piloto:

| Métrica | Meta inicial |
|---|---:|
| Conclusão do diagnóstico | pelo menos 70% |
| Tempo mediano | até 9 minutos |
| Perguntas com dúvida relatada | menos de 10% |
| Concordância IA x consultor no pilar principal | pelo menos 70% |
| Casos corretamente abstidos | acompanhar, sem meta inicial |
| Planos iniciados | pelo menos 60% dos diagnósticos concluídos |
| Primeiro check-in respondido | pelo menos 60% |
| Ciclos com evidência final | pelo menos 50% |

Essas metas não são fatos de mercado. Servem para decidir se a versão está pronta para expansão.

## 6. Opções e trade-offs

### Opção A — Questionário maior

- vantagem: maior cobertura;
- desvantagem: abandono e baixa qualidade;
- custo de oportunidade: demora para entregar valor.

### Opção B — Somente 15 perguntas

- vantagem: velocidade;
- desvantagem: menor confiança;
- custo de oportunidade: mais recomendações erradas.

### Opção C — 25 perguntas curtas e aprofundamento adaptativo

- vantagem: equilíbrio entre experiência e rigor;
- desvantagem: motor de decisão mais complexo;
- recomendação: usar na versão 2 e medir conclusão por pilar.

## 7. Versionamento

Formato sugerido:

```text
<SEGMENTO>-<ESCOPO>-<NOME>-V<NÚMERO>
```

Exemplo:

```text
MOVEIS-OPERACIONAL-ROTA-V1
```

Uma nova versão é obrigatória quando houver mudança em:

- pergunta;
- opção;
- pontuação;
- peso;
- limite;
- regra de gargalo;
- cálculo de confiança;
- método;
- passo;
- critério de sucesso.

Correções ortográficas sem alteração de sentido podem usar versão documental de patch.

## 8. Aprovação

Antes da publicação:

- [ ] perguntas revisadas;
- [ ] escala consistente;
- [ ] regras de “não sei” implementadas;
- [ ] impacto separado da severidade;
- [ ] confiança calculada;
- [ ] abstenção testada;
- [ ] cinco métodos revisados;
- [ ] casos de teste aprovados;
- [ ] migração preserva histórico;
- [ ] UX validada em computador e celular;
- [ ] persistência validada no banco;

## 9. Responsabilidades

- **Responsável técnico do método:** aprova conteúdo e regras.
- **Produto:** controla escopo e experiência.
- **Engenharia:** implementa o contrato sem reinterpretar a regra.
- **IA:** aplica a versão publicada e declara limites.
- **Consultor/piloto:** fornece evidência de calibração.

## 10. Registro de decisão

Toda mudança deve registrar:

- data;
- versão anterior;
- versão nova;
- motivo;
- evidência;
- impacto esperado;
- responsável;
- resultado após publicação.
