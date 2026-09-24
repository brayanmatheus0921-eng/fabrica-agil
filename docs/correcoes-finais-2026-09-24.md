# Correções finais — 24/09/2026

Escopo: fidelidade e integridade da memória, etapa após aprovação e dependências. Validação em localhost com banco local, IA real e somente a conta Brayan. Sem deploy, push, migrações novas ou novas funcionalidades. Alterações anteriores de interface/exclusão foram preservadas.

## 1. Bugs corrigidos

- Ressalva posterior não é mais ignorada ao classificar uma afirmação como fato.
- Afirmação com número, nome, data, negação ou grau de certeza diferente da evidência não é aceita como fato confirmado.
- A 21ª decisão não invalida nem apaga o Registro: listas são limitadas e a memória final é validada.
- Consolidação inválida preserva o último snapshot válido; leitura legada recupera campos válidos em vez de zerar tudo.
- Após aprovação, Registro e workflow usam a mesma etapa, inclusive na retomada e na leitura de planos antigos.
- Next 16.2.12 atualizado para 16.3.3; seis dependências transitivas receberam versões corrigidas dentro da mesma versão principal.

## 2. Causas raiz e correções

| Problema | Causa raiz | Correção mínima |
| --- | --- | --- |
| Fato incerto/inventado | A validação aceitava a presença literal do excerpt sem verificar o texto completo do fato e a ressalva seguinte. | Evidência extrativa: frase completa e texto compatível; incerteza permanece hipótese. Exceção determinística para confirmação curta e equivalência do rótulo de prioridade. |
| Registro apagado | Confirmação era acrescentada após a validação, ultrapassando 20 decisões; a leitura inválida devolvia memória vazia. | Deduplicar/limitar antes da validação final; preservar snapshot anterior e recuperar conteúdo legado válido. |
| Etapa contraditória | Aprovação atualizava workflow, mas não Registro; retomada fixava REVIEW. | Workflow governa a etapa; aprovação persiste ambos na mesma transação; API, página e retomada leem esse estado. |
| Alertas de dependências | Next e transitivas estavam em versões afetadas. | Atualizações direcionadas, sem atualizar Prisma/ExcelJS para novas versões principais. |

Durante a correção, um teste antigo detectou rejeição excessiva de “Prioridade: aquisição” com fonte “A prioridade agora é aquisição”. Corrigida por normalização restrita desse formato, mantendo o valor e os qualificadores. O teste antigo permaneceu intacto. Paráfrases arbitrárias continuam tratadas de forma conservadora; não se afirma compreensão semântica universal.

## 3. Arquivos alterados nesta rodada

- `src/core/conversation-memory.ts`
- `src/core/conversation-memory.test.ts`
- `src/core/conversation-memory-regression.test.ts` (novo)
- `src/server/plans/approve-plan.ts`
- `src/app/api/assistant/chat/route.ts`
- `src/app/api/assistant/proposals/route.ts`
- `src/app/(product)/plano-de-acao/construir/page.tsx`
- `scripts/qa-brayan-workshop.ts`
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

Os overrides estão alinhados em package.json e no YAML para compatibilidade com pnpm 9 do Docker e pnpm 11 local. Ambos passaram a verificação do lockfile congelado. Os demais arquivos já modificados no checkout pertencem às correções/auditorias anteriores.

## 4. Testes adicionados/alterados

Sete regressões permanentes: ressalva posterior; dados incompatíveis; correção explícita de prioridade; 21ª decisão; fallback inválido; recuperação legada; etapa única após aprovação/retomada. O teste existente de limite passou a exigir consolidação e preservação em vez de exceção. O fluxo integrado agora confere igualdade da etapa no banco, API e retomada.

Reprodução anterior: [falhas antes da correção](../.artifacts/final-regressions-before.log). A regressão intermediária de prioridade está em [log preservado](../.artifacts/final-prior-regressions.log); a repetição final sem alterar o teste antigo passou em [15 testes direcionados](../.artifacts/final-independent-memory.log).

## 5. Resultados finais

**Fatos observados nesta execução:**

