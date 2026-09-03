# Gargalos e métodos de melhoria

## Regra geral

Um pilar com nota alta não prova a causa raiz. Ele indica uma hipótese prioritária que deve ser confirmada durante a aplicação do método.

O sistema recomenda um único método principal por ciclo. Alternativas podem ser registradas, mas não viram tarefas simultâneas.

## 1. Gargalo de fluxo e prazo

### Definição

Pedidos acumulam, esperam ou atrasam porque a liberação e a sequência do trabalho não respeitam a capacidade real das etapas.

### Sinais favoráveis

- pedidos entregues fora do prazo;
- tempo de espera maior que o tempo de processamento;
- filas recorrentes;
- muitos pedidos iniciados ao mesmo tempo;
- prioridade alterada frequentemente.

### Evidência mínima

- etapa em que ocorre a espera;
- exemplo de pelo menos um pedido;
- estimativa ou registro do tempo parado.

### Evidência contrária

- fluxo estável;
- baixo trabalho em processo;
- entregas no prazo;
- ausência de espera relevante.

### Método: Fluxo e Fila Controlada

**Objetivo:** reduzir espera e atraso controlando entrada, prioridade e quantidade de trabalho em processo.

**Aplicar quando:** a fila e a sequência forem o principal limitador.

**Não aplicar isoladamente quando:** a fila for causada claramente por quebra de máquina, falta de material ou retrabalho.

**Trade-off:** pode ser necessário iniciar menos pedidos ao mesmo tempo.

**Indicadores:**

- percentual de pedidos no prazo;
- tempo de espera por etapa;
- quantidade de pedidos em processo.

**Passos:**

1. Registrar o percurso e as esperas de cinco pedidos.
2. Identificar a etapa com maior fila ou espera.
3. Definir critério único de prioridade.
4. Definir limite visual de fila antes da etapa crítica.
5. Comparar prazo e fila semanalmente.

**Critério de sucesso:** redução sustentada da espera ou melhora das entregas no prazo.

## 2. Gargalo de capacidade

### Definição

Uma máquina, setor, pessoa ou competência limita o ritmo de todo o sistema.

### Sinais favoráveis

- fila constante antes do recurso;
- outros setores aguardando;
- horas extras frequentes;
- paradas, setup ou manutenção no recurso;
- demanda maior que a capacidade real.

### Evidência mínima

- recurso limitante identificado;
- fila ou perda registrada;
- produção ou horas disponíveis do recurso.

### Evidência contrária

- capacidade ociosa no recurso apontado;
- ausência de fila;
- bloqueios originados por material ou informação.

### Método: Gestão da Restrição

**Objetivo:** confirmar, proteger e explorar o recurso que limita o resultado.

**Aplicar quando:** existe uma restrição observável e recorrente.

**Não aplicar quando:** o problema é apenas sazonal ou não existe demanda suficiente.

**Trade-off:** outras etapas podem operar abaixo de sua capacidade local para proteger o fluxo global.

**Indicadores:**

- produção por hora do recurso;
- horas produtivas;
- tempo de parada;
- fila antes da restrição.

**Passos:**

1. Medir uma semana do recurso candidato.
2. Confirmar se ele realmente limita a saída.
3. Remover interrupções evitáveis.
4. Garantir material, informação e operador antes do início.
5. Programar o restante da fábrica a partir da restrição.

**Critério de sucesso:** aumento de saída do sistema sem crescimento descontrolado de fila.

## 3. Gargalo de qualidade e retrabalho

### Definição

Erros, defeitos e correções consomem capacidade, material e prazo.

### Sinais favoráveis

- peças retornando para etapas anteriores;
- erros descobertos na montagem, acabamento, instalação ou cliente;
- defeito recorrente;
- sucata ou retrabalho sem causa registrada.

### Evidência mínima

- tipo de erro;
- frequência ou quantidade;
- etapa de origem ou descoberta;
- impacto em horas, peças ou pedidos.

### Evidência contrária

- alta aprovação na primeira passagem;
- retrabalho raro;
- defeitos não relacionados ao atraso ou capacidade.

### Método: Redução de Retrabalho

**Objetivo:** reduzir o defeito recorrente de maior impacto.

**Aplicar quando:** existe um tipo de erro repetido que consome capacidade.

**Não aplicar quando:** os casos não são comparáveis ou não existe qualquer registro inicial.

