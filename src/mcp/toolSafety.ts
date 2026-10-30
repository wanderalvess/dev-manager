/**
 * Classificação de risco das tools MCP. Serve a três coisas:
 *  - `annotations` (readOnlyHint/destructiveHint) para o cliente MCP poder pedir confirmação;
 *  - o modo `HUB_MCP_MODE=readonly`, que nem registra as tools que alteram algo;
 *  - o bloqueio de SQL de escrita em conexões marcadas como produção.
 */

export type ToolRisk = 'read' | 'write' | 'destructive';
export type McpMode = 'full' | 'readonly';

/**
 * Apagam dados, executam comando/binário arbitrário ou mudam configuração — o cliente deve confirmar.
 * Inclui as que aceitam um comando livre (`profile_run*`, `env_launch_app`, comando customizado de backup).
 */
const DESTRUCTIVE_TOOLS = new Set([
  'env_batch_kill_processes',
  'env_reset_environment',
  'env_launch_app',
  'profile_run',
  'profile_run_step',
  'profile_kill_port',
  'karaf_exec_command',
  'karaf_send_embedded_input',
  'karaf_uninstall_bundle',
  'karaf_remove_feature_repo',
  'docker_remove_container',
  'docker_compose_down',
  'routines_restore_backup',
  'routines_delete_backup',
  'routines_install_local_file',
  'settings_save',
  'db_execute_query',
  'db_restore_backup',
  'db_run_backup',
  // O drill é uma restauração completa no destino; salvar a config pode agendar um comando livre
  'db_run_restore_drill',
  'db_save_backup_config',
  'db_clear_oracle_capture',
  'logs_clear_file',
  'qa_delete_template',
  // Bloqueia contas de teste de propósito (e o nome termina em _test, que parece leitura)
  'qa_run_auth_lockout_test',
  'deploy_run_profile',
  'delphi_build',
  'delphi_run_pipeline'
]);

/** Parecem leitura pelo nome, mas têm efeito (rede externa, envio de webhook, execução de testes). */
const WRITE_EXCEPTIONS = new Set(['backup_test_webhook', 'qa_fetch_api_payload', 'qa_fetch_incoming_payload', 'test_runner_execute', 'http_send_request']);

const READ_NAME = /(^|_)(get|list|check|status|is|read|search|analyze|explain|fetch|parse|verify|detect|test|logs|history|stats|ips|health|metrics|info|chat|ask)(_|$)/;

export function classifyTool(name: string): ToolRisk {
  if (DESTRUCTIVE_TOOLS.has(name)) return 'destructive';
  if (WRITE_EXCEPTIONS.has(name)) return 'write';
  return READ_NAME.test(name) ? 'read' : 'write';
}

/** Anotações do protocolo MCP. `destructiveHint` precisa ser explícito: o padrão do protocolo é `true`. */
export function annotationsFor(name: string): { readOnlyHint: boolean; destructiveHint: boolean } {
  const risk = classifyTool(name);
  return { readOnlyHint: risk === 'read', destructiveHint: risk === 'destructive' };
}

export function getMcpMode(env: NodeJS.ProcessEnv = process.env): McpMode {
  return String(env.HUB_MCP_MODE || '').trim().toLowerCase() === 'readonly' ? 'readonly' : 'full';
}

export function isToolAllowed(name: string, mode: McpMode): boolean {
  return mode === 'full' || classifyTool(name) === 'read';
}
