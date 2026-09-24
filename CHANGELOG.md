# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada versão abaixo corresponde a um commit específico em `main`, do `v1.0.0` até aqui — tags criadas retroativamente sobre o histórico já existente (sem reescrever nenhum commit).

## [Não lançado]

## [1.15.0] - 2026-09-24
### Adicionado
- **Statement Tracer (Oracle)**: nova aba no DB Studio com captura contínua de atividade (`v$session`/`v$sql`) rodando em segundo plano no processo do app (não no componente React) — sobrevive a trocar de aba ou navegar para outra página do Dev Manager, então dá pra iniciar a captura, ir disparar uma ação em outro app conectado ao mesmo Oracle e voltar depois para ver a linha do tempo de qual sessão rodou qual SQL. Intervalo de consulta configurável (2s a 30s, piso de 2s) e parada automática de segurança após 30 minutos. Consultas pontuais também ficam expostas via MCP (`db_get_oracle_active_sessions`, `db_get_oracle_recent_statements`).
- Tools MCP de captura contínua do Statement Tracer: `db_start_oracle_capture`, `db_get_oracle_capture_state` (com `limit`, padrão 50), `db_stop_oracle_capture` e `db_clear_oracle_capture`. A IA liga a captura, o usuário executa a ação no app/rotina e a IA lê quais SQLs rodaram. A captura é própria do servidor MCP e independente da iniciada na tela do app.
- **APM & Traces (OpenTelemetry)**: receptor OTLP/HTTP embutido (JSON ou Protobuf, com gzip/deflate), dashboard (vazão, latências p50/p95/p99, taxa de erros, % do tempo em banco, endpoints e queries lentas) e Traces Explorer (waterfall, atributos, SQL, stacktrace e decomposição do tempo entre banco, chamadas externas e aplicação). O Karaf iniciado pelo Cockpit anexa o `opentelemetry-javaagent.jar` automaticamente quando ele está em `<karaf>/bin`.
- Porta do receptor configurável em **APM & Traces → Como Conectar**: a porta nova é aberta antes de fechar a atual, então uma porta ocupada (ex.: por um OTel Collector/SigNoz local) não derruba o receptor em uso; o anexo automático do agente segue a porta escolhida.
- Tools MCP `apm_*` (overview, traces, detalhes, serviços e status do receptor). Como o servidor MCP roda em outro processo, elas consultam o buffer do app por uma API local do receptor — somente loopback, sem CORS e protegida por um token publicado na pasta de dados do usuário.
- **Git & Azure DevOps**: contagem de alterações pendentes de todos os repositórios (em lote, com concorrência limitada, só ao abrir/sincronizar a tela), link "Ver no GitHub/GitLab/Azure", seletor de branch de destino do PR montado a partir das branches reais do origin, lista de branches com filtro incluindo branches locais ainda não publicadas e branches que só existem no origin (o checkout cria a local rastreando o origin), aviso de HEAD destacado e suporte a remotes SSH/SCP, ao formato legado `{org}.visualstudio.com`, a worktrees/submódulos e a `packed-refs`.
- Tools MCP de leitura de Git: `git_get_status`, `git_get_diff` (com limite de tamanho configurável) e `git_get_commit_history`; `git_list_projects` ganha `includeUncommittedCount`.
- Onboarding: atualização de versão passa a mostrar só um resumo do changelog (sem resetar Welcome/Tour), e o tour inicial leva direto para Configurações quando faltam caminhos essenciais (repositórios/IDE).
- Catálogo de tools MCP (`docs/MCP_TOOLS.md`) passa a documentar as tools `apm_*` e `routine801_*`, além de 27 tools que existiam mas não estavam listadas (`env_batch_*`, `env_check_admin`, `env_launch_server_debug`, 13 tools `karaf_*` de console embutido/bundles/histórico, `profile_kill_port`, `profile_stop_step`, `routines_*`, `settings_*`, `system_check_path` e `system_auto_detect_paths`), com uma seção nova de Catálogo de Rotinas (123 tools no total).
- Central de Ajuda cobre as funcionalidades das últimas versões: card de **APM & Traces** no Guia dos Módulos e na Visão Geral, Statement Tracer no card de Banco de Dados, branches remotas/upstream/worktrees e GitHub/GitLab no card de Git, WinThor Start no card de Rotinas, e FAQs sobre o Statement Tracer, conexão do Java Agent ao receptor APM, WinThor Start/WTA e criptografia de segredos.
### Alterado
- Nova identidade visual do ícone/logo (fundo índigo mais claro, fonte de luz e reflexo), aplicada ao `AppLogo`, `icon.svg`, `icon.png` e `favicon.ico`.
- Welcome do onboarding reduzido de 3 telas para 1 (saudação + escolha de tema + começar).
- Listagem de tabelas do DB Studio sobe o teto de 500 para 50.000 tabelas (schemas de ERP passam fácil de alguns milhares), com a sidebar renderizando a lista em blocos conforme o scroll.
- Cabeçalho do gerenciador de bundles do Karaf quebra linha em telas estreitas, com botões de altura uniforme.
### Segurança
- A URL do remote Git devolvida pela API web e pelo MCP tinha usuário/PAT embutidos (ex.: `https://user:PAT@dev.azure.com/...`) — agora é sanitizada.
- O `GitAzureService` passa a validar o caminho do projeto no próprio service (e não só nas rotas), recusando caminhos UNC que apontariam o git para `.git/config`/hooks de terceiros, já que IPC, servidor web e MCP o chamam diretamente.
### Corrigido
- `git checkout` de um nome sem branch correspondente (ex.: `.` ou `src`) descartava as alterações locais desses caminhos; agora o nome é sempre tratado como branch.
- Fetch/pull/push ficavam presos indefinidamente num prompt de credencial ou de host SSH sem resposta; agora têm tempo limite de 3 minutos, e o estouro encerra a árvore inteira de processos (credential helper, `git-remote-https`, `ssh`). O `git status` de segundo plano também tem limite e usa `--no-optional-locks` para não disputar o `index.lock` com a IDE.
- Commit & Push numa branch nova sem upstream dependia de casar a mensagem de erro do git em inglês (falhava com o git em português); agora detecta o upstream antes, publica em `origin` com o mesmo nome e configura o tracking. A existência de algo no stage também deixou de depender do idioma do git. Erros de commit aparecem dentro do modal (mantendo a mensagem digitada), e falha só no push fecha o modal com o aviso em destaque.
- Diff de arquivo não rastreado vinha vazio (passa a ser exibido como arquivo novo); cliques rápidos em arquivos diferentes podiam mostrar o diff errado; e o painel continuava exibindo branch/contagem anteriores após checkout ou commit.
- Onboarding: condição de corrida no primeiro uso reabria Welcome/Tour depois que o usuário já tinha pulado; o botão "Ver Tour Guiado" da Central de Ajuda reabria a introdução completa em vez de só o tour; e o botão "Pular introdução" não recebia clique de mouse real (coberto pelo container de conteúdo).
- O receptor OTLP descartava com resposta 200 o array JSON do exemplo cURL da própria tela de conexão (e JSON com espaço/BOM), tratados como protobuf; as rotas do servidor web não aceitavam protobuf — formato padrão do Java Agent — nem payloads acima de 100KB.
- Decoder protobuf endurecido contra payload malformado (um varint longo tinha custo quadrático e podia travar o processo principal) e contra zip bomb; payload grande passa a receber 413, que o exportador não retenta.
- A tela de APM não carregava dados no modo Web/Docker (`api` do apiBridge era capturado antes do `initApiBridge`).
- O % do tempo em banco contava spans SERVER aninhados e spans sem pai como tempo total, e a taxa de erro do cabeçalho virava 100% com o filtro "Erros" ativo.
- O drawer do trace selecionava o span errado, a aba Atributos mostrava sempre o mesmo span, a aba de erro não exibia o stacktrace e as queries SQL apareciam sem os números.
- `Alt+0` abria Configurações, embora o menu e o Quick Launcher o anunciassem como atalho do **APM & Traces**; agora abre o APM. A tabela de atalhos da Ajuda e do README dizia que `Alt+8` abria Configurações (abre Logs) e não citava `Alt+0`.
- A Central de Ajuda informava 73 tools MCP; são 123.

