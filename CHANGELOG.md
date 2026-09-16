# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [1.1.0] - 2026-09-16

### Adicionado
- `scripts/smoke-test-package.cjs` (`npm run smoke:package`): empacota via `electron-builder --dir` e valida o `app.asar` gerado (dist/dist-electron/package.json presentes dentro do asar, `onnxruntime-node`/`@anush008/tokenizers-*` corretamente fora dele via `asarUnpack`).
- Histórico persistido de deploys/builds Karaf (`settings.karafDeployHistory`, até 200 entradas): novo botão "Histórico de Deploys" no Gerenciador de Bundles, `karaf_get_deploy_history` (MCP), `GET /api/karaf/deploy-history`, `karaf:list-deploy-history` (IPC).
- Notificações desktop (toast + notificação nativa) para deploy/build Karaf concluído ou falho, e para reindexação automática do RAG concluída — `src/main/services/NotificationService.ts`.
- Auto-reindex do RAG por observação de arquivos (`chokidar`, novo dependency direto): toggle "Reindexar automaticamente ao detectar mudanças" na aba Documentação, observa projetos Git/pastas configuradas e reindexa com debounce quando algo muda.
- `JiraSource` (`docSources/JiraSource.ts`): nova fonte do RAG multi-fonte — projetos/JQLs do Jira indexados como documentação (cada issue vira um "documento"), painel "Fontes Jira" na aba Documentação, `docs:test-jira-connection` (IPC/REST).
- Perfis de Ambiente (`settings.environmentProfiles`): presets nomeados dos diretórios/portas (projectsPath, karafPath, jdkPath, intellijPath, appPath, portas monitoradas) com "Salvar estado atual como perfil" e "Ativar", na aba Configurações.
- `git_checkout_branch`: tool MCP para trocar ou criar branch (`GitAzureService.checkoutBranch`), antes só acionável pela UI do Electron via IPC.
- `env_launch_app`: launcher genérico de aplicativo externo por caminho completo (ex: Postman, terminal), sem a restrição de pasta que as rotinas têm.
- Gerência de bundles Karaf via MCP — 9 tools novas expondo funcionalidade que já existia em `KarafService` mas só era acessível pela UI: `karaf_list_bundles`, `karaf_get_bundle_details`, `karaf_check_bundle_dependencies`, `karaf_check_install_dependencies`, `karaf_manage_bundle` (start/stop/restart/uninstall/refresh), `karaf_install_bundle`, `karaf_uninstall_bundle`, `karaf_reinstall_bundle` (update com rebuild Maven opcional) e `karaf_update_bundle_version`.
- Gerenciamento de containers Docker/Podman bem mais completo (`ContainersPage.tsx`) com suporte a WSL (`WslService.ts`).
- Editor de variáveis de bind (`:PARAMETRO`) na página de Banco de Dados: detecta placeholders no SQL antes de executar, abre modal pra preencher valores tipados (auto/string/number/date/null) e cacheia os últimos valores usados (`src/renderer/src/utils/sqlBinds.ts`).
- Execução de etapa individual de um Perfil de Deploy (Karaf/Docker/comando genérico) sem rodar o perfil inteiro (`DeployService.executeSingleStep`).
- Detecção de colisão de porta local em falha de autenticação de banco: quando o host é loopback, identifica o processo real escutando a porta (via `tasklist`) e só alerta sobre possível túnel SSH perdido quando esse processo não parece ser o motor de banco esperado.
- Progresso ao vivo (streaming) das ações de bundle Karaf (instalar, reinstalar, gerenciar ciclo de vida, desinstalar, atualizar versão) no Gerenciador de Bundles, em vez de só o resultado final ao término.
- Botão único e inteligente para as etapas de serviço Windows (`service-start`/`service-stop`) na Automação: o rótulo e a ação seguem o estado real do serviço (Iniciar/Parar), no lugar do par Executar/Parar que antes convergia pra mesma ação.

### Corrigido
- Contagem de tools do servidor MCP no README (41 → 73) e lista de domínios (`docker_*`, `rag_*`, `db_*`, `deploy_*`, `network_*` estavam documentados como ausentes).
- 15 achados de segurança/robustez identificados na revisão das melhorias de containers: injeção de comando via senha/distro WSL/nome de container no SQL*Plus e no fallback de terminal, verificação de TLS desligada por padrão no build do Electron, `spawn('wt.exe')` sem handler de erro, salvamento de ambiente quebrado no modo web, tradução de caminho Windows→WSL ausente no compose/build, progresso de containers congelado no modo web, detecção de status Docker/WSL desatualizada, validações ausentes em handlers IPC equivalentes às rotas HTTP, entre outros.
- Ações de serviço/processo da Automação (Karaf e perfis de deploy) agora checam o estado atual antes de agir — não tentam mais parar um serviço já parado ou iniciar um já em execução, eliminando falhas genéricas enganosas quando a ação já era redundante.
- Teste desatualizado de `formatErrorMessage` (ORA-01008) e substituição de bind `NULL` não aplicada no modo `auto` do interpolador de SQL.
