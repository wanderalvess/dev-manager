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
tool call termina. O conjunto de tools do MCP cresce junto com os services — hoje inclui
também backup/restore de banco (`db_run_backup`, `db_restore_backup`, `db_run_restore_drill`,
`db_list_backups`/`db_list_backup_history`, `backup_test_webhook`, `db_save_backup_config`),
leitura/gestão de log watcher (`logs_read_last_lines`, `logs_check_file`, `logs_clear_file`) e
consulta de APM (`apm_*`).

**Estado em memória não atravessa processos.** O MCP roda num processo separado do app: um
service que guarda estado só em memória não pode simplesmente ser reinstanciado em
`mcp/index.ts` — a instância do MCP nasceria vazia (foi o caso do primeiro corte do APM). Para o
buffer de traces do `ApmService`, o processo dono da porta OTLP (app desktop ou servidor web)
serve uma API de consulta no próprio receptor (`/devmanager/apm/*`: só GET, só loopback, sem
CORS e com token publicado em `.apm-receiver.json` na pasta de dados do usuário) e o MCP a lê
via `ApmReceiverClient`. Siga esse padrão para o próximo service com estado em memória, em vez
de subir no MCP uma segunda instância que disputaria recursos com o app (ex.: a porta 4318).
A exceção é o estado que o próprio assistente cria e lê, sem disputar recurso com o app: a
captura contínua do Statement Tracer (`OracleTracerCaptureService`) tem instância própria no MCP
(`db_*_oracle_capture*`), independente da captura iniciada na tela — os timers usam `unref()`
para uma captura esquecida não manter o processo MCP vivo após o cliente desconectar.

**Modo Web/Docker é single-tenant**: quando `server/index.ts` roda exposto na rede, todo
cliente que acessa a mesma URL compartilha o mesmo `config.json` — mesmas conexões de banco,
credenciais do Karaf, chaves de LLM — sem login nem isolamento por usuário (ver FAQ em
[DOCKER.md](DOCKER.md)). Não assuma multi-tenancy ao projetar features para esse modo; o
caminho recomendado para padronizar configs entre um time é export/import de configuração, não
compartilhar a mesma instância com credenciais distintas.

### Camadas dentro do Electron

