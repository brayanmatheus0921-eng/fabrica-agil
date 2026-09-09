# Deploy do Fábrica Ágil no Easypanel

Este documento é o procedimento oficial para criar, atualizar, validar e recuperar o deploy do Fábrica Ágil. Ele registra o caminho que funcionou e os erros encontrados no primeiro deploy.

## Resultado esperado

O aplicativo e o PostgreSQL ficam no mesmo projeto do Easypanel e se comunicam pela rede privada:

```text
Projeto Easypanel
├── web       Aplicação Next.js
└── postgres  Banco PostgreSQL persistente
```

O nome do projeto pode variar. O requisito é manter os dois serviços dentro do mesmo projeto.

## Limite de uso desta versão

Esta versão ainda não possui login e usa uma única empresa fixa. Pode ser usada em teste controlado, preferencialmente com autenticação básica no Easypanel. Não deve receber clientes diferentes ou dados sensíveis até existir autenticação e separação por empresa.

## 1. Criar o PostgreSQL

No projeto escolhido no Easypanel:

1. Selecione **Novo serviço** e depois **Postgres**.
2. Use `postgres` como nome do serviço.
3. Use `fabrica_agil` como nome do banco.
4. Deixe usuário, senha e imagem vazios para o Easypanel usar o usuário padrão, gerar uma senha e escolher a imagem oficial.
5. Aguarde o serviço ficar em execução.
6. Não ative **Expose**. A porta do banco não deve ficar pública.
7. Em **Credentials**, copie a **Internal Connection URL**.

A URL interna tem este formato, mas o valor real nunca deve ser documentado:

```text
postgresql://USUARIO:SENHA@HOST_INTERNO:5432/fabrica_agil?sslmode=disable
```

Use preferencialmente a senha gerada pelo Easypanel. Se uma senha contiver caracteres como `@`, `:`, `/`, `#` ou `%`, eles precisam estar codificados na URL. Copiar a URL pronta do Easypanel evita esse erro.

## 2. Criar o serviço da aplicação

Dentro do mesmo projeto:

1. Crie um serviço do tipo **App** com o nome `web`.
2. Em **Fonte**, selecione **GitHub**.
3. Configure:

```text
Proprietário: brayanmatheus0921-eng
Repositório: fabrica-agil
Ramo: main
Caminho de build: /
```

O repositório público não exige token do GitHub.

## 3. Escolher a construção correta

Na seção **Construção**, selecione **Dockerfile**.

```text
Caminho do Dockerfile: Dockerfile
```

Mantenha GitHub como fonte. Não selecione a aba superior de Dockerfile inline. O arquivo usado é o `Dockerfile` versionado na raiz do repositório.

Não use os comandos antigos do Nixpacks ou Railpack. O Dockerfile já executa instalação, geração do Prisma, build, migrações, carga inicial e inicialização.

## 4. Configurar o ambiente

