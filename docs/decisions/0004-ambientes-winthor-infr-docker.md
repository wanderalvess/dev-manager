# 0004 — Ambientes WinThor (INFR-Docker) pelo Hub

- **Data:** 2026-11-04
- **Versões:** 1.62.0 a 1.67.0
- **Contexto:** testes com o ambiente `homolog` do Nathan e com o ambiente `local` do autor

## Problema

Criar e manter ambientes WinThor (Oracle, WTA/Karaf e WSH em Docker no WSL) depende dos scripts do repositório
INFR-Docker (TFS, branch `feature/imagem-por-versao`). Quando a criação falhava, a pessoa mandava prints soltos, o
Verificar mostrava o erro da tentativa anterior e a IA não tinha o que ler. Cada falha virava uma conversa longa.

## Como os scripts se comportam (o Hub depende disso)

- `new_version_env.sh` roda 5 etapas com `set -euo pipefail`: um erro em qualquer etapa para tudo, e o que já foi
  criado (em geral o banco) fica no ar.
- `wta_setup.sh` reaproveita um container `wta-<nome>` existente como está. O volume `wta-<nome>-data` só é
  preenchido a partir da imagem na primeira criação.
- As portas SSH/JMX/JMS do WTA são fixas por versão, então duas versões iguais no mesmo WSL disputam porta.
- `wta.env.<v>` e `.env.<v>` são por versão, não por ambiente.
- Marcadores lidos pelo Hub no log da criação: `[INFO] Sem --wsh-jar` (WSH é opcional) e o banner `Pronto: ambiente`.
- `restore_rman.sh` (commit `883b3a4` no INFR-Docker) espera o `v$instance` OPEN (até 15 min) e depois o pmon sair,
  com ABORT após 5 min.

## Decisões

1. **Features sempre com o repositório.** Atualizar uma feature sem o repositório dela quebra o Karaf. O manifest
   só reescreve a versão de uma feature quando o catálogo (a 801) traz o repositório correspondente; a lista de
   features existentes é conferida contra os `features.xml` (`infrVersionManifest.ts`, `infrFeatureXml.ts`). A
   conferência conta, além dos `repo mvn:` da lista, os `<repository>` que cada XML puxa e os `featuresRepositories`
   do Karaf (`etc/org.apache.karaf.features.cfg`, lidos do `system/`): é deles que vêm `spring*` e as outras features
   do Karaf, e sem isso a lista da 40 do Nathan era bloqueada à toa (1.67.1).
   **A pessoa não edita a lista.** Feature sem repositório não bloqueia: o Hub busca o repositório na 801 (todo
   serviço é liberado lá) e acrescenta o `repo mvn:`; sem ele, volta para a versão que os repositórios da lista têm;
   sem nenhum dos dois, fica na versão atual e a criação segue com aviso (`repairAbsentFeatures`).
2. **Clonar não bloqueia por versão do banco.** Imagem fora do padrão é aceita (`isValidImageRef`), e um banco de
   linha mais alta só gera aviso: a pessoa quer copiar o que já funciona.
3. **Aviso de scripts desatualizados.** Antes de abrir o terminal, o Hub confere se cada script conhece as opções
   que ele passa (`infrScriptSupport.ts`) e diz qual atualizar, em vez de deixar o script falhar com
   `Flag desconhecida`.
4. **Cada criação começa limpa.** O log anterior vira `.prev` e o Verificar relê do zero (`refreshKey`). Criação que
   para com `[ERRO]` depois de criar parte do ambiente é "A criação parou antes de terminar", com o que foi criado e
   o que falta; Karaf com `has timed out waiting` desta subida (via `docker logs --timestamps` contra o `StartedAt`)
   é "O WTA não termina de subir". Ambiente sem WSH conta como no ar.
5. **Relatório para suporte em vez de print.** Um botão junta versão do Hub, branch/commit/alterações do INFR-Docker,
   suporte dos scripts, `.env` mascarados, Docker, disco, memória, containers, log da criação (primeiros erros, fim e
   `.prev`) e uma leitura só de leitura do banco. Senhas, tokens, `usuário:senha@`, `Authorization` e conexões Oracle
   saem mascarados (`infrDiagnostic.ts`). Os 20 mais recentes ficam na pasta `diagnosticos`.
6. **IA depois da falha.** Quando o Verificar acusa falha, a IA é chamada uma vez, lê o relatório compacto e
   mascarado e um catálogo de falhas conhecidas (`infrAiKnownFailures.ts`), e responde com passos e comandos para
   copiar. Comando destrutivo é só texto: o Hub nunca executa.
7. **Nova versão em passos (opção B do canvas de fluxos).** 1 · De onde copiar (cartões), 2 · O que fazer
   (Atualizar / Só clonar), 3 · O ambiente novo. A frase com campos no meio foi descartada por ser difícil de ler.
   "Gerar" virou "Criar" em tudo que a pessoa lê. O "Antes de criar" confere portas fixas, sobras de `wta-`/`wsh-`/
   volume, configuração por versão, imagem que é apelido de outra e jar do WSH.

## Regras de trabalho

- Nunca imprimir credenciais (Nexus `usuário:senha@`, `Authorization: Basic` da Central, `DB_PASSWORD`).
- DDL sugerido é testado antes numa base de teste com backup.
- Containers da pessoa só são parados ou subidos dentro de um teste combinado, e o estado é restaurado depois.
- Falha conhecida mostra "Como resolver" com o comando para copiar, não o erro cru.

## Ainda não validado de ponta a ponta

- Modo Atualizar com o catálogo real da 801 (o login do `wta-local` não subiu nos testes).
- Chamada real da IA depois de uma falha.
- Leitura do banco num Oracle XE (o ambiente do Nathan).
- `docker logs --timestamps` contra um Karaf travado de verdade.
- Propostas do canvas não feitas: progresso das 5 etapas no Acompanhar e indicador de passo.
