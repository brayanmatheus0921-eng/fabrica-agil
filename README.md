# Fábrica Ágil

Primeira versão de teste do COO digital para produtividade de fábricas de móveis. O sistema cadastra a empresa, diagnostica oportunidades operacionais, ajuda a definir prioridades, monta o plano de ação, organiza as tarefas e acompanha a execução.

Versão atual: **v0.1.0-beta.1**.

## Estado atual

### Fatos

- Aplicação Next.js com App Router, TypeScript, Tailwind CSS e pnpm.
- Prisma ORM configurado para PostgreSQL por `DATABASE_URL`.
- OpenAI Agents SDK configurado no servidor por `OPENAI_API_KEY`.
- Interface responsiva com modo claro e escuro.
- Dashboard, COO, diagnóstico operacional, plano de ação, tarefas em Kanban, acompanhamento, aulas e memória da empresa.
- Diagnóstico com matriz, notas por área, gráfico de radar, evidências e oportunidades de melhoria.
- COO com conversas, histórico, arquivos e ferramentas reutilizáveis.
- Plano construído com o empresário, três prioridades, 5W2H e aprovação antes da execução.
- Modelo de dados versiona templates de diagnóstico e métodos.
- Contratos Zod validam o método de diagnóstico e as respostas estruturadas do COO.
- PostgreSQL local temporário com migração e dados iniciais de desenvolvimento.
- Empresa fixa sem login para validar o fluxo antes da autenticação.
- Onboarding persistente que gera a primeira memória estruturada da empresa.
- O arquivo de ambiente local não é versionado.

### Inferências

- O método de diagnóstico pode mudar durante a validação com clientes.
- A memória precisa ser estruturada por empresa, origem, validade e confiança; histórico bruto de chat não é suficiente.
- Recomendação e plano precisam manter a versão do método usada para permitir auditoria.

### Recomendação

Usar esta versão em testes controlados, registrar dificuldades e validar se o fluxo diagnóstico → plano → tarefas → acompanhamento é simples para o dono da fábrica.

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma ORM 7
- PostgreSQL

## Como executar

Para abrir o sistema com um duplo clique, use `Abrir-Fabrica-Agil.cmd` na raiz do projeto. Ele inicia o PostgreSQL local, aplica as migrações, executa o seed, inicia o Next.js se necessário e abre o dashboard.

Pré-requisito: Node.js 20.19 ou mais recente.

```bash
pnpm install
pnpm db:local:start
pnpm db:setup
pnpm dev
```

Abra `http://localhost:3000`.

O banco temporário usa `127.0.0.1:5433` e fica em
`dev-postgres-data/`, fora do Git. Para conferir ou interromper:

```bash
pnpm db:local:status
pnpm db:local:stop
```

Para criar novas migrações durante o desenvolvimento:

```bash
pnpm db:migrate --name nome_da_alteracao
```

O comando altera somente o banco indicado em `.env`. Antes de qualquer
migração, confirme que a URL aponta para o ambiente correto.

## Validação

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Endpoints de saúde:

- `GET /api/health` — processo da aplicação.
- `GET /api/health/database` — conectividade PostgreSQL sem expor a URL.
- `GET /api/health/ai` — presença da configuração OpenAI sem expor a chave.

Validação completa:

```bash
pnpm verify
```

Smoke test real da IA, com contexto fictício e consumo mínimo de API:

```bash
pnpm ai:smoke
```

## Estrutura

```text
prisma/
  schema.prisma              Modelo relacional do produto
src/
  app/
    (product)/               Rotas e layout do sistema
    api/health/              Health checks
  components/                Navegação e componentes compartilhados
  core/                      Contratos puros do domínio
  lib/                       Ambiente, Prisma e utilitários
  server/ai/                 Contexto, contrato e agente industrial
scripts/
  ai-smoke.ts                Teste real e isolado da integração OpenAI
  db-seed.ts                 Empresa e usuário fixos de desenvolvimento
  db-local.ps1               Controle do PostgreSQL local temporário
docs/
  architecture.md            Decisões e limites da arquitetura
  diagnostic-method-contract.md
                              Contrato para receber o método
```

## Próximo passo

Executar a primeira rodada de testes com dados controlados, anotar os pontos de fricção e revisar o método antes de abrir o sistema para clientes reais.

## Limites desta etapa

- Não existe autenticação ou autorização; esta versão usa uma única empresa fixa.
- O banco local e os dados demonstrativos não fazem parte do versionamento.
- A chave da OpenAI e outras variáveis locais não fazem parte do versionamento.
- A versão atual não pode ser publicada para clientes reais antes de autenticação.
- O schema não deve ser aplicado a um banco de produção sem revisão.
