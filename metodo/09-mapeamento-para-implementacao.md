# Mapeamento para implementação

## 1. Objetivo

Registrar o que precisará mudar na aplicação depois da aprovação do método. Este arquivo não autoriza ativação automática da versão.

## 2. Estado atual

O ROTA 30 versão 2 possui:

- 25 perguntas;
- cinco pilares;
- três respostas visíveis, pontuadas internamente como 1, 3 e 5;
- cálculo de média por pilar;
- desempate entre os dois maiores pilares;
- associação de um método por pilar;
- persistência das respostas;
- criação de gargalo e recomendação.

## 3. Diferenças obrigatórias

| Tema | Estado provisório | ROTA 30 |
|---|---|---|
| Resposta desconhecida | somente notas de 1 a 5 | “não sei/não medimos” separado |
| Importância/impacto | não calculado separadamente | pergunta adaptativa e escala de 1 a 3 |
| Confiança | valor fixo | cálculo por completude e evidência |
| Urgência | acompanha a nota do pilar | exige motivo temporal explícito |
| Evidência | descrita no contrato, pouco coletada | exemplo ou registro obrigatório |
| Empate | escolha direta entre dois pilares | impacto e evidência antes da escolha |
| Score geral | média de todas as respostas | não usar como nota geral da fábrica |
| Acompanhamento | tarefas e check-ins disponíveis | cadência e decisões definidas pelo método |
| Abstenção | parcial | regras explícitas |

## 4. Alterações de dados necessárias

### Respostas

Permitir:

- valor numérico de 1 a 5;
- estado desconhecido;
- texto de evidência;
- período considerado;
- origem da evidência.

Não usar o número 5 para representar “não sei”.

### Sessão

Registrar:

- versão do método;
- severidade por pilar;
- impacto;
- urgência;
- confiança calculada;
- candidatos considerados;
- contradições;
- respostas adaptativas;
- regra aplicada;
- motivo de abstenção.

### Recomendação

Registrar:

- método e versão;
- justificativa;
- alternativa descartada;
- aplicabilidade;
- contraindicação;
- trade-off;
- indicador;
- baseline;
- evidência esperada.

## 5. Alterações de fluxo

```text
Onboarding
→ 25 perguntas
→ Cálculo provisório
→ Até 3 perguntas adaptativas
→ Concluir, medir ou abster
→ Resultado
→ Plano
→ Check-ins
```

As perguntas adaptativas precisam ser salvas no servidor antes da próxima etapa.

## 6. Regras de interface

- manter introdução separada;
- uma pergunta por tela;
- tela cheia sem rolagem da página;
- progresso;
- exemplos;
- opção “não sei/não medimos”;
- voltar sem perder resposta;
- salvar cada etapa;
- retomar sessão;
- mostrar fatos, inferência e recomendação em blocos separados.

## 7. Publicação

Não editar diagnósticos históricos.

Processo recomendado:

1. manter o método provisório publicado;
2. implementar a nova definição com novo código;
3. carregar perguntas e métodos como nova versão;
4. executar testes;
5. publicar para novas sessões;
6. preservar sessões antigas com a versão anterior;
7. permitir rollback para impedir novas sessões sem apagar histórico.

## 8. Critérios de aceitação

- [ ] 9 respostas de contexto persistem;
- [ ] 25 respostas persistem individualmente;
- [ ] “não sei” não recebe nota 5;
- [ ] severidade ignora desconhecidos;
- [ ] pilares com dados insuficientes não geram conclusão;
- [ ] perguntas adaptativas respeitam o máximo de três;
- [ ] impacto não é cópia da severidade;
- [ ] urgência possui justificativa;
- [ ] confiança é reproduzível a partir das evidências;
- [ ] empate pode terminar em medição ou abstenção;
- [ ] resultado separa fato, inferência e recomendação;
- [ ] somente um método principal é selecionado;
- [ ] plano possui no máximo três tarefas ativas;
- [ ] histórico registra a versão;
- [ ] fluxo é validado no navegador;
- [ ] persistência é confirmada diretamente no banco;
- [ ] testes de casos claros, ambíguos e fora do escopo passam.

## 9. Limites da publicação

- não migrar sessões antigas;
- não recalcular diagnósticos anteriores;
- não preencher respostas em nome do cliente;
- publicar mudanças somente como nova versão.
