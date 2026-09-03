# Padrão de leitura da Fábrica Ágil

Referência: apresentação do plano e do quadro 5W2H aprovada pelo proprietário.

## Hierarquia

- Título da página em peso 700; títulos de seção, rótulos e ações em 600.
- Explicações em peso normal, com entrelinha confortável. Não transformar parágrafos inteiros em destaque.
- Uma ação principal por contexto. Ações secundárias permanecem disponíveis sem competir visualmente.
- Manter o modo claro, as cores e os ícones já utilizados na plataforma.

## Quantidade de informação

- Mostrar primeiro situação, próximo passo e estado atual.
- Usar `ReadingDetails` para evidências completas, orientações complementares e histórico. O título deve explicar o conteúdo que será aberto.
- Usar `ReadingField` em listas de definição para separar rótulo e valor, sem amontoar vários campos em um parágrafo.
- Não cortar respostas, evidências, instruções ou mensagens persistidas para caber no layout.
- Não esconder erros, estados pendentes ou avisos indispensáveis à decisão.
- Formulários mantêm perguntas, opções, campos e validação completos.
- Gráficos e números só aparecem quando representam dados reais; não usar progresso fictício em conteúdo indisponível.

## Verificação desta alteração

- Regras de diagnóstico, dados salvos, aprovação e APIs preservados.
- A orientação do dashboard passou a considerar o plano ativo antes da recomendação antiga, evitando pedir a repetição de uma etapa já concluída.
- Testes automatizados: 41 aprovados; verificação de tipos e lint dos arquivos alterados sem erros.
- Conferência visual: dashboard, tarefas, resultado do diagnóstico, histórico, aulas, acompanhamento, empresa, métodos e painel da conversa.
- Larguras verificadas em telas representativas: 320, 390, 768 e desktop. Corrigido excesso lateral causado pela largura mínima do corpo em 320px com barra de rolagem.
- Não foram enviados formulários, novas mensagens à IA ou alterações de estado das tarefas durante esta revisão.
- A redução de cansaço percebido e o aumento de compreensão são objetivos de design; precisam de validação com usuários, não são resultados medidos por estes testes.

Capturas desta revisão: `.artifacts/platform-readability/`.
