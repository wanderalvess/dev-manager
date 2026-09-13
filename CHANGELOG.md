# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado] - 2026-09-13

### Adicionado
- `scripts/smoke-test-package.cjs` (`npm run smoke:package`): empacota via `electron-builder --dir` e valida o `app.asar` gerado (dist/dist-electron/package.json presentes dentro do asar, `onnxruntime-node`/`@anush008/tokenizers-*` corretamente fora dele via `asarUnpack`).
- Histórico persistido de deploys/builds Karaf (`settings.karafDeployHistory`, até 200 entradas): novo botão "Histórico de Deploys" no Gerenciador de Bundles, `karaf_get_deploy_history` (MCP), `GET /api/karaf/deploy-history`, `karaf:list-deploy-history` (IPC).
- Notificações desktop (toast + notificação nativa) para deploy/build Karaf concluído ou falho, e para reindexação automática do RAG concluída — `src/main/services/NotificationService.ts`.
- Auto-reindex do RAG por observação de arquivos (`chokidar`, novo dependency direto): toggle "Reindexar automaticamente ao detectar mudanças" na aba Documentação, observa projetos Git/pastas configuradas e reindexa com debounce quando algo muda.
- `JiraSource` (`docSources/JiraSource.ts`): nova fonte do RAG multi-fonte — projetos/JQLs do Jira indexados como documentação (cada issue vira um "documento"), painel "Fontes Jira" na aba Documentação, `docs:test-jira-connection` (IPC/REST).
- Perfis de Ambiente (`settings.environmentProfiles`): presets nomeados dos diretórios/portas (projectsPath, karafPath, jdkPath, intellijPath, appPath, portas monitoradas) com "Salvar estado atual como perfil" e "Ativar", na aba Configurações.

## [Não lançado] - 2026-09-04

### Adicionado
- `git_checkout_branch`: tool MCP para trocar ou criar branch (`GitAzureService.checkoutBranch`), antes só acionável pela UI do Electron via IPC.
- `env_launch_app`: launcher genérico de aplicativo externo por caminho completo (ex: Postman, terminal), sem a restrição de pasta que as rotinas têm.
- Gerência de bundles Karaf via MCP — 9 tools novas expondo funcionalidade que já existia em `KarafService` mas só era acessível pela UI: `karaf_list_bundles`, `karaf_get_bundle_details`, `karaf_check_bundle_dependencies`, `karaf_check_install_dependencies`, `karaf_manage_bundle` (start/stop/restart/uninstall/refresh), `karaf_install_bundle`, `karaf_uninstall_bundle`, `karaf_reinstall_bundle` (update com rebuild Maven opcional) e `karaf_update_bundle_version`.

### Corrigido
- Contagem de tools do servidor MCP no README (41 → 73) e lista de domínios (`docker_*`, `rag_*`, `db_*`, `deploy_*`, `network_*` estavam documentados como ausentes).
