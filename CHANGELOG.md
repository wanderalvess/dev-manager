# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado] - 2026-09-04

### Adicionado
- `git_checkout_branch`: tool MCP para trocar ou criar branch (`GitAzureService.checkoutBranch`), antes só acionável pela UI do Electron via IPC.
- `env_launch_app`: launcher genérico de aplicativo externo por caminho completo (ex: Postman, terminal), sem a restrição de pasta que as rotinas têm.
- Gerência de bundles Karaf via MCP — 9 tools novas expondo funcionalidade que já existia em `KarafService` mas só era acessível pela UI: `karaf_list_bundles`, `karaf_get_bundle_details`, `karaf_check_bundle_dependencies`, `karaf_check_install_dependencies`, `karaf_manage_bundle` (start/stop/restart/uninstall/refresh), `karaf_install_bundle`, `karaf_uninstall_bundle`, `karaf_reinstall_bundle` (update com rebuild Maven opcional) e `karaf_update_bundle_version`.

### Corrigido
- Contagem de tools do servidor MCP no README (41 → 73) e lista de domínios (`docker_*`, `rag_*`, `db_*`, `deploy_*`, `network_*` estavam documentados como ausentes).
