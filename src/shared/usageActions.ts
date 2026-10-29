import type { UsageOrigin } from './usageMetricsTypes';

/**
 * Lista fechada de ações que contam como "uso" (épico #11, issue #12).
 *
 * É uma lista branca de propósito: o app tem centenas de canais IPC e rotas REST, e a maioria é
 * leitura chamada em polling (status de portas, listas, métricas do sistema). Contar tudo
 * afogaria o sinal. Só entra aqui o que uma pessoa dispara para fazer um trabalho.
 *
 * `ipc` e `rest` apontam para a mesma ação nos dois transportes. `rest` usa `MÉTODO caminho`
 * como o Express o registra (para routers, `baseUrl + caminho`). As tools MCP não precisam
 * constar aqui: todas são contadas pelo nome.
 */
export interface TrackedUsageAction {
  /** Módulo (chave curta, vira o agrupamento nas telas e no relatório). */
  module: string;
  /** Ação dentro do módulo. */
  action: string;
  /** Canal IPC (`ipcMain.handle`). */
  ipc?: string;
  /** Rota REST no formato `POST /api/...`. */
  rest?: string;
}

export const TRACKED_USAGE_ACTIONS: readonly TrackedUsageAction[] = [
  // Ambiente
  { module: 'environment', action: 'pipeline-run', ipc: 'profile:run', rest: 'POST /api/profile/run' },
  { module: 'environment', action: 'reset', ipc: 'env:reset-environment', rest: 'POST /api/env/reset' },
  { module: 'environment', action: 'launch-ide', ipc: 'env:launch-intellij', rest: 'POST /api/env/launch-ide' },
  { module: 'environment', action: 'launch-server-debug', ipc: 'env:launch-server-debug', rest: 'POST /api/env/launch-server-debug' },
  // Deploy e Karaf
  { module: 'deploy', action: 'run-profile', ipc: 'deploy:run-profile', rest: 'POST /api/deploy/run-profile' },
  { module: 'deploy', action: 'run-step', ipc: 'deploy:run-step', rest: 'POST /api/deploy/run-step' },
  { module: 'karaf', action: 'deploy', ipc: 'karaf:deploy', rest: 'POST /api/karaf/deploy' },
  { module: 'karaf', action: 'start-embedded', ipc: 'karaf:start-embedded', rest: 'POST /api/karaf/embedded/start' },
  // Banco
  { module: 'database', action: 'execute-query', ipc: 'db:execute-query', rest: 'POST /api/db/query' },
  { module: 'database', action: 'oracle-capture-start', ipc: 'db:start-oracle-capture', rest: 'POST /api/db/oracle-capture/start' },
  { module: 'database', action: 'backup-run', ipc: 'db:run-backup', rest: 'POST /api/db/backup' },
  { module: 'database', action: 'restore', ipc: 'db:restore-backup', rest: 'POST /api/db/restore' },
  { module: 'database', action: 'restore-drill', ipc: 'db:run-restore-drill', rest: 'POST /api/db/restore-drill' },
  // Rotinas
  { module: 'routines', action: 'launch', ipc: 'routines:launch', rest: 'POST /api/routines/launch' },
  { module: 'routines', action: 'download-ccw', ipc: 'routines:download-ccw', rest: 'POST /api/routines/download-ccw' },
  // Git
  { module: 'git', action: 'create-task-branch', ipc: 'git:create-task-branch', rest: 'POST /api/git/create-task-branch' },
  { module: 'git', action: 'publish-branch', ipc: 'git:publish-branch', rest: 'POST /api/git/publish-branch' },
  { module: 'git', action: 'commit-and-push', ipc: 'git:commit-and-push', rest: 'POST /api/git/commit-push' },
  // Qualidade (QA)
  { module: 'qa', action: 'regression-execute', ipc: 'qa:execute-suite', rest: 'POST /api/qa/execute' },
  { module: 'qa', action: 'payload-fetch-api', ipc: 'qa:fetch-api-payload', rest: 'POST /api/qa/payloads/fetch-api' },
  { module: 'qa', action: 'test-runner-execute', ipc: 'test-runner:execute', rest: 'POST /api/test-runner/execute' },
  { module: 'qa', action: 'taut-run-tests', ipc: 'taut:run-tests', rest: 'POST /api/taut/run' },
  { module: 'qa', action: 'taut-process-intake', ipc: 'taut:process-intake', rest: 'POST /api/taut/intake' },
  // Rastreio de Integração ponta a ponta
  { module: 'integration', action: 'readiness-check', ipc: 'integration:check-readiness', rest: 'POST /api/integration/readiness' },
  { module: 'integration', action: 'batch-trace', ipc: 'integration:trace-batch', rest: 'POST /api/integration/trace' },
  // API Studio
  { module: 'api-studio', action: 'send-request', ipc: 'http:execute', rest: 'POST /api/http-client/execute' },
  // Documentação e IA
  { module: 'docs', action: 'search', ipc: 'docs:search', rest: 'GET /api/docs/search' },
  { module: 'assistant', action: 'chat', ipc: 'llm:chat', rest: 'POST /api/llm/chat' },
  { module: 'assistant', action: 'ask-with-docs', ipc: 'llm:ask-with-docs', rest: 'POST /api/llm/ask-with-docs' }
];