## [1.14.0] - 2026-09-23
### Adicionado
- Criptografia em repouso (AES-256-GCM) dos segredos gravados no `config.json` — senha do Karaf, senhas de conexão de banco, tokens do Confluence/Jira e API keys de provedores LLM, antes salvos em texto plano no disco.
- Fuzzy match com destaque de trecho correspondente e ordenação por relevância no Quick Launcher (`Ctrl+K`).
- Autenticação por API key também no handshake do WebSocket do modo Web/Docker (`/ws`): antes, um cliente que não fosse navegador podia se conectar sem enviar o header `Origin` e, com isso, contornar por completo a autenticação já exigida nas rotas REST — inclusive para enviar comandos ao Karaf embutido (`karaf:input`).
- Paridade do servidor MCP com IPC/REST para backup/restore de banco (`db_run_backup`, `db_list_backups`, `db_restore_backup`, `db_run_restore_drill`, `db_save_backup_config`, `db_list_backup_history`, `backup_test_webhook`) e para o observador de logs (`logs_check_file`, `logs_read_last_lines`, `logs_clear_file`) — nenhum dos dois tinha qualquer tool exposta a assistentes de IA até aqui.
- Verificação de build (`npm run build`) adicionada ao pipeline de CI, além de lint/typecheck/test.
### Alterado
- Code-split das páginas via `React.lazy`: bundle inicial do renderer reduzido de 1.19MB para 247KB.
- Documentação esclarece que o modo Web/Docker é single-tenant (sem isolamento por usuário).
- Lógica de preservação de credenciais existentes ao salvar configurações (antes duplicada em `registerIpc.ts` e `server/index.ts`, ausente no MCP) centralizada em `ConfigService.saveSettings`.
### Corrigido
- 35 erros de typecheck e a maior parte dos avisos pré-existentes do ESLint (52 no total) acumulados após a modernização do cockpit de containers, incluindo 3 falhas de teste que quebravam o CI desde então.
- Credenciais de webhook (`docSyncTargets`/`backupWebhooks`, usadas por sincronização de documentação e notificações de backup) ficaram de fora da criptografia em repouso acima e também não eram mascaradas em `GET /api/settings`/`settings:get` — trafegavam e ficavam gravadas em texto plano, diferente das demais credenciais. Corrigido; e a proteção contra reaproveitar uma credencial salva quando só o destino (host/URL) muda — que já existia para API keys de LLM só na importação de configurações — passou a valer para todo campo de segredo, em todo caminho de salvamento.
- Teste de isolamento de cache do `ConfigService` (`cada instância... não vaza entre instâncias`) dependia da resolução de mtime do sistema de arquivos e falhava esporadicamente; passou a forçar o avanço do mtime como o teste vizinho já fazia.

