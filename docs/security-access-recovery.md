# Recuperação de acesso

## Fatos sobre a correção

- O código compartilhado foi removido. Os códigos anteriormente publicados são recusados, mesmo se forem reconfigurados.
- O servidor exige `AUTH_SESSION_SECRET` (32 bytes aleatórios, em hexadecimal) e `AUTH_ACCESS_CREDENTIALS` (JSON privado de e-mail para HMAC do código). Não use prefixo `NEXT_PUBLIC_`.
- Sem configuração válida, o login retorna 503 e consultas de sessão retornam acesso não autenticado.
- As sessões usam HMAC em um novo domínio criptográfico. Nenhuma sessão do mecanismo anterior é reconhecida, mesmo com o cookie antigo. Alterar a chave ou o conjunto de credenciais revoga todas as sessões novamente.
- O seed não cria as cinco contas previsíveis. Contas e dados de negócio existentes são preservados.
- A proteção só se aplica ao ambiente ativo depois que a nova versão for implantada em todas as réplicas. Não reverta para uma versão com o login antigo.

## Implantação e recuperação

1. Implante a correção, inclusive sem as novas variáveis se for necessária contenção imediata. Nesse caso, o login ficará temporariamente indisponível.
2. Prepare um arquivo JSON privado com os e-mails das contas **já existentes**, fora do Git. O gerador não cria usuários nem concede vínculos a empresas.
3. Execute no PowerShell: `Get-Content -Raw CAMINHO_DO_JSON_PRIVADO | pnpm exec tsx scripts/generate-access-credentials.ts`. No Linux: `pnpm exec tsx scripts/generate-access-credentials.ts < CAMINHO_DO_JSON_PRIVADO`.
4. O gerador grava dois arquivos em `.artifacts/access-TIMESTAMP/`, ignorado pelo Git: `production.env` e `private-codes.json`. Não imprime segredos. Proteja a pasta com as permissões do seu sistema operacional; os modos POSIX não substituem ACLs no Windows.
5. Copie somente as duas variáveis de `production.env` para o ambiente privado do serviço web no Easypanel. Preserve as outras variáveis. Implante novamente para aplicar as variáveis a todas as réplicas.
6. Entregue a cada parceiro apenas o seu código por um canal privado. Não publique o arquivo de códigos, o JSON de e-mails ou o segredo em commits, issues, PRs, logs ou chat compartilhado.
7. Valide que código antigo, código incorreto e código de outra conta retornam 401; o cookie anterior deve redirecionar para login. A credencial individual correta deve autenticar somente a conta correspondente. Após cinco falhas, o limite existente deve retornar 429.

## Evidências e limites

**Fato:** remover o valor da versão atual não remove commits, forks, clones ou caches antigos. A correção torna o segredo antigo inutilizável no novo servidor, independentemente dessas cópias. Os registros antigos de sessão permanecem no banco para preservar evidências, mas deixam de autenticar.

**Inferência:** a publicação permite tentativas de acesso; ela não prova uso por terceiros. Sessões no banco, sem registros de origem, também não identificam um invasor.

**Recomendação:** preserve os logs do proxy e da aplicação e examine a janela entre a publicação e a implantação da correção, especialmente logins e acessos autenticados inesperados. Registre o SHA implantado e horário da contenção. Não copie logs com tokens para o repositório. Avalie a remoção de conteúdo histórico com o suporte do GitHub se ainda houver dados pessoais ou outros segredos; reescrever o histórico não substitui a revogação e exige coordenar clones e branches.

**Trade-off:** códigos fixos de seis dígitos mantêm o formulário atual e têm baixa entropia. A limitação de tentativas existente é necessária. Para acesso amplo de clientes, adote códigos de uso único com expiração ou um provedor de identidade; isso exige um fluxo de entrega e recuperação adicional.