const BY_IPC = new Map(
  TRACKED_USAGE_ACTIONS.filter((a) => a.ipc).map((a) => [a.ipc as string, a])
);
const BY_REST = new Map(
  TRACKED_USAGE_ACTIONS.filter((a) => a.rest).map((a) => [a.rest as string, a])
);

/** Ação rastreada de um canal IPC, ou `undefined` se o canal não conta como uso. */
export function findTrackedIpcAction(channel: string): TrackedUsageAction | undefined {
  return BY_IPC.get(channel);
}

/** Ação rastreada de uma rota REST (`MÉTODO caminho-registrado`), ou `undefined`. */
export function findTrackedRestAction(method: string, routePath: string): TrackedUsageAction | undefined {
  return BY_REST.get(`${method.toUpperCase()} ${routePath}`);
}

/** Nome de exibição de cada módulo (pt-BR). Módulo desconhecido aparece com a própria chave. */
export const USAGE_MODULE_LABELS: Readonly<Record<string, string>> = {
  environment: 'Ambiente Dev',
  deploy: 'Deploy',
  karaf: 'Karaf',
  database: 'Database Studio',
  routines: 'Rotinas',
  git: 'Git & Azure DevOps',
  qa: 'Qualidade (QA)',
  'api-studio': 'API Studio',
  docs: 'Documentação & RAG',
  assistant: 'Assistente IA',
  containers: 'Containers',
  apm: 'APM & Traces',
  integration: 'Rastreio de Integração',
  logs: 'Logs',
  system: 'Sistema',
  settings: 'Configurações'
};

export function usageModuleLabel(module: string): string {
  return USAGE_MODULE_LABELS[module] ?? module;
}

/**
 * Prefixo do nome de uma tool MCP → módulo. Faz o uso pelo MCP somar com o uso pela interface
 * no mesmo módulo (`db_*` e a UI do Database Studio são ambos `database`).
 */
export const MCP_PREFIX_TO_MODULE: Readonly<Record<string, string>> = {
  env: 'environment',
  profile: 'environment',
  deploy: 'deploy',
  karaf: 'karaf',
  db: 'database',
  backup: 'database',
  routines: 'routines',
  routine801: 'routines',
  git: 'git',
  qa: 'qa',
  taut: 'qa',
  test: 'qa',
  http: 'api-studio',
  docs: 'docs',
  rag: 'docs',
  llm: 'assistant',
  docker: 'containers',
  apm: 'apm',
  integration: 'integration',
  logs: 'logs',
  network: 'system',
  system: 'system',
  settings: 'settings'
};

/** Origens que o front pode pedir no filtro. */
export const USAGE_ORIGINS: readonly UsageOrigin[] = ['ui', 'rest', 'mcp'];