**Trade-off:** primeiro é necessário medir e delimitar o defeito; agir imediatamente sobre uma causa presumida pode piorar o processo.

**Indicadores:**

- taxa de retrabalho;
- ocorrências do defeito;
- horas de correção;
- aprovação na primeira passagem.

**Passos:**

1. Escolher um único tipo de defeito.
2. Registrar ocorrências por uma semana.
3. Identificar onde nasce e onde é detectado.
4. testar uma causa provável com ação piloto;
5. comparar antes e depois.

**Critério de sucesso:** redução do defeito escolhido sem criar nova falha.

## 4. Gargalo de materiais e informação

### Definição

A produção perde ritmo porque o pedido é liberado sem material, projeto, medida ou informação suficiente.

### Sinais favoráveis

- parada por falta de item;
- compra emergencial;
- estoque excessivo e falta simultânea;
- alteração de projeto durante a produção;
- dúvidas frequentes sobre pedido;
- pedido aguardando aprovação.

### Evidência mínima

- item ou informação faltante;
- pedido afetado;
- frequência ou quantidade de bloqueios.

### Evidência contrária

- pedidos liberados completos;
- materiais disponíveis no momento necessário;
- bloqueios causados por outro recurso.

### Método: Liberação Completa do Pedido

**Objetivo:** liberar trabalho somente quando os pré-requisitos críticos estiverem disponíveis.

**Aplicar quando:** falta de material ou informação bloqueia o fluxo.

**Não aplicar isoladamente quando:** a causa é incapacidade estrutural do fornecedor ou erro de engenharia que exige projeto próprio.

**Trade-off:** alguns pedidos podem aguardar antes de entrar na produção; isso reduz início aparente, mas evita bloqueios internos.

**Indicadores:**

- pedidos bloqueados;
- paradas por falta de material;
- compras urgentes;
- alterações após liberação.

**Passos:**

1. Registrar bloqueios recentes.
2. Identificar os pré-requisitos que mais faltam.
3. Criar checklist curto de liberação.
4. definir responsável pela conferência;
5. testar o checklist por duas semanas.

**Critério de sucesso:** menos pedidos parados depois de liberados.

## 5. Gargalo de gestão e padronização

### Definição

A falta de padrão, prioridade e responsabilidade gera variação, urgência e repetição de problemas.

### Sinais favoráveis

- cada pessoa executa de um jeito;
- prioridades mudam durante o dia;
- problemas sem responsável;
- ação sem prazo;
- dependência excessiva do dono;
- resultado muda conforme operador ou turno.

### Evidência mínima

- processo com variação;
- exemplo recente;
- consequência observada;
- ausência de padrão, responsável ou critério.

### Evidência contrária

- padrão claro e utilizado;
- rotina consistente;
- ações concluídas;
- variação causada por equipamento, material ou produto.

### Método: Trabalho Padronizado e Gestão à Vista

**Objetivo:** estabilizar uma operação crítica e criar responsabilidade visível.

**Aplicar quando:** variação de execução ou prioridade for a principal causa provável.

**Não aplicar como burocracia:** não criar documentos longos para processos simples.

**Trade-off:** exige disciplina de atualização e pode encontrar resistência inicial.

**Indicadores:**

- aderência ao padrão;
- variação do resultado;
- ações concluídas no prazo;
- quantidade de urgências.

**Passos:**

1. Escolher um processo crítico.
2. Observar a execução real.
3. Definir sequência e critério de saída simples.
4. publicar padrão visual e testar com a equipe;
5. revisar problemas e ações duas vezes por semana.

**Critério de sucesso:** menor variação e maior conclusão de ações.

## 6. Seleção entre métodos

Quando dois métodos forem possíveis:

1. priorizar o que atua sobre a restrição do sistema;
2. preferir o método com evidência mais forte;
3. considerar risco e reversibilidade;
4. escolher o teste menor que possa confirmar ou refutar a hipótese;
5. declarar o método alternativo e o motivo de não escolhê-lo agora.

## 7. Estrutura obrigatória de cada método futuro

- código e versão;
- definição;
- aplicabilidade;
- contraindicações;
- evidências necessárias;
- evidências contraditórias;
- trade-offs;
- passos;
- responsáveis sugeridos;
- prazo;
- output esperado;
- indicador;
- evidência de execução;
- critérios de sucesso;
- regra de abandono ou troca.