Em `web` → **Ambiente**, configure:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=URL_INTERNA_DO_POSTGRES
OPENAI_MODEL=gpt-5.6-luna
OPENAI_API_KEY=CHAVE_DO_PROJETO
```

Regras:

- Não use a URL externa do PostgreSQL.
- Não use `127.0.0.1:5433`; esse endereço pertence apenas ao desenvolvimento local.
- Não coloque aspas ao redor dos valores no editor do Easypanel.
- Não versione `.env`, `.env.local`, senhas ou chaves.
- A variável `NIXPACKS_NODE_VERSION` não é necessária no deploy com Dockerfile.
- O arquivo `.env` físico é opcional; as variáveis fornecidas pelo Easypanel são suficientes.

## 5. Implantar

1. Salve fonte, construção e ambiente.
2. Abra **Visão Geral**.
3. Clique em **Implantar**.
4. Abra a implantação e acompanhe o log.

Durante a construção, o fluxo esperado é:

```text
Instalar Node.js 22 e pnpm
→ instalar dependências
→ gerar o cliente Prisma
→ executar next build
→ criar a imagem Docker
```

Quando o contêiner inicia, o fluxo esperado é:

```text
prisma migrate deploy
→ db-seed
→ next start
```

O seed usa atualizações idempotentes para cadastrar a empresa inicial, perguntas, métodos e versões. Ele não deve apagar respostas, diagnósticos, planos ou tarefas existentes.

## 6. Configurar o domínio

Em `web` → **Domínios**, adicione o domínio automático do Easypanel ou um domínio próprio:

```text
Protocolo interno: HTTP
Porta de destino: 3000
Caminho: /
Domínio principal: sim
HTTPS automático: sim
```

Um 404 do proxy após um build bem-sucedido normalmente significa domínio ausente, domínio apontando para o serviço errado, porta diferente de `3000` ou contêiner ainda não iniciado.

## 7. Validar o deploy

Primeiro consulte os endpoints:

```text
GET /api/health
GET /api/health/database
GET /api/health/ai
```

Resultados esperados:

- `/api/health`: aplicação em execução.
- `/api/health/database`: banco acessível, sem expor a URL.
- `/api/health/ai`: configuração da OpenAI presente, sem expor a chave.

Depois faça um teste de persistência:

1. Cadastre ou altere uma informação da empresa.
2. Atualize a página e confirme que o valor permaneceu.
3. Reinicie somente o serviço `web`.
4. Confirme novamente que o valor permaneceu.

Se o dado sobreviver ao reinício do aplicativo, ele está no PostgreSQL persistente, não no contêiner do site.

## 8. Atualizar o sistema no futuro

Para uma atualização sem alteração de banco:

1. Valide localmente com `pnpm verify`.
2. Faça commit e push para `main`.
3. No Easypanel, abra `web` e clique em **Implantar**.
4. Confirme no histórico se o SHA/commit é o esperado.
5. Valide os três endpoints de saúde e o fluxo alterado.

Para uma atualização que altera o banco:

1. Crie e teste a migração no banco local com `pnpm db:migrate --name nome_da_migracao`.
2. Revise o SQL criado em `prisma/migrations/`.
3. Faça backup do banco de produção se a migração remover ou transformar dados.
4. Versione a migração junto com o código.
5. Implante normalmente. O contêiner executa `prisma migrate deploy` antes de iniciar.

Nunca execute `prisma migrate dev`, `prisma migrate reset` ou comandos de limpeza no banco de produção.

## 9. Backup e recuperação

No serviço `postgres`:

1. Configure um provedor externo em **Backups**.
2. Programe um backup diário.
3. Mantenha pelo menos 14 cópias.
4. Execute um backup manual.
5. Teste uma restauração com dados não críticos antes de depender da rotina.

Deploy do aplicativo não apaga o banco. Destruir o serviço PostgreSQL, perder o disco da VPS ou executar uma migração destrutiva pode apagar dados. O backup externo é a proteção contra esses eventos.

## 10. Segurança obrigatória

- Mantenha o PostgreSQL privado e sem **Expose**.
- Ative autenticação básica no domínio enquanto o produto não tiver login.
- Trate `DATABASE_URL`, `OPENAI_API_KEY` e o gatilho de implantação como senhas.
- Não envie logs completos sem remover credenciais.
- Se uma credencial aparecer em chat, print ou log compartilhado, revogue-a e gere outra.
- Depois de expor o gatilho de implantação, use **Atualizar Token de Implantação**.
- Não use dados reais de vários clientes nesta versão de empresa única.

## 11. Erros encontrados no primeiro deploy

### Railpack: Mise não encontrado

```text
Failed to ensure mise is installed
no such file or directory
```

**Causa:** falha da instalação interna do Railpack no servidor.

**Decisão:** abandonar Railpack e usar o Dockerfile versionado.

### pnpm: packages field missing or empty

```text
ERROR packages field missing or empty
```

**Causa:** o pnpm 9 exigiu a lista de pacotes no `pnpm-workspace.yaml`.

**Correção aplicada:**

```yaml
packages:
  - "."
```

### Prisma recusou o Node do Nixpacks

```text
Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+
```

**Causa:** o Nixpacks forneceu uma versão antiga dentro da família Node.js 22.

**Decisão:** usar a imagem oficial `node:22-bookworm-slim` no Dockerfile.

### Cliente Prisma não encontrado no build

```text
Module not found: Can't resolve '@/generated/prisma/client'
```

**Causa:** o cliente Prisma foi gerado em uma etapa intermediária do Docker e não estava presente na etapa que executava o Next.js.

**Correção aplicada:** executar `pnpm db:generate` na etapa `builder` antes de `pnpm build`.

### Build tentou acessar o PostgreSQL local

```text
Can't reach database server at 127.0.0.1:5433
Error occurred prerendering page "/"
```

**Causa:** a rota inicial consultava a empresa durante a construção da imagem.

**Correção aplicada:** tornar `/` dinâmica para consultar o banco somente durante a execução.

### Build concluído, mas endereço retorna 404

**Causa provável:** domínio ainda não ligado ao serviço `web` e à porta `3000`.

**Verificação:** confirmar primeiro que os logs do contêiner mostram `Ready`; depois revisar domínio, serviço, protocolo HTTP, caminho `/` e porta `3000`.

### Serviço fica em “Waiting for service to start”

**Procedimento:** abrir **Implantações** → implantação mais recente → **Visualizar**. O log geral não mostra a causa. Procurar a primeira mensagem de erro e o `exit code`.

## 12. Checklist final

Antes de considerar um deploy concluído:

- [ ] PostgreSQL e `web` estão no mesmo projeto.
- [ ] PostgreSQL não está exposto publicamente.
- [ ] Fonte aponta para `brayanmatheus0921-eng/fabrica-agil`, ramo `main`.
- [ ] Construção usa `Dockerfile` da raiz.
- [ ] As cinco variáveis obrigatórias estão configuradas.
- [ ] O histórico mostra o commit esperado.
- [ ] A construção Docker terminou com sucesso.
- [ ] O contêiner iniciou sem reiniciar em ciclo.
- [ ] Domínio aponta para HTTP na porta `3000`.
- [ ] Saúde da aplicação, banco e COO foi validada.
- [ ] Um dado persistiu após reiniciar `web`.
- [ ] Backup do PostgreSQL está configurado e testado.
- [ ] Credenciais expostas foram substituídas.
- [ ] Acesso público está protegido enquanto não existir login.

