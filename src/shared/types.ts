export type ServiceState = 'RUNNING' | 'STOPPED' | 'START_PENDING' | 'STOP_PENDING' | 'UNKNOWN' | 'NOT_INSTALLED';

export interface ServiceStatus {
  name: string;
  displayName: string;
  state: ServiceState;
}

export interface TrackedServiceConfig {
  id?: string;
  name: string;
  displayName: string;
  enabled: boolean;
  autoStop?: boolean;
  autoStart?: boolean;
}

export interface TrackedProcessConfig {
  id?: string;
  name: string;
  displayName: string;
  enabled: boolean;
  autoKill?: boolean;
}

export interface ProcessStatus {
  name: string;
  displayName: string;
  isRunning: boolean;
  pid?: string;
}

export interface EnvironmentAutomationConfig {
  stopServices: boolean;
  killProcesses: boolean;
  launchIde: boolean;
  startKaraf: boolean;
  openBrowser?: boolean;
  launchMode: 'embedded' | 'external';
  selectedServiceNames?: string[];
  selectedProcesses?: string[];
  selectedStartServiceNames?: string[];
}

export type AutomationStepType =
  | 'command'
  | 'kill-port'
  | 'service-start'
  | 'service-stop'
  | 'kill-process'
  | 'ide'
  | 'karaf'
  | 'browser'
  | 'db-query';

export interface AutomationStep {
  id: string;
  name: string;
  type: AutomationStepType;
  enabled: boolean;
  command?: string;
  cwd?: string;
  envVars?: Record<string, string>;
  port?: number;
  launchMode?: 'wt' | 'cmd' | 'background' | 'embedded';
  wtWindowId?: string;
  delayAfterSeconds?: number;
  waitForPort?: boolean;
  browserUrl?: string;
  targetName?: string;
  /** Para type 'db-query': id de uma DatabaseConnectionConfig salva nas configurações. */
  dbConnectionId?: string;
  /** Para type 'db-query': SQL a executar. Suporta os placeholders {{localIp}} e {{wslIp}}. */
  sql?: string;
}

export interface AutomationProfile {
  id: string;
  name: string;
  description?: string;
  steps: AutomationStep[];
  isDefault?: boolean;
}

export interface ProfileExecutionResult {
  success: boolean;
  logs: EnvironmentLog[];
  error?: string;
}

export interface MonitoredPortConfig {
  id?: string;
  port: number;
  label: string;
  enabled: boolean;
}

export interface PortStatus {
  port: number;
  label: string;
  inUse: boolean;
  pid?: string;
}

export interface EnvironmentLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface EnvironmentResetResult {
  success: boolean;
  logs: EnvironmentLog[];
  error?: string;
}

export interface KarafDeployRequest {
  karafClientPath: string;
  user: string;
  pass: string;
  repoUrl: string;
  featureInstall: string;
  port?: number;
}

export type DeployStepType =
  | 'maven-build'
  | 'karaf-command'
  | 'karaf-bundle'
  | 'docker-build'
  | 'docker-push'
  | 'docker-restart'
  | 'command'
  | 'wait'
  | 'http-healthcheck'
  | 'service-action';

export interface DeployStep {
  id: string;
  name: string;
  type: DeployStepType;
  enabled: boolean;
  /** Se true, uma falha nesta etapa não abortará as etapas subsequentes do perfil */
  continueOnError?: boolean;
  /** Timeout máximo em segundos para execução desta etapa */
  timeoutSeconds?: number;
  // maven-build
  projectPath?: string;
  skipTests?: boolean;
  // karaf-command / command (genérico)
  command?: string;
  cwd?: string;
  // karaf-bundle
  bundleAction?: 'install' | 'reinstall' | 'uninstall' | 'update' | 'restart' | 'refresh' | 'start' | 'stop';
  bundleId?: string;
  bundleLocation?: string;
  bundleStart?: boolean;
  // docker-build / docker-push
  dockerContextPath?: string;
  dockerFile?: string;
  dockerImageTag?: string;
  // docker-restart
  dockerContainer?: string;
  // wait
  waitDurationSeconds?: number;
  // http-healthcheck
  healthcheckUrl?: string;
  healthcheckExpectedStatus?: number;
  healthcheckTimeoutSeconds?: number;
  healthcheckRetries?: number;
  // service-action
  serviceName?: string;
  serviceAction?: 'start' | 'stop' | 'restart';
}

export interface DeployProfile {
  id: string;
  name: string;
  description?: string;
  steps: DeployStep[];
}

export interface DeployStepResult {
  stepId: string;
  stepName: string;
  stepType: DeployStepType;
  success: boolean;
  code?: number;
  durationMs: number;
  ignoredError?: boolean;
  error?: string;
}

/** Entrada persistida do histórico de execuções de Perfis de Deploy (mais recente primeiro, limitado a 100). */
export interface DeployProfileHistoryEntry {
  id: string;
  profileId: string;
  profileName: string;
  success: boolean;
  error?: string;
  startedAt: string;
  durationMs: number;
  totalSteps: number;
  aborted?: boolean;
  stepResults: DeployStepResult[];
}