## [1.13.0] - 2026-09-21
### Adicionado
- **Integração WinThor Start (DataSnap REST) & WTA**:
  - Abertura de rotinas desktop do WinThor (extensões `.EXE`, `.PC`, etc.) através do serviço local **WinThor Start** (`http://localhost:9195`), permitindo iniciar telas com contexto autenticado sem necessitar do menu aberto.
  - Autenticação automática no portal WinThor Anywhere (WTA) via endpoint `POST /winthor/autenticacao/v1/login` para obtenção dinâmica de tokens e parâmetros de inicialização de rotinas (`matriculaWinthor`, `usuarioBd`, `senhaBd`, `serverBd`, `token`).
  - Suporte a payload de sessão fixo (`winthorStartDefaultPayload`) como contingência e fallback permanente.
  - Monitoramento nativo da porta `9195` (`WinThor Start (Launcher Delphi)`) e `8889` (`Portal Web Local (WTA)`) no cockpit de portas monitoradas.
  - Painel de configuração visual dedicado em **Configurações > Diretórios** e badge de status em tempo real no **Catálogo de Rotinas**.
  - Fallback automático para execução direta (`spawn`) ou launcher customizado caso o serviço local esteja inativo.
- **Distribuição & Assinatura de Código (Code Signing)**:
  - Pipeline de empacotamento com suporte ativo e validado à assinatura digital de binários (`.exe`, instalador NSIS e desinstalador) via certificado corporativo (`.env.codesign`), prevenindo bloqueios do Windows SmartScreen na distribuição interna.

