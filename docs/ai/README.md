# Documentação da IA

## Onde alterar o prompt

O prompt que realmente é enviado ao agente fica em:

`src/server/ai/prompt.ts`

Edite a constante `INDUSTRIAL_CONSULTANT_INSTRUCTIONS` e reinicie o servidor local. O arquivo também contém `buildConsultantPrompt`, que injeta o contexto estruturado da empresa e a mensagem do usuário.

## Onde alterar o modelo

O agente usa `gpt-5.6-luna` como padrão, definido em `src/server/ai/consultant-agent.ts`. Se `OPENAI_MODEL` estiver preenchido, ele sobrescreve o padrão. O exemplo fica em `.env.example`.

## Como o contexto chega à IA

- `src/server/ai/company-context.ts`: monta o snapshot limitado da empresa.
- `src/server/ai/contracts.ts`: valida entrada e saída com Zod.
- `src/server/ai/consultant-agent.ts`: cria e executa o agente no servidor.
- `src/server/ai/prompt.ts`: define instruções, regras de abstenção e formato do contexto.
- `diagnosticHistory`: lista até 10 ciclos nomeados, com ID, versão, data, status e resumo. O agente deve citar o ciclo pelo nome e ID e nunca misturar evidências entre diagnósticos.

## Métodos de diagnóstico

O agente usa uma triagem empresarial publicada e versionada antes dos métodos
especializados:

- `metodo/triagem-empresarial-v1.md`: Triagem Empresarial V1; encaminha para Operacional, Comercial ou Financeiro e registra aprofundamentos condicionais.
- `docs/ai/skills/diagnostic-method.md`: contrato do ROTA 30 operacional.
- `metodo/comercial/README.md`: contrato pendente do método comercial.
- `metodo/financeiro/README.md`: contrato pendente do método financeiro.

As respostas principais, os aprofundamentos condicionais e os resultados ficam
separados por ciclo. O agente não pode tratar as percepções adaptativas como
causa comprovada nem inventar perguntas, pontuação, gargalos, evidências ou
mapeamentos de método.

Enquanto Comercial e Financeiro estiverem com status `PENDING`, o agente pode
criar apenas uma investigação ou plano de medição. O domínio indicado pela
triagem não é uma causa-raiz comprovada.

## Teste local

Depois de alterar o prompt:

```bash
pnpm typecheck
pnpm lint
pnpm ai:smoke
```

O `ai:smoke` usa a chave já configurada no ambiente local, mas nunca imprime a chave.