export interface DeployProgressEvent {
  stepId: string;
  stepIndex: number;
  totalSteps: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  durationMs?: number;
  ignoredError?: boolean;
}

export interface PomInfo {
  groupId: string;
  artifactId: string;
  version: string;
  modules: string[];
  suggestedRepoCommand?: string;
  suggestedInstallCommand?: string;
}

/** Entrada persistida do histórico de deploys/builds Karaf (mais recente primeiro, limitado a 200). */
export interface KarafDeployHistoryEntry {
  id: string;
  projectName?: string;
  groupId?: string;
  artifactId?: string;
  version?: string;
  repoUrl: string;
  featureInstall: string;
  success: boolean;
  message?: string;
  startedAt: string;
  durationMs: number;
  trigger: 'ui' | 'mcp';
}

export interface GitProjectInfo {
  name: string;
  path: string;
  currentBranch: string;
  branches: string[];
  remoteUrl?: string;
  isAzure: boolean;
  azureOrg?: string;
  azureProject?: string;
  azureRepo?: string;
  /** Provedor Git detectado a partir da URL do remote "origin". Ausente = provedor não reconhecido. */
  provider?: 'azure' | 'github' | 'gitlab';
  /** Dono/organização do repositório (GitHub/GitLab). Para Azure DevOps use azureOrg/azureProject/azureRepo. */
  owner?: string;
  repo?: string;
  uncommittedCount?: number;
  pomInfo?: PomInfo;
}

/** Status do processo de atualização automática do app (electron-updater / GitHub Releases). */
export type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

export interface RoutineItem {
  id: string;
  name: string;
  module: string;
  fullPath: string;
  sizeMb: string;
  isFavorite: boolean;
}

export interface PathStatusInfo {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  message?: string;
}