## [1.12.0] - 2026-09-17
### Adicionado
- Sistema completo de Onboarding Guiado e Tours Interativos (`src/renderer/src/components/onboarding/`):
  - Tour global no cabeçalho apresentando as principais ferramentas e recursos do cockpit (Infraestrutura, Banco de Dados, Desenvolvimento, Busca Rápida `Ctrl+K`, Diagnósticos/Rede, Configurações e Atualização).
  - Tours interativos contextuais dedicados em todas as telas do cockpit (Ambiente, Containers, Banco de Dados, Deploy Karaf, Git/Azure DevOps, Logs, Documentação RAG, Rotinas WinThor e Configurações).
  - Coordenação inteligente (`tourCoordinator` e `usePageTour`) para evitar sobreposição, abrindo os tours por página apenas após o usuário concluir ou dispensar o tour inicial.
  - Persistência de progresso e conclusão salva individualmente no `localStorage`.
- Gerador automático e validador de ícones para distribuição Desktop (`scripts/generate-icons.cjs`):
  - Garante a presença e conformidade dos ícones `.ico` e `.png` (mínimo 256x256) no pipeline do Electron através do hook de npm `prebuild`.
  - Configuração explícita de ícone Windows em `electron-builder.json5`.

## [1.10.0] - 2026-09-16
### Adicionado
- Autocomplete no editor SQL da página de Banco de Dados: sugere palavras-chave, tabelas e colunas (com resolução de `alias.coluna` a partir das cláusulas `FROM`/`JOIN`); navegação por setas, `Tab`/`Enter` pra aceitar, `Esc` pra fechar.
### Corrigido
- Listagem de tabelas do PostgreSQL considerava só o schema `public`, ocultando tabelas de outros schemas — agora lista todos (exceto `pg_catalog`/`information_schema`), qualificadas como `schema.tabela`; `getTableColumns` resolve o schema correspondente.

## [1.9.1] - 2026-09-16
### Corrigido
- Testes de `BackupService` (placeholders, tokenização de comando, mascaramento de senha) usando `require()` num projeto ESM, quebrando a suíte (`Cannot find module`) — trocados por `import` normal.

## [1.9.0] - 2026-09-16
### Adicionado
- Comando de backup personalizado por conexão: template com placeholders (`{filePath}`, `{connectString}`, `{directory}`, etc.), tokenizado e executado via `execFile` (sem shell), bloqueando metacaracteres de encadeamento (`; & | < > \``) e mascarando a senha nos logs — `BackupService.runCustomCommandBackup`.

## [1.8.2] - 2026-09-16
### Corrigido
- Ações de serviço/processo da Automação (Karaf e perfis de deploy) agora checam o estado atual antes de agir — não tentam mais parar um serviço já parado ou iniciar um já em execução, eliminando falhas genéricas enganosas.
- Botão único e inteligente para as etapas de serviço Windows (`service-start`/`service-stop`) na Automação: o rótulo e a ação seguem o estado real do serviço (Iniciar/Parar), no lugar do par Executar/Parar que antes convergia pra mesma ação.

## [1.8.1] - 2026-09-16
### Corrigido
- Teste desatualizado de `formatErrorMessage` (ORA-01008) que ainda usava a assinatura síncrona antiga.
- Substituição de bind `NULL` não aplicada no modo `auto` do interpolador de SQL (`substituteBindVariables`).