- **main/services/** — toda a lógica de negócio (Config, Karaf, Database, Docker, Deploy,
  GitAzure, Routines, DocsIndex, Windows, Wsl, Network, Backup/BackupScheduler, LogWatcher,
  Llm, AutoUpdate, Notification, etc.), cada uma com `.test.ts` co-localizado.
- **main/ipc/registerIpc.ts** — chama um `registerXxxHandlers(ctx)` por assunto, em
  `main/ipc/handlers/*Handlers.ts` (system, environment, karaf, database, containers, wsl...);
  `ctx` (`IpcContext`, em `ipcContext.ts`) traz a janela e os services. Canal novo vai no
  arquivo do seu assunto (o prefixo do canal diz qual é); os handlers só repassam para os
  services, sem lógica própria. Não existe mais um registro único gigante.
- **preload/index.ts** — `contextBridge.exposeInMainWorld` expõe a API tipada (`electronAPI`).
- **renderer/src/services/apiBridge.ts** — no modo Web/Docker instala `window.electronAPI`
  compondo os adaptadores REST/WebSocket de `services/webBridge/*.ts` (um por assunto, cada um
  `satisfies Partial<ElectronAPI>`; o `tsc` falha se faltar algum método do preload). Também
  exporta `api`, um proxy tipado sobre `window.electronAPI`. Método novo no preload exige o
  adaptador correspondente no `webBridge` do mesmo assunto.
- **shared/types.ts** — fonte única de tipos compartilhados entre main/preload/renderer/
  server/mcp. Qualquer tipo usado em mais de uma camada vive aqui, não duplicado.
  - **Atenção à profundidade de imports**: componentes em subpastas de 3º nível do renderer
    (ex.: `src/renderer/src/components/{containers,settings,help,karaf}/{tabs,modals,cards,compose,topology}/`)
    estão a 5 níveis de pasta de `src/shared/types.ts` e **devem** importar via `'../../../../../shared/types'`
    (5 vezes `../`), nunca 4. Se o import falhar, o TypeScript assume `any`, quebrando o operador `keyof`
    (vira `string | number | symbol`), destruindo a inferência em loops e gerando erros em cascata.
  - **Tipagem de refs no React 18**: `useRef<T>(null)` retorna `React.RefObject<T>` (onde `current` já é
    `T | null`). Props que recebem refs não devem ser tipadas como `React.RefObject<T | null>`, pois o JSX
    do React rejeita a atribuição na prop nativa `ref`.
  - **Literais de contratos estritos**: ao construir fallbacks para interfaces com campos obrigatórios
    (ex.: `PathStatusInfo` exige `path: string`), sempre fornecer propriedades válidas (`path: value || ''`).

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

**Segredos em repouso**: senhas de banco, senha do Karaf, tokens de Confluence/Jira, chaves de
API de LLM e `authValue` de webhooks/doc-sync ficam criptografados em `config.json` com
AES-256-GCM ([src/main/utils/secretsCrypto.ts](src/main/utils/secretsCrypto.ts)). A chave é
gerada na primeira execução e persistida em `.secrets.key` (modo `0600`) ao lado do
`config.json` — **não** usa `safeStorage` do Electron, porque `ConfigService` é compartilhado
pelos três runtimes (Electron, server web, MCP) e os dois últimos rodam como Node puro, sem
Electron. Qualquer campo novo de credencial/segredo adicionado a `shared/types.ts` deve ser
incluído em `encryptSecretsForDisk`/`decryptSecretsInPlace`/`sanitizeSecrets`/`preserveExistingSecrets` — do contrário
vaza em texto plano no disco e/ou em `GET /api/settings` e `settings:get`. Isso já aconteceu
uma vez (campos `authValue` ficaram de fora na primeira leva) e foi tratado como bug de
segurança, não como melhoria.

**Camadas de defesa já existentes (reuse, não reescreva):**
- [src/server/httpSecurity.ts](src/server/httpSecurity.ts): API key comparada em tempo constante, bloqueio por excesso de tentativas
  (429), guarda de `Host` local quando não há API key (DNS rebinding) e `wrapAsyncRoutes` + `jsonErrorHandler` (um `throw` em
  handler async vira 500 JSON em vez de pendurar a requisição). Rota nova no server não precisa de `try/catch` só para isso.
- [src/mcp/toolSafety.ts](src/mcp/toolSafety.ts): classifica cada tool MCP em leitura/escrita/destrutiva (annotations e
  `HUB_MCP_MODE=readonly`). **Tool nova que altera algo ou executa comando livre deve entrar em `DESTRUCTIVE_TOOLS`**; nome de
  leitura que tem efeito colateral vai em `WRITE_EXCEPTIONS`. `db_execute_query` barra escrita em conexão `isProduction`.
- `isSafeUrl` recusa metadados de nuvem (169.254.0.0/16 e afins); `isLogFilePath`/`isInsideDir` limitam o que o visualizador de
  logs lê e zera; `safeSend` ([src/main/utils/ipcSend.ts](src/main/utils/ipcSend.ts)) é o jeito de enviar ao renderer — nunca
  `mainWindow.webContents.send` direto.
- Comando customizado de backup: o template é tokenizado **antes** de receber os valores (`buildCustomCommandArgv`); mantenha assim.

**Autenticação do WebSocket**: no modo Web/Docker, o upgrade do `/ws` exige a mesma API key
usada pelas rotas REST, passada via query string (não basta validar o header `Origin`, que um
cliente não-browser simplesmente não envia). `apiBridge.ts` já lê a key do `localStorage` e
anexa na conexão — qualquer novo client WS precisa fazer o mesmo.

**Alerta aceito do `npm audit` — `dompurify` ≤3.4.15 (via `monaco-editor`)**: o Monaco 0.57.0 fixa
`dompurify@3.4.15` e embute uma cópia própria em `esm/vs/base/browser/dompurify/`, que é a que roda;
um `overrides` só trocaria o pacote npm sem uso. Os dois XSS valem para o modo `IN_PLACE`, que o
`domSanitize.js` do Monaco não usa (só `RETURN_DOM_FRAGMENT`), e o app não importa `dompurify`. Não
use `npm audit fix --force` (faz downgrade para o Monaco 0.56.0). Reavaliar ao subir o `monaco-editor`
para uma versão que embuta `dompurify` ≥3.4.16.

## Build e tooling

- `npm run build` = `tsc && vite build` — o typecheck é um gate antes do bundle; não pule.
- `vite-plugin-electron` com dois entry points (main, preload). Módulos nativos
  (`oracledb`, `pg`, `mysql2`, `fastembed`, `onnxruntime-node`, tokenizers, `.node`) ficam em
  `external` no Vite — continuam `require()` em runtime, não vão para o bundle.
- Não há `patch-package` (o `fastembed` 2.1.1 deixou de importar `tar`, então o patch antigo e o gancho
  `postinstall` foram removidos; o piso `^2.1.1` evita voltar à 2.1.0). Se um dia precisar de patch, reintroduza
  o `patch-package` como devDependency + `postinstall` e confira o Dockerfile (`npm ci --omit=dev`).
  O override `tar ^7.5.21` continua valendo contra a CVE.
- `electron-builder.json5`: build só para Windows (nsis + portable), com `asarUnpack` para os
  binários nativos do onnxruntime/tokenizers.
- Ao fim do `build:electron`, [scripts/prepare-release.cjs](scripts/prepare-release.cjs) completa
  `release/` com `LEIA-ME.txt`, `instalar-extras.cmd` (templates em
  [scripts/release-templates/](scripts/release-templates)) e `mcp/`. O `mcp/` é gerado por
  [scripts/build-mcp.cjs](scripts/build-mcp.cjs): bundle ESM único de `src/mcp/index.ts` via
  esbuild + cópia só dos módulos nativos (mesma lista de `external` do Vite, podada para
  win32-x64). O launcher `dev-manager-mcp.cmd` roda o bundle com o `Hub Manager.exe` instalado
  em modo `ELECTRON_RUN_AS_NODE`, para o usuário não precisar de Node nem do repositório — por
  isso não desligue o fuse `RunAsNode` do Electron. Código do MCP não pode depender de arquivos
  do repositório em runtime (a versão, por exemplo, é injetada via `__DEV_MANAGER_VERSION__`).
  Links de downloads opcionais (modelo do RAG, Instant Client, Ollama) aparecem no template do
  LEIA-ME, no README e em `OPTIONAL_DOWNLOADS` da HelpPage; mude os três juntos.
- Docker (`Dockerfile`, `docker-compose.yml`, `DOCKER.md`) empacota o `server/index.ts`
  headless, não o app Electron.
- `.claude/launch.json` já define os dev servers (`renderer` porta 5173, `server` porta 3000)
  para o preview do Claude Code.
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda lint → typecheck → test →
  **build** (`npm run build`, adicionado para pegar import quebrado/`import()` dinâmico que o
  typecheck sozinho não cobre). Não inclui `build:electron` (empacotamento do instalador),
  que é pesado e específico de plataforma — isso continua só local/release.

## Limite de Linhas e Componentização Estrita (Máximo 300 Linhas)

**Regra mandatória do projeto: nenhum arquivo de código novo ou alterado deve ultrapassar 300 linhas.**

> Dívida conhecida (arquivos que ainda passam do teto e devem ser decompostos ao serem tocados, não de uma vez):
> `src/mcp/index.ts`, `src/shared/types.ts`, `src/server/index.ts`, `src/preload/index.ts`,
> `helpData.tsx` e os serviços `RoutinesService`, `WindowsService`, `BackupService`, `WslService`, `ConfigService`.
> O `npm run check:file-size` só avisa. Não acrescente código novo nesses arquivos sem extrair o que for novo para um módulo próprio.

Ao criar arquivos novos ou refatorar componentes e serviços existentes:
- **Teto rígido de 300 linhas por arquivo**: caso um arquivo comece a crescer e se aproximar de ~250–300 linhas, ele **deve** ser imediatamente decomposto em subcomponentes ou submódulos menores para garantir legibilidade, manutenibilidade e agilidade na revisão de código.
- **Páginas e Telas**: Devem atuar prioritariamente como orquestradoras leves de alto nível (composição de layout e coordenação de fluxo), delegando abas, barras de ferramentas, tabelas, listas e painéis para subcomponentes dedicados em pastas específicas (ex: `src/renderer/src/components/{modulo}/`).
- **Modais e Drawers**: Nunca declarar modais complexos inline no mesmo arquivo da página consumidora. Cada modal deve residir em seu próprio arquivo isolado (`modals/`) e ser importado sob demanda.
- **Extração de Lógica Pura**: Regras de negócio, cálculos analíticos, mapeamentos de dados, parsers e formatações devem ser extraídos para arquivos auxiliares em `utils/` ou `hooks/`, liberando o JSX dos componentes visuais e permitindo cobertura por testes unitários puros.

## Convenções de código e idioma

- Identificadores (variáveis, funções, classes) em **inglês**.
- Comentários de código, mensagens de commit e textos de UI em **português (Brasil)**.
- Commits seguem **Conventional Commits** (`feat(escopo):`, `fix(escopo):`, `test(escopo):`,
  `perf(escopo):`, `chore:`) com corpo descritivo em português.
- **Comandos de Commit Prontos para o Shell**: Sempre que o usuário solicitar mensagens ou sugestões de commit, forneça sempre o comando completo e formatado diretamente para execução no shell (PowerShell com `git commit -m "..." -m "..."`, comandos de `git add .`, criação de tag com `git tag -a vX.Y.Z -m "..."` e `git push --tags`), eliminando a necessidade de montagem manual.
- Ao escrever comentários, siga a política geral do Claude Code: só comente o "porquê" não
  óbvio, nunca o "o quê".

## Central de Ajuda acompanha cada funcionalidade nova

A Central de Ajuda ([src/renderer/src/pages/HelpPage.tsx](src/renderer/src/pages/HelpPage.tsx))
é a documentação que o usuário final lê dentro do app. **Toda funcionalidade visível ao
usuário (tela, aba, modo, integração, tool MCP ou mudança de atalho) só está pronta quando a
Ajuda também foi atualizada, no mesmo commit/PR.** Não deixe para depois: a Ajuda já ficou
várias versões atrás (APM, Statement Tracer, WinThor Start, criptografia de segredos e
contagem de tools MCP ausentes ou desatualizadas).

Checklist ao entregar uma funcionalidade:

- **Guia dos Módulos** (`activeCategory === 'modules'`): adicione um bullet no card do
  módulo afetado ou crie um card novo para página nova (e atualize o `badge` "N Módulos" em
  `categories`).
- **Visão Geral → Ecossistema & Módulos**: página nova ganha um card de acesso rápido com o
  atalho correspondente.
- **FAQ** (`faqList`): se o uso não for óbvio (pré-requisito, configuração, permissão,
  porta, troubleshooting), adicione uma pergunta com `tags` pesquisáveis.
- **Atalhos** (`keyboardShortcuts`): os atalhos `Alt+N` são definidos em 4 lugares que
  precisam bater: o mapa Alt+tecla → aba em
  [appShellNavigation.ts](src/renderer/src/utils/appShellNavigation.ts) (consumido pelo
  `useGlobalShortcuts` em [App.tsx](src/renderer/src/App.tsx)), os `shortcut` do Header em
  [headerNavConfig.ts](src/renderer/src/components/header/headerNavConfig.ts), os `badge` do
  QuickLauncher em [quickLauncherActions.ts](src/renderer/src/utils/quickLauncherActions.ts) e a
  tabela da Ajuda (mais a tabela do README).
- **Números citados** (quantidade de tools MCP, portas padrão, limites): confira contra o
  código ou contra [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) em vez de copiar o texto antigo.
- Use os nomes exatos da UI (rótulos de abas e botões) para o usuário achar o que o texto
  descreve, e não descreva comportamento que o código não tem.
- Se houver tour da página em
  [onboarding/tourSteps.ts](src/renderer/src/components/onboarding/tourSteps.ts), revise
  também.

## Versionamento, Changelog e Release

O modal de **"Novidades da Versão"** que o usuário vê ao abrir o app após um update
([useAppShellOnboarding.ts](src/renderer/src/hooks/app/useAppShellOnboarding.ts)) consome diretamente a seção mais
recente de [CHANGELOG.md](CHANGELOG.md). Portanto, **manter o CHANGELOG, o `package.json`,
o catálogo de tools e os fallbacks sincronizados é obrigatório a cada fechamento de
versão ou entrega de funcionalidade relevante.**

Checklist automático a cada ciclo de versão / release:

1. **`package.json` e `package-lock.json`**:
   - Incrementar a versão seguindo SemVer (`patch` para correções/ajustes internos,
     `minor` para features novas, `major` para mudanças que quebrem compatibilidade).
2. **`CHANGELOG.md`**:
   - Inserir a nova seção no topo no formato Keep a Changelog: `## [X.Y.Z] - AAAA-MM-DD`.
   - Utilizar as subseções padrão: `### Adicionado`, `### Alterado`, `### Corrigido` e `### Segurança`.
   - Redigir em português claro com foco no benefício para o desenvolvedor/usuário final
     (o que mudou, onde acessar na interface e como utilizar).
3. **Catálogo de Ferramentas MCP (`docs/MCP_TOOLS.md`)**:
   - Se tools MCP foram criadas ou alteradas, atualizar a contagem total no texto (ex: `123 ferramentas`)
     e incluir a tool com título, descrição resumida e exemplo prático de prompt entre aspas (`> "..."`).
4. **Fallbacks de Versão no Código**:
   - Alinhar os fallbacks fixos `'X.Y.Z'` na Central de Ajuda ([src/renderer/src/pages/HelpPage.tsx](src/renderer/src/pages/HelpPage.tsx))
     e no servidor MCP ([src/mcp/index.ts](src/mcp/index.ts)) com o novo número de versão.
5. **Tags Git e Commits**:
   - Manter a tag correspondente (`vX.Y.Z`) criada no commit que introduz a versão, garantindo
     que não existam versões no CHANGELOG sem tag no Git ou tags órfãs sem seção no changelog.

## Proibição de Caminhos Hardcoded & Nomes Genéricos

- **Nunca chumbar caminhos absolutos ou específicos de usuário no código**: Caminhos de diretórios, pastas de projetos ou executáveis informados pelo usuário no chat (ex: `C:\Users\...\`) são de seu ambiente pessoal.
  - Devem ser expostos como campos editáveis na tela de **Configurações** (`AppSettings`) com busca no Windows Explorer.
  - Para detecção automática, busque subdiretórios genéricos conhecidos dentro do diretório de projetos configurado (`settings.projectsPath`) ou pastas irmãs (`../`).
  - Nunca crie fallbacks que dependam de diretórios de usuário específicos (`C:\Users\<nome>\...`).
- **Nomenclatura Genérica na UI**: Rótulos de campos, títulos e mensagens devem ser genéricos e autoexplicativos (ex: *"Diretório do Projeto de Testes Automatizados (Cypress)"* em vez de nomes específicos de uma única máquina/repositório privado), com placeholders e tooltips instrutivos.

## Consistência de Design e Design System

- **Manter sempre o design visual do sistema**:
  - Respeitar a identidade visual dark/cockpit do Hub Manager (paleta Tailwind, classes `cockpit-panel`, `bg-card`, `border-border`, tokens semânticos `primary`, `foreground`, `muted-foreground`).
  - Não introduzir elementos ou componentes com estilos desconexos ("AI slop", botões fora do padrão, fontes não mono onde se espera mono, ou quebras de alinhamento).
  - Manter consistência nos ícones (`lucide-react`), densidade de dados, estados de loading, tooltips e feedback sonoro/visual (toasts).

### Diálogos e feedback

Não use `window.confirm`/`alert`. Confirmar uma ação é `await requestConfirm({ title, message, tone })`
([components/ui/confirmService.ts](src/renderer/src/components/ui/confirmService.ts), funciona em hooks e fora de componentes, o
`ConfirmHost` fica em `AppGlobalModals`); aviso que precisa ser lido é `showNotice`; feedback rápido é `showToast`. Modal novo parte de
[components/ui/Modal.tsx](src/renderer/src/components/ui/Modal.tsx) (portal, Esc, foco preso, ARIA) em vez de repetir `fixed inset-0`;
49 modais já usam o `Modal` (modo `bare`, que só dá o comportamento e mantém o layout do próprio modal). Ainda fazem `fixed inset-0` à mão, por terem comportamento próprio: `BindVariablesModal`, `SaveSnippetModal`, `TableSpecModal`, `QualityAddItemModal`, `LogExceptionAnalyzerDrawer`, `MarkdownReader`, `QuickLauncherModal` e o onboarding; e os menus com clique-fora (candidatos a um `Popover`). Editores e formulários nascem com `closeOnEscape={false}` e `closeOnBackdrop={false}` para não descartar o que foi digitado.
