# Validação — linguagem e visuais do COO

Execução do plano 2026-10-01-coo-linguagem-e-visuais-na-conversa.md.

## Resultado local

- Linguagem: retiradas instruções de brevidade obrigatória para análise; preservadas justificativa, números e distinção fato/hipótese/recomendação.
- Visuais: DOCUMENT/TABLE na mensagem, consulta em Markdown seguro, expandir/recolher/copiar; persistência em metadata, sem migração.
- Retomada: quadros de todas as mensagens carregadas disponíveis ao modelo; orçamento de contexto de 40 mil caracteres, índice preservado e consulta somente leitura dos excedentes na conversa/empresa atual.
- Separação: visuais informativos permitidos sem plano; ferramentas operacionais continuam no fluxo de proposta/aprovação. Entrevista do Plano mantém contrato próprio.

## Evidência

- Testes automatizados: 109 passaram; lint, typecheck e build passaram.
- Teste real na conta Brayan no banco local: Pareto de 138 ocorrências, quadro DOCUMENT, pergunta simples sem visual, retomada, workspace errado e thread inexistente.
- Antes/depois da análise: 0 ferramentas, 3 tarefas, 1 plano, 1 proposta em ambos os momentos. A análise não criou recursos operacionais.
- Pedido explícito posterior de ferramenta: proposta artifact.save PENDING; 0 ferramentas gravadas sem aprovação.
- Conferidos os percentuais do Pareto contra as quantidades; acabamento 25/138 = 18,1%; retomada recuperou 25 e 18,1% da tabela anterior e o conteúdo do documento seguinte.
- Navegador: tabela e documento reaparecem ao abrir a conversa; copiar retorna Copiado; expandir/recolher funcionam. Mobile 390×844: largura do documento 390, sem rolagem horizontal da página, tabela com rolagem interna.
- Segurança: HTML não executado, células tratadas como texto, rejeição de blocos inválidos/IDs duplicados/limites, consultas restritas à empresa e conversa autenticadas.
- Revisão independente: identificou contexto restrito ao último quadro; corrigido e reavaliado sem novos achados.

## Correções e decisões durante execução

- Corrigida repetição idêntica de tabela no texto e no quadro, preservando demais tabelas e blocos de código.
- Limite agregado de 40 mil caracteres por mensagem visual para evitar payload/contexto excessivo. Rejeição informa o problema, sem truncamento silencioso.
- Consulta somente leitura consultar_visual_conversa adicionada para recuperar quadros cujo conteúdo exceda o orçamento de contexto; não lê conversas do Plano nem de outra empresa.
- Um teste de ferramenta presumiu que o contrato público expunha action; ajustado para conferir a ação no registro persistido da proposta. Não era falha da aplicação.
- Ajuste de escala desktop previamente solicitado em globals.css preservado e publicado em commit separado.

## Limites da validação

Os testes cobrem os fluxos alterados; não representam garantia de toda resposta futura de IA nem auditoria completa da plataforma. Sem editor de células/fórmulas, exportação, gráficos ou novas mutações operacionais nesta etapa. Aviso preexistente do pnpm sobre configuração de overrides ignorada não foi alterado neste escopo.

Publicação e saúde de produção: registrar o commit e conferir no Easypanel ao concluir o deploy.