| Validação | Resultado e evidência |
| --- | --- |
| Testes completos | **PASSOU — 96/96**, sem skip. [pnpm verify](../.artifacts/final-verify.log). |
| Testes independentes/anteriores | **PASSOU — 8/8** fora da suíte principal. Executados junto dos sete novos: 15/15. [Log](../.artifacts/final-independent-memory.log). |
| Lint / typecheck / build / Prisma validate | **PASSOU** no código final e Next 16.3.3. [Log](../.artifacts/final-verify.log). |
| Audit de produção | **2 alertas: 0 críticos, 1 alto, 1 moderado**; comando retorna exit 1, portanto não é audit zerado. Antes eram 28. [JSON](../.artifacts/final-audit.json). |
| Compatibilidade do lockfile | **PASSOU** com [pnpm 9](../.artifacts/final-lockcheck-9.log) e [pnpm 11](../.artifacts/final-lockcheck-11.log), frozen-lockfile/ignore-scripts em diretório isolado de manifests. Não equivale a build Docker completo. |
| Plano completo com IA real | **PASSOU** em quatro turnos: 4 iniciativas, 5W2H, 4 tarefas com responsáveis/prazos/guias e 1 acompanhamento. Nenhum plano antes da aprovação. [Log](../.artifacts/final-workshop.log). |
| Aprovação/persistência/retomada | **PASSOU**: plano ACTIVE; memória e workflow FOLLOW_UP no banco/API; retomada mantém etapa, sem inventar mensagem; repetição não duplica execução. Mesmo log. |
| Execução por COO | **PASSOU**: registro de tarefa, conclusão, progresso 25%, ferramenta vinculada e rejeição preservada; cinco páginas HTTP 200. Mesmo log. |
| Confirmação curta | **PASSOU** nos testes determinísticos: “sim” imediatamente após acordo inequívoco, paráfrase do modelo e limite de decisões. O fluxo real completo desta rodada não precisou do literal “sim”. |
| Plano x COO | **PASSOU**: histórico separado, tarefa ambígua pede classificação, tarefa avulsa separada, alteração de plano exige aprovação. [Log com IA real](../.artifacts/final-separation.log). |
| Falhas/concorrência | **PASSOU** em uma instância: segunda mensagem 409, cancelamento libera trava, requestId repetido 409, workflow ausente retorna erro preservando mensagem, sem proposta parcial. [Log](../.artifacts/final-controls.log). |
| Segurança HTTP | **PASSOU**: entrada vazia/excessiva 400; workspace errado/conversa inexistente 409; origem externa 403; sem sessão/expirada redireciona login. [Log](../.artifacts/final-http.log). |
| Markdown/mobile/Registro/retorno | **PASSOU** no navegador: headings, listas, estilos, código e tabela; sem script ou URL javascript. Largura sem overflow em 320/390px; mensagem e Registro atualizam ao voltar. [Evidência manual](../.artifacts/final-ui.md). |
| Exclusão/renomeação | **PASSOU**: exclusão pede confirmação nominal; cancelar preserva conversa. Salvar título atual do Plano permanece na rota de Plano. Mesmo registro manual. |

Console do navegador sem erros/avisos capturados. Os dois erros no servidor correspondem aos cenários intencionalmente injetados de cancelamento e workflow ausente. Fixtures e sessões temporárias desta rodada foram removidas; dados antigos de auditoria preservados.

## 6. Alertas de segurança restantes

**Inferência baseada nos caminhos inspecionados — provavelmente não aplicáveis:**

- **deepmerge-ts 7.1.5 / alto:** cadeia Prisma → @prisma/config; usado para mesclar configuração local confiável, sem objetos cíclicos vindos de requisição. O [aviso do mantenedor](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) envolve grafos recursivos. Evidência: `@prisma/config/dist/index.js` linhas 590–613, `prisma.config.ts`; loaders remotos/extends desativados. Correção upstream exige versão principal 8.
- **uuid 8.3.2 / moderado:** cadeia ExcelJS; único uso localizado em `exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js` importa v4 e chama sem buffer. O [aviso do mantenedor](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq) afeta v3/v5/v6 com buffers externos. Correção upstream exige versão principal ≥11.

[Cadeias instaladas](../.artifacts/final-security-paths.log). Não foram executados exploits em produção. **Recomendação:** acompanhar correções compatíveis dos mantenedores; evitar override de versão principal sem validar seus consumidores.

Next/eslint-config-next 16.3.3 foram mantidos alinhados; [release oficial](https://github.com/vercel/next.js/releases/tag/v16.3.3). Transitivas atualizadas: brace-expansion 1.1.18, fast-uri 3.1.6, hono 4.13.5, mysql2 3.23.1, nanoid 3.3.18 e qs 6.16.0. Nenhuma atualização de modernização foi feita.

## 7. NÃO VALIDADOS

- Celular físico e teclado virtual; mobile foi emulado no navegador.
- Conversas acima de 80/100 mensagens, múltiplas instâncias e duas aprovações simultâneas.
- Queda real do banco durante commit ou timeout real do provedor.
- Isolamento entre duas contas reais, pois somente Brayan foi autorizado.
- Exclusão definitiva pela UI, exploração real dos alertas, build Docker completo e ambiente de produção.
- Todas as variações possíveis de linguagem natural; o validador é conservador, com cobertura dos casos reproduzidos.

## 8. Existe bloqueador técnico para publicar?

**NÃO identificado no escopo validado.** Fato: regressões obrigatórias passaram, fluxo completo criou plano/tarefas e retomou com estado consistente, lint/typecheck/build passaram e não restam alertas críticos. Inferência: os dois alertas restantes não atingem os caminhos inspecionados; isso não prova ausência universal de vulnerabilidades.

**Recomendação:** esta rodada está tecnicamente apta à revisão para publicação, respeitando os limites acima. Não houve deploy nem push, conforme solicitado.