export interface SelectFileOptions {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface AppSettings {
  appPath?: string;
  karafPath: string;
  jdkPath?: string;
  karafScript?: string;
  karafUser: string;
  karafPass: string;
  intellijPath: string;
  ideName?: string;
  projectsPath: string;
  targetPrBranch: string;
  favoriteRoutines: string[];
  webPort?: number;
  webPath?: string;
  karafSshPort?: number;
  karafDebugPort?: number;
  monitoredPorts?: MonitoredPortConfig[];
  trackedServices?: TrackedServiceConfig[];
  trackedProcesses?: TrackedProcessConfig[];
  automationDefaults?: EnvironmentAutomationConfig;
  automationProfiles?: AutomationProfile[];
  activeProfileId?: string;
  /** Perfis de deploy (Karaf/Docker/comando genérico) com etapas sequenciais */
  deployProfiles?: DeployProfile[];
  activeDeployProfileId?: string;
  /** Extensões de arquivo reconhecidas como rotina executável no Catálogo de Rotinas (padrão: ['.EXE']) */
  routineFileExtensions?: string[];
  /** Habilita disparo de rotinas desktop via Winthor Start (serviço local DataSnap) */
  winthorStartEnabled?: boolean;
  /** Porta local do Winthor Start (padrão: 9195) */
  winthorStartPort?: number;
  /** URL do portal Winthor Anywhere (WTA) para obtenção de parâmetros de lançamento (padrão: http://localhost:8889) */
  wtaUrl?: string;
  /** Usuário para login automático no WTA (ex: PCADMIN) */
  wtaLogin?: string;
  /** Senha ou hash MD5 da senha do usuário no WTA */
  wtaPassword?: string;
  /** Cookie de sessão ou token do WTA para autenticação automática no lançamento de rotinas (opcional) */
  wtaAuthToken?: string;
  /** Payload de sessão pré-configurado para o Winthor Start (contendo m, u, p, t, s) como fallback permanente */
  winthorStartDefaultPayload?: string;
  /** Mapa de extensão -> caminho de executável launcher, para formatos de rotina que não rodam sozinhos (ex: ".PC" -> caminho de um launcher configurado pelo usuário) */
  routineLauncherMap?: Record<string, string>;
  /** Programas mapeados manualmente pelo usuário para abrir com um clique */
  mappedPrograms?: MappedProgram[];
  /** Caminho do executável pg_dump, quando não estiver no PATH do sistema */
  pgDumpPath?: string;
  /** Caminho do executável expdp, quando não estiver no PATH do sistema */
  expdpPath?: string;
  /** Caminho do executável mysqldump, quando não estiver no PATH do sistema */
  mysqldumpPath?: string;
  /** Caminho do executável psql, usado para restaurar backups PostgreSQL */
  psqlPath?: string;
  /** Caminho do executável impdp, usado para restaurar backups Oracle */
  impdpPath?: string;
  /** Caminho do executável mysql (cliente), usado para restaurar backups MySQL */
  mysqlPath?: string;
  /** Caminho do executável pg_restore, usado para restaurar backups PostgreSQL gerados em formato compactado (-Fc) */
  pgRestorePath?: string;
  /** Pastas de destino de backup configuradas por conexão de banco */
  backupConfigs?: BackupConfig[];
  /** Histórico das últimas execuções de backup/restore (mais recente primeiro), limitado a 200 entradas */
  backupHistory?: BackupHistoryEntry[];
  /** Webhooks notificados a cada backup/restore/restore-drill (sucesso e/ou falha, conforme configurado) */
  backupWebhooks?: BackupWebhookConfig[];
  /** Perfis de conexão com bancos de dados (Oracle, MySQL, PostgreSQL) */
  databaseConnections?: DatabaseConnectionConfig[];
  /** Pastas locais dedicadas de documentação indexadas pelo RAG */
  docFolders?: DocFolderConfig[];
  /** Se verdadeiro, também vasculha e indexa os projetos Git da pasta de projetos. Padrão: false */
  indexProjectsDocs?: boolean;
  /** Se verdadeiro, observa as pastas locais indexadas pelo RAG e reindexa automaticamente quando algum arquivo muda. Padrão: false (opt-in, evita custo de I/O contínuo sem o usuário pedir). */
  autoReindexOnChange?: boolean;
  /** Destinos de API configurados para sincronização agnóstica de documentações vetorizadas */
  docSyncTargets?: DocSyncTargetConfig[];
  /** Espaços do Confluence indexados como fonte adicional de documentação do RAG */
  confluenceSources?: ConfluenceSourceConfig[];
  /** Projetos/JQLs do Jira indexados como fonte adicional de documentação do RAG */
  jiraSources?: JiraSourceConfig[];
  /** Último docker-compose.yml e profile usados na página de Containers, lembrados entre sessões. */
  dockerComposeConfig?: { filePath?: string; profile?: string };
  /** Arquivos de log configurados para acompanhamento em tempo real (Tail) */
  realtimeLogSources?: RealtimeLogSource[];
  activeLogSourceId?: string;
  /** Consultas SQL salvas e personalizadas pelo usuário */
  savedSqlSnippets?: SqlSnippet[];
  /** Histórico das últimas execuções de deploy/build Karaf (mais recente primeiro), limitado a 200 entradas */
  karafDeployHistory?: KarafDeployHistoryEntry[];
  /** Histórico das últimas execuções de Perfis de Deploy (mais recente primeiro), limitado a 100 entradas */
  deployProfileHistory?: DeployProfileHistoryEntry[];
  /** Perfis de ambiente salvos (paths/portas) — ver EnvironmentProfile */
  environmentProfiles?: EnvironmentProfile[];
  /** Id do último perfil de ambiente ativado — só pra destaque na UI, não afeta nenhuma lógica (ativar copia os campos pra cá) */
  activeEnvironmentProfileId?: string;
  /** Provedores de LLM configurados pelo usuário (BYOK - Bring Your Own Key) */
  llmProviders?: LlmProviderConfig[];
  /** ID do provedor de LLM atualmente ativo */
  activeLlmProviderId?: string;
}

export interface DocSyncTargetConfig {
  id: string;
  name: string;
  endpointUrl: string;
  method?: 'POST' | 'PUT';
  authHeader?: string;
  authValue?: string;
  batchSize?: number;
  enabled: boolean;
  /** Modo de sincronização: 'all' (Artigos + Chunks), 'articles' (Apenas Documentos KB), 'chunks' (Apenas Chunks Vetoriais) */
  syncMode?: 'all' | 'articles' | 'chunks';
  lastSyncedAt?: string;
}

/** Webhook genérico notificado a cada backup/restore/restore-drill (mesmo padrão de endpoint+auth header do DocSyncTargetConfig). */
export interface BackupWebhookConfig {
  id: string;
  name: string;
  endpointUrl: string;
  method?: 'POST' | 'PUT';
  authHeader?: string;
  authValue?: string;
  enabled: boolean;
  /** Quais resultados disparam o webhook. Ausente = dispara em sucesso e falha. */
  events?: ('success' | 'failure')[];
  /** Formato do payload. 'generic' = JSON com todos os campos (padrão). Os demais formatam pra
   * caber direto no webhook de entrada nativo de cada plataforma (texto simples). */
  platform?: 'generic' | 'slack' | 'discord' | 'teams';
}

/** Payload enviado ao webhook de backup a cada execução (backup, restore ou restore-drill). */
export interface BackupWebhookPayload {
  connectionName: string;
  action: 'backup' | 'restore' | 'restore-drill';
  trigger: 'manual' | 'scheduled';
  success: boolean;
  message: string;
  filePath?: string;
  sizeBytes?: number;
  durationMs?: number;
  startedAt: string;
}

export interface DocSyncProgress {
  targetId: string;
  targetName: string;
  phase: 'preparing' | 'sending' | 'completed' | 'error';
  sentChunks: number;
  totalChunks: number;
  sentArticles?: number;
  totalArticles?: number;
  currentBatch: number;
  totalBatches: number;
  error?: string;
}

export interface DocSyncResult {
  success: boolean;
  targetId: string;
  targetName: string;
  totalChunksSent: number;
  totalArticlesSent?: number;
  totalBatches: number;
  error?: string;
}

/** Espaço do Confluence (Cloud ou Server/Data Center) indexado como fonte de documentação do RAG. */
export interface ConfluenceSourceConfig {
  id: string;
  name: string;
  /** URL base do Confluence, sem sufixo /wiki (ex: https://empresa.atlassian.net ou https://confluence.empresa.com). */
  baseUrl: string;
  spaceKey?: string;
  /** Token de API (Cloud) ou Personal Access Token (Server/Data Center). Texto plano nas settings, mesmo padrão de authValue em DocSyncTargetConfig — repo não tem criptografia de credenciais. */
  authToken: string;
  /** E-mail associado ao token — presente = Confluence Cloud (Basic auth email:token). Ausente = Server/Data Center (Bearer token). */
  authEmail?: string;
  enabled: boolean;
}

/** Projeto/JQL do Jira indexado como fonte adicional de documentação do RAG (issues viram "documentos"). */
export interface JiraSourceConfig {
  id: string;
  name: string;
  /** URL base do Jira, sem sufixo /rest (ex: https://empresa.atlassian.net ou https://jira.empresa.com). */
  baseUrl: string;
  /** Personal Access Token / API token. Texto plano nas settings, mesmo padrão de authToken em ConfluenceSourceConfig — repo não tem criptografia de credenciais. */
  authToken: string;
  projectKey?: string;
  /** JQL customizado; se ausente, usa "project = <projectKey> ORDER BY updated DESC". */
  jql?: string;
  enabled: boolean;
}

/**
 * Preset dos caminhos/portas de ambiente (projectsPath, karafPath, etc.) — "ativar" um perfil
 * copia esses campos por cima do AppSettings atual, igual aplicar um snapshot. Diferente de
 * AutomationProfile/DeployProfile (perfis de PASSOS de pipeline): este é perfil de AMBIENTE
 * (onde as coisas estão), útil pra quem alterna entre múltiplos clientes/setups na mesma máquina.
 */
export interface EnvironmentProfile {
  id: string;
  label: string;
  projectsPath?: string;
  karafPath?: string;
  jdkPath?: string;
  intellijPath?: string;
  appPath?: string;
  webPort?: number;
  karafSshPort?: number;
  karafDebugPort?: number;
  monitoredPorts?: MonitoredPortConfig[];
}

export interface DocFolderConfig {
  path: string;
  label?: string;
}

export interface DocChunk {
  id: string;
  /** Id estável da fonte que originou o chunk (ex: caminho do projeto git, "local-folder:C:\Docs") */
  sourceId: string;
  /** Rótulo exibido na UI/filtros (nome do projeto, ou o rótulo configurado da pasta) */
  sourceLabel: string;
  /** Id do item dentro da fonte — para fontes locais é o caminho absoluto do arquivo */
  entryId: string;
  /** Nome legível do item (caminho relativo à raiz da fonte) */
  entryTitle: string;
  chunkIndex: number;
  text: string;
  mtimeMs: number;
}

export interface DocSearchResult {
  chunk: DocChunk;
  score: number;
}

export type DocsIndexPhase = 'loading-model' | 'scanning' | 'embedding' | 'saving' | 'done';

export interface DocsIndexProgress {
  phase: DocsIndexPhase;
  current: number;
  total: number;
  currentFile?: string;
}

export interface DocFileInfo {
  id: string;
  title: string;
  sourceLabel: string;
  chunkCount: number;
}

export interface DocsIndexStatus {
  totalChunks: number;
  totalFiles: number;
  totalSources: number;
  sourceLabels: string[];
  lastIndexedAt?: string;
  modelDownloaded: boolean;
  isTextOnly?: boolean;
  files?: DocFileInfo[];
}

export interface MappedProgram {
  id: string;
  name: string;
  fullPath: string;
}

export interface IdeInfo {
  name: string;
  shortName: string;
  exeName: string;
  iconType: 'intellij' | 'vscode' | 'cursor' | 'eclipse' | 'code';
}

/**
 * Identifica o nome amigável e tipo da IDE a partir do executável (.exe) ou de rótulo customizado.
 */
export function detectIdeInfo(targetPath?: string, customName?: string): IdeInfo {
  if (customName && customName.trim()) {
    const trimmed = customName.trim();
    const exe = targetPath ? targetPath.split(/[\\/]/).pop() || 'IDE.exe' : 'IDE.exe';
    return {
      name: trimmed,
      shortName: trimmed.length > 14 ? trimmed.slice(0, 12) + '...' : trimmed,
      exeName: exe,
      iconType: trimmed.toLowerCase().includes('code')
        ? 'vscode'
        : trimmed.toLowerCase().includes('cursor')
        ? 'cursor'
        : trimmed.toLowerCase().includes('intellij') || trimmed.toLowerCase().includes('idea')
        ? 'intellij'
        : 'code'
    };
  }

  if (!targetPath || targetPath.trim() === '') {
    return {
      name: 'IDE / Editor',
      shortName: 'IDE',
      exeName: 'idea64.exe',
      iconType: 'code'
    };
  }

  const normalized = targetPath.toLowerCase().replace(/\\/g, '/');
  const exe = targetPath.split(/[\\/]/).pop() || '';
  const exeLower = exe.toLowerCase();

  // IntelliJ IDEA e JetBrains IDEs
  if (exeLower.includes('idea') || normalized.includes('intellij')) {
    return {
      name: 'IntelliJ IDEA',
      shortName: 'IntelliJ',
      exeName: exe || 'idea64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower === 'code.exe' || normalized.includes('vs code') || normalized.includes('vscode')) {
    return {
      name: 'Visual Studio Code',
      shortName: 'VS Code',
      exeName: exe || 'Code.exe',
      iconType: 'vscode'
    };
  }
  if (exeLower === 'cursor.exe' || normalized.includes('cursor')) {
    return {
      name: 'Cursor',
      shortName: 'Cursor',
      exeName: exe || 'Cursor.exe',
      iconType: 'cursor'
    };
  }
  if (exeLower.includes('eclipse') || normalized.includes('eclipse')) {
    return {
      name: 'Eclipse IDE',
      shortName: 'Eclipse',
      exeName: exe || 'eclipse.exe',
      iconType: 'eclipse'
    };
  }
  if (exeLower.includes('netbeans')) {
    return {
      name: 'Apache NetBeans',
      shortName: 'NetBeans',
      exeName: exe || 'netbeans64.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('pycharm')) {
    return {
      name: 'PyCharm',
      shortName: 'PyCharm',
      exeName: exe || 'pycharm64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('webstorm')) {
    return {
      name: 'WebStorm',
      shortName: 'WebStorm',
      exeName: exe || 'webstorm64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('rider')) {
    return {
      name: 'JetBrains Rider',
      shortName: 'Rider',
      exeName: exe || 'rider64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('fleet')) {
    return {
      name: 'JetBrains Fleet',
      shortName: 'Fleet',
      exeName: exe || 'fleet.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('sublime')) {
    return {
      name: 'Sublime Text',
      shortName: 'Sublime',
      exeName: exe || 'sublime_text.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('notepad++')) {
    return {
      name: 'Notepad++',
      shortName: 'Notepad++',
      exeName: exe || 'notepad++.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('devenv')) {
    return {
      name: 'Visual Studio',
      shortName: 'Visual Studio',
      exeName: exe || 'devenv.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('studio64')) {
    return {
      name: 'Android Studio',
      shortName: 'Android Studio',
      exeName: exe || 'studio64.exe',
      iconType: 'intellij'
    };
  }

  // Derivar do nome do executável
  const baseName = exe.replace(/\.exe$/i, '');
  if (baseName) {
    const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    return {
      name: formatted,
      shortName: formatted.length > 14 ? formatted.slice(0, 12) + '...' : formatted,
      exeName: exe,
      iconType: 'code'
    };
  }

  return {
    name: 'IDE / Editor',
    shortName: 'IDE',
    exeName: exe || 'editor.exe',
    iconType: 'code'
  };
}

export interface SystemAppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  v8Version: string;
  osPlatform: string;
  osRelease: string;
  osArch: string;
  osHostname: string;
  totalMemoryMb: number;
  freeMemoryMb: number;
  configPath: string;
  isAdmin: boolean;
  isFirstRun?: boolean;
}

/**
 * Obtém a porta HTTP/Web do Portal Local de forma dinâmica.
 * Prioridade: settings.webPort -> primeira porta monitorada rotulada como Web/HTTP/Portal -> 8889.
 */
export function getWebPort(
  settings?: AppSettings | null,
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): number {
  const custom = settings?.webPort;
  if (custom && Number(custom) > 0) {
    return Number(custom);
  }
  const ports = monitoredPorts || settings?.monitoredPorts;
  if (ports && Array.isArray(ports) && ports.length > 0) {
    const web = ports.find(
      (p) =>
        p &&
        (p as any).enabled !== false &&
        typeof p.label === 'string' &&
        (p.label.toLowerCase().includes('web') ||
          p.label.toLowerCase().includes('http') ||
          p.label.toLowerCase().includes('portal'))
    );
    if (web && web.port > 0) return Number(web.port);
  }
  return 8889;
}

/**
 * Obtém a porta SSH do Karaf (usada no client.bat) de forma dinâmica.
 * Prioridade: settings.karafSshPort -> primeira porta monitorada rotulada como SSH/client.bat -> 8101.
 */
export function getKarafSshPort(
  settings?: AppSettings | null,
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): number {
  if (settings?.karafSshPort && Number(settings.karafSshPort) > 0) {
    return Number(settings.karafSshPort);
  }
  const ports = monitoredPorts || settings?.monitoredPorts;
  if (ports && Array.isArray(ports) && ports.length > 0) {
    const ssh = ports.find(
      (p) =>
        p &&
        (p as any).enabled !== false &&
        typeof p.label === 'string' &&
        (p.label.toLowerCase().includes('ssh') || p.label.toLowerCase().includes('client'))
    );
    if (ssh && ssh.port > 0) return Number(ssh.port);
  }
  return 8101;
}

/**
 * Monta a URL dinâmica do Portal Web Local (ex: http://localhost:8889/web)
 */
export function getWebUrl(
  settings?: AppSettings | null,
  subPath: string = '',
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): string {
  const port = getWebPort(settings, monitoredPorts);
  const targetPath = subPath ? subPath : (settings?.webPath || '');
  const normalized = targetPath ? (targetPath.startsWith('/') ? targetPath : `/${targetPath}`) : '';
  return `http://localhost:${port}${normalized}`;
}

// ==========================================
// Módulo de Banco de Dados (Oracle, MySQL, Postgres)
// ==========================================

export type DatabaseType = 'oracle' | 'mysql' | 'postgres';

export interface DatabaseConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  /** Para Oracle: se a conexão deve usar Service Name (ex: 'XEPDB1') ou SID (padrão: serviceName) */
  oracleMode?: 'serviceName' | 'sid';
  /** Para Oracle: caminho do diretório do Oracle Instant Client (Thick mode, ex: 'C:\oracle\instantclient_19_25') */
  oracleClientPath?: string;
  /** Para Oracle: força uso do Thick Mode com Oracle Instant Client (necessário para Oracle 11g e anteriores) */
  oracleThickMode?: boolean;
  /** Flag para SSL/TLS (PostgreSQL e MySQL) */
  ssl?: boolean;
  isDefault?: boolean;
}

/** Configuração de backup persistida por conexão (pasta de destino, agendamento e retenção). */
export interface BackupConfig {
  connectionId: string;
  destinationFolder: string;
  /** Expressão cron (ex: "0 2 * * *" = todo dia às 02:00). Vazio/ausente = só backup manual. */
  cronExpression?: string;
  /** Se o agendamento está ativo. Ignorado quando cronExpression não está definido. */
  enabled?: boolean;
  /** Quantidade de backups a manter na pasta; os mais antigos são apagados após cada execução. Ausente = mantém todos. */
  retentionCount?: number;
  /** Apaga backups com mais de N dias após cada execução, independente da contagem. Ausente = sem limite de idade. */
  retentionDays?: number;
  /** Se verdadeiro, gera o backup em formato compactado (pg_dump -Fc / mysqldump+gzip / expdp compression=ALL). */
  compress?: boolean;
  /** Nome do objeto DIRECTORY do Oracle usado pelo expdp (padrão: DATA_PUMP_DIR). Ignorado para outros tipos de banco. */
  oracleDirectory?: string;
  /** Se o backup desta conexão deve executar via comando customizado em vez do comando padrão. */
  useCustomCommand?: boolean;
  /** Template do comando customizado a ser executado para esta conexão (requer placeholder {filePath}). */
  customCommand?: string;
  lastRunAt?: string;
  lastSuccess?: boolean;
  lastMessage?: string;
  /** Expressão cron do restore drill periódico (testa o backup mais recente contra a conexão scratch). Ausente = sem drill agendado. */
  restoreDrillCronExpression?: string;
  /** Se o agendamento de drill está ativo. Ignorado quando restoreDrillCronExpression não está definido. */
  restoreDrillEnabled?: boolean;
  /** Id da conexão "descartável" usada como destino do restore drill — nunca a própria conexão de origem. */
  restoreDrillScratchConnectionId?: string;
}

/** Registro histórico de uma execução de backup ou restauração (persistido além do último status por conexão). */
export interface BackupHistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  action: 'backup' | 'restore' | 'restore-drill';
  trigger: 'manual' | 'scheduled';
  success: boolean;
  message: string;
  filePath?: string;
  sizeBytes?: number;
  durationMs?: number;
  startedAt: string;
  /** SHA-256 do arquivo de backup, calculado quando disponível (backup e restore-drill). */
  checksumSha256?: string;
}

/** Resultado de uma execução de backup (manual). */
export interface BackupResult {
  success: boolean;
  message: string;
  filePath?: string;
  sizeBytes?: number;
  durationMs?: number;
  /** SHA-256 do arquivo gerado, calculado após o dump (usado por histórico e restore-drill). */
  checksumSha256?: string;
}

/** Metadados de um arquivo de backup já existente na pasta de destino. */
export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SqlBindParam {
  name: string;
  value: any;
  type?: 'auto' | 'string' | 'number' | 'date' | 'null';
}

export interface QueryRequest {
  connectionId: string;
  sql: string;
  maxRows?: number;
  binds?: Record<string, any>;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  affectedRows?: number;
  executionTimeMs: number;
  isQuery: boolean;
  error?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  type?: string;
}

export interface TableColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  length?: number | string;
  defaultValue?: string;
}

// ==========================================
// Módulo de Gerenciamento de Containers (Docker / Podman)
// ==========================================

export type ContainerEngineType = 'docker' | 'podman' | 'containerd' | 'unknown';

export interface DockerContainerInfo {
  id: string;
  names: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead' | 'unknown';
  status: string;
  ports: string;
  created: string;
}

export interface WslDistroInfo {
  name: string;
  state: 'Running' | 'Stopped';
  version: number;
  isDefault: boolean;
  hasDocker?: boolean;
}

export interface ContainerEnvironmentSlot {
  id: string;
  name: string;
  delay?: number;
}

export interface ContainerEnvironment {
  id: string;
  name: string;
  color?: string;
  wslDistro?: string;
  containers: (string | ContainerEnvironmentSlot)[];
  delays?: Record<string, number>;
}

export interface DockerDaemonStatus {
  installed: boolean;
  running: boolean;
  engine?: ContainerEngineType;
  version?: string;
  error?: string;
  isWsl?: boolean;
  wslDistro?: string;
  wslIp?: string | null;
  availableDistros?: WslDistroInfo[];
}

export interface DockerContainerStats {
  id: string;
  name?: string;
  cpu: string;
  mem: string;
  memPerc: string;
  netIO: string;
}

export interface ComposeServiceStatus {
  name: string;
  state: string;
  health?: string;
  ports?: string[];
}

export interface DockerContainerMount {
  type: string;
  name?: string;
  source: string;
  destination: string;
  driver?: string;
  mode: string;
  rw: boolean;
  propagation?: string;
}

export interface DockerContainerPortBinding {
  hostIp: string;
  hostPort: string;
}

export interface DockerContainerInspect {
  id: string;
  name: string;
  image: string;
  imageId?: string;
  created: string;
  path?: string;
  args?: string[];
  state: {
    status: string;
    running: boolean;
    paused: boolean;
    restarting: boolean;
    oomKilled?: boolean;
    dead?: boolean;
    pid?: number;
    exitCode: number;
    error?: string;
    startedAt: string;
    finishedAt: string;
    health?: {
      status: string;
      failingStreak?: number;
    };
  };
  networkSettings: {
    ipAddress: string;
    gateway: string;
    macAddress: string;
    ports: Record<string, DockerContainerPortBinding[] | null>;
    networks?: Record<string, { ipAddress: string; gateway: string }>;
  };
  mounts: DockerContainerMount[];
  env: string[];
  command?: string;
  entrypoint?: string[];
  cmd?: string[];
  platform?: string;
  workingDir?: string;
  restartPolicy?: {
    name: string;
    maximumRetryCount?: number;
  };
}

export interface WslActionResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}

// Aliases semânticos para compatibilidade genérica de containers
export type ContainerInfo = DockerContainerInfo;
export type ContainerDaemonStatus = DockerDaemonStatus;
export type ContainerStats = DockerContainerStats;
export type ContainerInspect = DockerContainerInspect;

export interface OracleMaintenanceResult {
  success: boolean;
  output: string;
  exitCode?: number;
  error?: string;
}

export interface OracleDataPumpParams {
  containerName: string;
  user?: string;
  password?: string;
  dumpfile: string;
  schemaOrig: string;
  schemaDest?: string;
  codclipc: string;
}

export interface WslDumpFileInfo {
  name: string;
  size: number;
  formattedSize: string;
  mtime?: string;
}

export interface WshPrerequisiteStatus {
  file: string;
  label: string;
  required: boolean;
  exists: boolean;
  size?: number;
  formattedSize?: string;
  description: string;
}

export interface WslSnapshotFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
}

export interface WslSnapshotActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface InfrDockerScriptStatus {
  script: string;
  name: string;
  path: string;
  exists: boolean;
  type: 'oracle' | 'wta' | 'wsh';
  description: string;
}


// ==========================================
// Módulo de Rede & IPs (Local e WSL)
// ==========================================

export interface NetworkInterfaceItem {
  interface: string;
  ip: string;
  mac?: string;
  type?: string;
}

export interface NetworkIpInfo {
  primaryLocalIp: string;
  localIps: NetworkInterfaceItem[];
  wslIp: string | null;
  hostname: string;
}

// ==========================================
// Explain Plan & SQL Snippets
// ==========================================

export interface ExplainPlanResult {
  success: boolean;
  planLines: string[];
  executionTimeMs: number;
  error?: string;
}

export interface SqlSnippet {
  id: string;
  title: string;
  category: string;
  description?: string;
  sql: string;
  dbType?: DatabaseType | 'all';
}

// ==========================================
// Karaf Bundles & Maven Build
// ==========================================

export interface KarafBundleInfo {
  id: string;
  state: 'Active' | 'Resolved' | 'Installed' | 'Starting' | 'Stopping' | 'Unknown';
  blueprint?: string;
  level?: string;
  name: string;
  version: string;
  symbolicName?: string;
  location?: string;
  updateUrl?: string;
}

export interface KarafBundleDependent {
  id: string;
  name: string;
  version?: string;
  state?: string;
  reason: string;
}

export interface KarafBundleDetails {
  id: string;
  name: string;
  symbolicName?: string;
  version: string;
  state: string;
  location?: string;
  exportedPackages: string[];
  importedPackages: string[];
  requiredBundles: string[];
  dependentBundles: KarafBundleDependent[];
  unresolvedRequirements?: string[];
  rawHeaders?: Record<string, string>;
  diag?: string;
}

export interface BundleDependencyCheckResult {
  bundleId?: string;
  targetUrl?: string;
  targetVersion?: string;
  name?: string;
  symbolicName?: string;
  alreadyInstalled: boolean;
  existingBundle?: KarafBundleInfo;
  dependentBundles: KarafBundleDependent[];
  exportedPackages: string[];
  missingDependencies?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  warningMessage?: string;
  canProceed: boolean;
}

export interface InstallBundleRequest {
  location: string;
  version?: string;
  startImmediately?: boolean;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface ReinstallBundleRequest {
  bundleId: string;
  location?: string;
  projectPath?: string;
  rebuild?: boolean;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface UpdateBundleVersionRequest {
  bundleId: string;
  newVersionOrLocation: string;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface MavenBuildRequest {
  projectPath: string;
  goals?: string[];
  skipTests?: boolean;
}

export interface BundleSnapshotItem {
  id: string;
  name: string;
  version: string;
  state: string;
  symbolicName?: string;
  location?: string;
}

export interface BundleSnapshot {
  id: string;
  label: string;
  createdAt: string;
  bundleCount: number;
  bundles: BundleSnapshotItem[];
}

export interface BundleSnapshotDiff {
  unchanged: BundleSnapshotItem[];
  versionChanged: {
    snapshot: BundleSnapshotItem;
    current: KarafBundleInfo;
  }[];
  stateChanged: {
    snapshot: BundleSnapshotItem;
    current: KarafBundleInfo;
  }[];
  added: KarafBundleInfo[];
  removed: BundleSnapshotItem[];
}

// ==========================================
// Git Commits & Branching
// ==========================================

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'copied';
  staged: boolean;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  files: string[];
  error?: string;
}

// ==========================================
// Observabilidade & Métricas do Sistema
// ==========================================

export interface SystemMetrics {
  cpuUsagePercent: number;
  totalMemMb: number;
  freeMemMb: number;
  usedMemMb: number;
  memUsagePercent: number;
  uptimeSeconds: number;
  // Aliases de compatibilidade
  totalMemoryMb?: number;
  freeMemoryMb?: number;
  usedMemoryMb?: number;
  memoryUsagePercent?: number;
}

export interface HttpHealthResult {
  url: string;
  reachable: boolean;
  isHealthy?: boolean;
  status?: number;
  statusCode?: number;
  statusText?: string;
  timeMs: number;
  responseTimeMs?: number;
  error?: string;
}

// ==========================================
// Monitoramento de Logs em Tempo Real (Tail -f)
// ==========================================

export interface RealtimeLogSource {
  id: string;
  name: string;
  filePath: string;
  encoding?: 'utf-8' | 'latin1' | 'windows-1252';
  enabled?: boolean;
  description?: string;
}

export interface LogWatchStatus {
  sourceId: string;
  filePath: string;
  exists: boolean;
  fileSizeBytes: number;
  lastModified?: string;
  watching: boolean;
  error?: string;
}

export interface LogChunkEvent {
  sourceId: string;
  filePath: string;
  lines: string[];
  truncatedOrRotated?: boolean;
  timestamp: string;
}

// ==========================================
// Provedor de LLM Próprio (BYOK - Bring Your Own Key)
// ==========================================

export type LlmProviderType = 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'openrouter' | 'custom';

/** Configuração de um provedor de LLM (BYOK). Templates de Groq/DeepSeek usam provider: 'openai'
 *  com baseUrl fixo (https://api.groq.com/openai/v1, https://api.deepseek.com), pois ambos
 *  implementam o protocolo OpenAI-compatible — não são um LlmProviderType próprio. */
export interface LlmProviderConfig {
  id: string;
  name: string;
  provider: LlmProviderType;
  /** Texto plano — mesmo padrão de karafPass/authToken no repo (sem safeStorage). Ver débito técnico. */
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** Timeout em ms para a chamada HTTP (evita travar o main process com Ollama/rede lenta). Padrão: 30000. */
  timeoutMs?: number;
  systemPrompt?: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatRequest {
  providerId?: string;
  messages: LlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatResponse {
  text: string;
  provider: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface LlmTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface LlmRagQueryRequest {
  query: string;
  topK?: number;
  sourceLabel?: string;
  systemInstruction?: string;
}

export interface LlmRagQueryResponse {
  answer: string;
  sources: Array<{ title: string; path: string; score: number }>;
}

export const DEFAULT_LLM_PROVIDER_TEMPLATES: Omit<LlmProviderConfig, 'id'>[] = [
  {
    name: 'OpenAI',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'Google Gemini',
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'Anthropic Claude',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'Groq',
    provider: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'DeepSeek',
    provider: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'OpenRouter',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  },
  {
    name: 'Ollama Local',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  }
];


