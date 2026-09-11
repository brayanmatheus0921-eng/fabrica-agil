# Login — revisão visual e funcional

final result: passed (revisão histórica da interface; não valida a autenticação atual)

## Referências e evidências

- Referência de e-mail: `C:/Users/SAMSUNG/AppData/Local/Temp/codex-clipboard-0d22afec-ac02-40e4-b679-c30f5e0e07c3.png` (639 × 597 px; recorte de desktop).
- Referência de código: `C:/Users/SAMSUNG/AppData/Local/Temp/codex-clipboard-3f1c77c0-3094-4536-a0d3-9e841c749064.png` (970 × 603 px).
- Implementação: `http://localhost:3000/login`.
- E-mail desktop: `.artifacts/login-g4/email-desktop.png` (970 × 603 px).
- Código desktop: `.artifacts/login-g4/code-desktop.png` (970 × 603 px).
- E-mail escuro: `.artifacts/login-g4/email-mobile-dark.png` (390 × 844 px).
- Código escuro, revisão inicial: `.artifacts/login-g4/code-mobile-dark.png` (390 × 844 px).
- Código escuro, contraste corrigido: `.artifacts/login-g4/code-small-dark.png` (320 × 568 px).
- Tela final, sem override de viewport: `.artifacts/login-g4/login-final.png` (531 × 600 px; tema claro, e-mail vazio, pronta para inspeção).
- Código com seis dígitos no desktop: `.artifacts/login-g4/code-6-desktop.png` (970 × 603 px).
- Código com seis dígitos no mobile: `.artifacts/login-g4/code-6-mobile.png` (390 × 844 px).

Capturas feitas no navegador integrado. A comparação recebeu as imagens de referência e implementação juntas, no mesmo input de inspeção. No desktop, a referência de código e a implementação usam o mesmo viewport CSS de 970 × 603. Para a referência de e-mail recortada, foram comparadas as regiões do cartão de 448 px, sem inferir posição absoluta a partir do recorte. As capturas têm dimensões de saída 1:1 com o viewport; o navegador integrado suaviza os pixels quando sua área visível é menor que o viewport emulado. Não houve edição das capturas para ocultar diferenças.

## Cinco superfícies de fidelidade

1. **Tipografia:** mantida a família já usada no produto (Aptos/Segoe UI/Arial), com título de 20 px, peso 600, legendas de 13 px e e-mail de 16 px. Hierarquia e largura de leitura próximas à referência; textos menores e mais diretos em português. Não foi inventada uma fonte proprietária do G4.
2. **Espaçamento:** marca fora e acima do cartão; cartão de até 448 px, padding de 32 px, cantos de 16 px e sombra leve. Botão de 48 px, campo de e-mail de 46 px e seis campos de código. No desktop, cada campo tem 54 px; no mobile, eles diminuem conforme a largura disponível. Não há rolagem horizontal.
3. **Cores:** mantidos os tokens da paleta do Fábrica Ágil nos dois temas. O modo escuro recebeu contorno mais visível nos campos. Foco, erro, texto e botão usam cores próprias de cada tema.
4. **Assets:** reutilizado o ícone Factory da biblioteca Lucide, já presente na identidade do produto, na marca e na marca-d'água. Não foi copiado o logotipo do G4 nem criado um desenho aproximado dele. Sem dependências de imagens remotas ou imagens raster esticadas.
5. **Conteúdo:** preservado e-mail → código, agora com seis dígitos, como na referência. Não há promessa de envio de e-mail, criação de conta, login por telefone ou links legais sem implementação. O link auxiliar funcional é “Trocar e-mail”.

## Histórico de revisão

- Revisão de código identificou que editar um campo já preenchido com o cursor no fim poderia deslocar o dígito para a próxima caixa. Corrigido para substituir o campo atual na digitação comum e preservar distribuição na colagem/autofill. Verificação no navegador: código preenchido, tecla End no segundo campo, novo dígito; terceiro e quarto dígitos permaneceram intactos.
- Primeira comparação visual: [P2] contorno dos campos pouco visível no tema escuro. Corrigido com token local de contorno derivado da cor de texto secundário. Pós-correção: captura `code-small-dark.png` confirma campos distinguíveis e controles legíveis.
- Uma captura imediatamente após redimensionar o navegador continha o buffer do viewport anterior (`code-mobile.png`); descartada como evidência. A avaliação responsiva usa as capturas posteriores estabilizadas.
- Nova comparação após a mudança para seis dígitos: [P2] os campos precisavam encolher em telas menores. Ajustados para 42 px em mobile e 34 px abaixo de 360 px; a captura `code-6-mobile.png` confirma seis campos legíveis sem overflow em 390 px.
- Comparação final: sem diferenças P0/P1/P2 pendentes. Marca, paleta, seis dígitos, textos e ausência de funções não existentes são desvios intencionais da referência visual G4.

## Verificações

- E-mail avança para código; foco vai ao primeiro campo.
- Código vazio apresenta erro local sem enviar requisição de autenticação.
- Digitação, avanço de foco, edição de dígito, Backspace e colagem do código completo verificados no navegador.
- Botão Confirmar e campos ficam bloqueados durante o envio.
- Login válido com `[código legado revogado]` abre `/onboarding`. Os cinco e-mails de teste foram validados pela API local com sucesso.
- Temas claro e escuro inspecionados; preferência de tema restaurada para claro ao terminar.
- Viewports CSS 970 × 603, 390 × 844 e 320 × 568; nos dois tamanhos mobile, largura/altura do documento não excederam o viewport na tela de código.
- Sem erros de console capturados na sessão de teste do login.
- ESLint dos arquivos de login e `pnpm typecheck` aprovados.
- Tratamento de falha de rede, proteção contra envio duplo, nomes acessíveis dos campos e redução de animações revisados em código. Falha de rede e autofill por teclado nativo de celular não foram simulados.

## Escopo

Registro histórico da interface do login e da antiga autenticação de teste. O mecanismo compartilhado foi substituído; consulte `docs/security-access-recovery.md`. Rate limit, isolamento das empresas e redirecionamento existente foram preservados. A publicação é validada separadamente após o deploy.