## [1.8.0] - 2026-09-16
### Adicionado
- Editor de variáveis de bind (`:PARAMETRO`) na página de Banco de Dados: detecta placeholders no SQL antes de executar, abre modal pra preencher valores tipados (auto/string/number/date/null) e cacheia os últimos valores usados (`src/renderer/src/utils/sqlBinds.ts`).
- Execução de etapa individual de um Perfil de Deploy (Karaf/Docker/comando genérico) sem rodar o perfil inteiro (`DeployService.executeSingleStep`).

## [1.7.1] - 2026-09-16
### Corrigido
- Detecção de colisão de porta local identifica o processo real escutando a porta (via `tasklist`) e só alerta quando ele não parece ser o motor de banco esperado — antes disparava até contra o próprio banco local correto.
### Adicionado
- Progresso ao vivo (streaming) das ações de bundle Karaf (instalar, reinstalar, gerenciar ciclo de vida, desinstalar, atualizar versão) no Gerenciador de Bundles, em vez de só o resultado final ao término.

## [1.7.0] - 2026-09-15
### Adicionado
- Detecção de colisão de porta local em falha de autenticação de banco: quando o host é loopback, avisa sobre possível túnel SSH que perdeu a porta pra um serviço local já rodando.

## [1.6.1] - 2026-09-15
### Corrigido
- 15 achados de segurança/robustez identificados na revisão das melhorias de containers: injeção de comando via senha/distro WSL/nome de container, TLS desligado por padrão no build do Electron, `spawn('wt.exe')` sem handler de erro, salvamento de ambiente quebrado no modo web, tradução de caminho Windows→WSL ausente no compose/build, progresso de containers congelado no modo web, detecção de status Docker/WSL desatualizada, validações ausentes em handlers IPC, entre outros.

## [1.6.0] - 2026-09-15
### Adicionado
- Gerenciamento de containers Docker/Podman bem mais completo (`ContainersPage.tsx`) com suporte a WSL (`WslService.ts`).

## [1.5.0] - 2026-09-13
### Adicionado
- Histórico persistido de deploys/builds Karaf (`settings.karafDeployHistory`, até 200 entradas): botão "Histórico de Deploys" no Gerenciador de Bundles, `karaf_get_deploy_history` (MCP), `GET /api/karaf/deploy-history`, `karaf:list-deploy-history` (IPC).
- Notificações desktop (toast + notificação nativa) para deploy/build Karaf concluído ou falho, e para reindexação automática do RAG concluída (`NotificationService.ts`).
- Auto-reindex do RAG por observação de arquivos (`chokidar`): toggle "Reindexar automaticamente ao detectar mudanças" na aba Documentação.
- `JiraSource`: nova fonte do RAG multi-fonte — projetos/JQLs do Jira indexados como documentação, painel "Fontes Jira" na aba Documentação.
- Perfis de Ambiente (`settings.environmentProfiles`): presets nomeados dos diretórios/portas com "Salvar estado atual como perfil" e "Ativar".

## [1.4.0] - 2026-09-12
### Adicionado
- Ação `bundle:resolve` e visualizador de log real do Karaf no Gerenciador de Bundles.

## [1.3.2] - 2026-09-12
### Corrigido
- Mensagem de erro preservada em `/api/db/test` no modo web (antes era engolida/genérica).

## [1.3.1] - 2026-09-12
### Corrigido
- Mensagens de erro engolidas no modo web e rótulo de PR fixo no provider Azure DevOps.

## [1.3.0] - 2026-09-12
### Adicionado
- Export CSV do histórico de backup, presets de webhook, e melhorias em compose/karaf/confluence/drill.

## [1.2.0] - 2026-09-12
### Adicionado
- Webhook de backup, restore drill, PR multi-provider, Docker Compose, log Karaf persistido, fonte Confluence e auto-update.

## [1.1.0] - 2026-09-12
### Adicionado
- Melhorias no backup de banco: lock contra execuções concorrentes, retenção por idade, compressão, histórico e notificação.

---

### Já incluído no [1.0.0]
- `git_checkout_branch`, `env_launch_app` e gerência de bundles Karaf via MCP (`karaf_list_bundles`, `karaf_manage_bundle`, `karaf_install_bundle`, etc.) — commit `49ecb34`, anterior à tag `v1.0.0`.
