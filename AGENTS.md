# dev-manager — Spec para IA

Cockpit desktop (Electron + React + TypeScript + Tailwind) que automatiza o dia a dia de
desenvolvedores que trabalham com Apache Karaf/OSGi: pipeline de ambiente (parar serviços →
matar processos → abrir IDE → subir Karaf em debug), console Karaf embutido, DB Studio
multi-vendor (Oracle/Postgres/MySQL) com backup/restore agendado, cockpit Docker, deployer
OSGi (snapshots/diff de bundles, árvore de dependências), hub Git/Azure DevOps, catálogo de
rotinas, busca RAG local sobre docs (Confluence/Jira) e chat LLM (BYOK). Tudo isso também é
exposto a assistentes de IA via um servidor MCP embutido.

Leia [README.md](README.md) para a lista completa de features e [CHANGELOG.md](CHANGELOG.md)
para o histórico. Este arquivo cobre **arquitetura e decisões**, não features.

## Arquitetura: três transportes, uma única camada de serviços

A regra mais importante do projeto: **Electron, o servidor Express/WS e o servidor MCP não são
três produtos — são o mesmo core de negócio exposto por três transportes diferentes.**

- [src/main/index.ts](src/main/index.ts) — processo principal Electron, instancia todos os
  services e cria a janela/tray.
- [src/server/index.ts](src/server/index.ts) — Express + WebSocket (`/ws`), pensado para uso
  headless/containerizado (ver [DOCKER.md](DOCKER.md)).
- [src/mcp/index.ts](src/mcp/index.ts) — servidor MCP via stdio (`@modelcontextprotocol/sdk`).

Os três arquivos instanciam as **mesmas classes de `src/main/services/*Service.ts`, na mesma
ordem** (há comentário explícito em `mcp/index.ts` apontando isso). Ao adicionar uma
funcionalidade nova, o padrão é: implementar a lógica em um Service novo/existente, depois
expor esse service nos três entry points — nunca duplicar lógica de negócio dentro de
`registerIpc.ts`, `server/index.ts` ou `mcp/index.ts` diretamente.

Detalhe de transporte: MCP é request/response stateless, mas vários services fazem streaming
via callbacks (`onLog`/`onChunk`/`onProgress`) pensados para WebSocket. `mcp/index.ts` resolve
isso com um helper `collect()` que buffereia os eventos e devolve tudo de uma vez quando a
tool call termina.

### Camadas dentro do Electron

- **main/services/** — toda a lógica de negócio (Config, Karaf, Database, Docker, Deploy,
  GitAzure, Routines, DocsIndex, Windows, Wsl, Network, Backup/BackupScheduler, LogWatcher,
  Llm, AutoUpdate, Notification, etc.), cada uma com `.test.ts` co-localizado.
- **main/ipc/registerIpc.ts** — único ponto de registro de `ipcMain.handle`; apenas repassa
  para os services, sem lógica própria.
- **preload/index.ts** — `contextBridge.exposeInMainWorld` expõe a API tipada (`electronAPI`).
- **renderer/src/services/apiBridge.ts** — wrapper tipado sobre `window.electronAPI`, usado
  pelas páginas/componentes em vez de chamar `electronAPI` direto.
- **shared/types.ts** — fonte única de tipos compartilhados entre main/preload/renderer/
  server/mcp. Qualquer tipo usado em mais de uma camada vive aqui, não duplicado.

## Convenção de teste: extrair lógica pura antes de cobrir com teste

Padrão recorrente (5+ commits recentes) e **preferido** neste projeto: quando um componente
React ou um Service cresce demais, primeiro extrai-se a lógica pura (sem side effects, sem
JSX, sem chamadas a IPC/DB) para um arquivo de funções em `utils/`, e só então se escreve o
teste sobre essas funções puras — não sobre o componente/service inteiro.

Exemplos: `karafBundleUtils.ts` extraído de `KarafBundleManagerModal.tsx`,
`settingsListEditors.ts` de `SettingsPage.tsx`, `dockerContainerUtils.ts` de
`ContainersPage.tsx`, `buildWebhookPayload` de `BackupSchedulerService.ts`.

- Framework: **Vitest** (`npm test` → `vitest run`).
- Testes ficam **co-localizados** com o código (`Foo.ts` + `Foo.test.ts`), nunca em pasta
  `__tests__` separada.
- Fixtures via pequenas factory functions (`makeBundle`, `makeProject`, etc.), não mocks
  pesados.

Ao pedir para "refatorar" ou "adicionar teste" em um arquivo grande, considere primeiro se a
extração para `utils/` é o caminho certo antes de testar a peça monolítica.

## Segurança

O código é deliberadamente cuidadoso com input não confiável, porque expõe execução de
comandos (WSL, Docker, Karaf) e chamadas de rede a partir da UI e do MCP. Utilitários
centrais em [src/main/utils](src/main/utils) (`isValidIdentifier`, `isSafeLocalPath`,
`isSafeKarafCommand`, `isSafeUrl`) devem ser reutilizados — não reescrever validação ad hoc —
em qualquer novo handler de IPC, rota do server ou tool do MCP que aceite caminho, comando ou
URL vindos do usuário. Já houve correções dedicadas de command injection/SSRF/vazamento de
segredo; trate esse tipo de bug como prioridade alta.

## Build e tooling

- `npm run build` = `tsc && vite build` — o typecheck é um gate antes do bundle; não pule.
- `vite-plugin-electron` com dois entry points (main, preload). Módulos nativos
  (`oracledb`, `pg`, `mysql2`, `fastembed`, `onnxruntime-node`, tokenizers, `.node`) ficam em
  `external` no Vite — continuam `require()` em runtime, não vão para o bundle.
- `postinstall: patch-package` aplica `patches/fastembed+2.1.0.patch` — se o patch quebrar
  após um `npm install`, é aqui que se investiga primeiro.
- `electron-builder.json5`: build só para Windows (nsis + portable), com `asarUnpack` para os
  binários nativos do onnxruntime/tokenizers.
- Docker (`Dockerfile`, `docker-compose.yml`, `DOCKER.md`) empacota o `server/index.ts`
  headless, não o app Electron.
- `.claude/launch.json` já define os dev servers (`renderer` porta 5173, `server` porta 3000)
  para o preview do Claude Code.

## Convenções de código e idioma

- Identificadores (variáveis, funções, classes) em **inglês**.
- Comentários de código, mensagens de commit e textos de UI em **português (Brasil)**.
- Commits seguem **Conventional Commits** (`feat(escopo):`, `fix(escopo):`, `test(escopo):`,
  `perf(escopo):`, `chore:`) com corpo descritivo em português.
- Ao escrever comentários, siga a política geral do Claude Code: só comente o "porquê" não
  óbvio, nunca o "o quê".
