# Design: decompor arquivos grandes para facilitar revisoes por IA

## Contexto

O repositorio ja define em `AGENTS.md` um teto de 300 linhas por arquivo, mas ha
diversos arquivos de codigo muito acima dele. Arquivos extensos concentram
responsabilidades distintas e tornam mais dificil entender, revisar e alterar
o comportamento com seguranca, inclusive por assistentes de IA.

O worktree atual contem alteracoes locais em varias areas. A iniciativa deve
preserva-las integralmente e comecar por um alvo sem alteracoes locais:
`src/renderer/src/pages/ApmPage.tsx`, com aproximadamente 2.000 linhas.

## Objetivos

- Melhorar a legibilidade e o isolamento de responsabilidades sem mudar o
  comportamento visivel do APM.
- Reduzir `ApmPage.tsx` a uma pagina orquestradora leve e manter os arquivos
  extraidos abaixo de 300 linhas.
- Acrescentar uma verificacao informativa para evitar que arquivos grandes
  passem despercebidos em mudancas futuras.
- Migrar o legado em etapas, sem uma auditoria global nem bloqueio de CI nesta
  primeira fase.

## Abordagem escolhida

Adicionar um script Node sem dependencias, exposto por um comando npm e
executado no CI. Ele examina apenas arquivos de codigo novos ou modificados no
worktree/PR, ignorando arquivos inalterados. O limite alvo e 300 linhas:

- Arquivos novos ou alterados que terminem com ate 300 linhas nao geram alerta.
- Arquivos existentes acima de 300 linhas geram alerta para acompanhamento; o
  tamanho da versao-base tambem e informado para evidenciar reducoes ou
  crescimento.
- Nenhuma condicao do script falha o processo local ou o CI. A saida deve
  distinguir arquivos novos acima do alvo e arquivos legados acima do alvo.

O script deve suportar execucao local contra `HEAD` e execucao no CI contra a
base do pull request, sem varrer o repositorio inteiro. A extensao da lista de
arquivos deve cobrir fontes mantidas no repositorio (TypeScript/JavaScript,
incluindo JSX/TSX, e CSS), excluindo dependencias, artefatos e arquivos
gerados.

## Refatoracao inicial do APM

Preservar os contratos existentes, o layout e os fluxos de usuario. Decompor
`ApmPage.tsx` por responsabilidade, com limites finais a confirmar durante a
implementacao a partir dos blocos reais do arquivo:

- Manter `ApmPage` como composicao e coordenacao de alto nivel.
- Extrair estado, polling, eventos em tempo real e selecao/detalhes de traces
  para um hook focado, sem duplicar chamadas ao `apiBridge`.
- Isolar a exploracao/listagem de traces, a inspecao de detalhes e waterfall,
  e a configuracao do receptor em componentes proprios quando os limites de
  responsabilidade e tamanho justificarem.
- Reutilizar `apmUiUtils.ts` e os componentes APM ja existentes; nao duplicar
  calculos ou formatacao.
- Manter cada arquivo de codigo novo/refatorado abaixo de 300 linhas sempre
  que a decomposicao razoavel permitir; registrar qualquer excecao justificada
  antes de amplia-la.

## Comportamento e tratamento de falhas

A refatoracao nao deve alterar polling, assinatura e limpeza de eventos,
protecao contra respostas atrasadas, filtros, navegacao por teclado, estados de
gravacao, tratamento de erro, acessibilidade ou estilos. Os erros continuam
seguindo o tratamento atual, sem introduzir fallbacks silenciosos.

A verificacao de tamanho e informativa e nunca mascara falhas de lint,
typecheck, testes ou build. Deve apresentar caminho, contagem atual e, para
arquivos existentes, contagem na base comparada.

## Validacao

- Testar o script com arquivos novos/alterados abaixo e acima de 300 linhas,
  com arquivo legado reduzido/crescido e com arquivos inalterados fora da
  verificacao.
- Confirmar que alertas nao produzem exit code de falha.
- Executar os testes APM co-localizados, typecheck e build apos a
  decomposicao.
- Revisar `ApmPage` e os arquivos extraidos para confirmar que cada um esta
  abaixo do teto e que os tres entry points/transportes nao foram alterados.

## Fora de escopo

- Refatorar em massa entry points, tipos compartilhados, services ou paginas
  fora do APM.
- Impor um bloqueio de merge baseado em tamanho.
- Executar auditoria completa de todos os arquivos legados nesta fase.
- Alterar a interface, regras de negocio ou versao do produto.

## Entrega em etapas

1. Adicionar a verificacao informativa local e no CI, sem tornar o resultado
   bloqueante.
2. Decompor o APM em componentes e hook, preservando o comportamento e
   respeitando o limite por arquivo.
3. Adicionar ou ajustar testes para logica pura extraida e validar a pagina.
4. Manter a lista de arquivos acima do limite como trabalho futuro, reduzindo-a
   incrementalmente ao tocar cada modulo.
