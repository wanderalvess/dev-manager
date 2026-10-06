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

export interface OsgiResolutionDiagnosticSummary {
  failingBundle: string;
  missingItem: string;
  requirementType: 'package' | 'bundle' | 'service' | 'identity' | 'generic';
  versionRangeDesc?: string;
  matchedPomDependency?: {
    groupId: string;
    artifactId: string;
    version: string;
  };
  matchedProfileName?: string;
  matchedProfileId?: string;
  matchedProjectName?: string;
  matchedProjectPath?: string;
  suggestedKarafCommands?: {
    repoAddCommand?: string;
    installCommand?: string;
    diagnosticCommand?: string;
  };
  versionMismatchWarning?: string;
  formattedBanner?: string;
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
  resolutionDiagnostic?: OsgiResolutionDiagnosticSummary;
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
  resolutionDiagnostic?: OsgiResolutionDiagnosticSummary;
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
  /** Branches conhecidas do remote "origin" (refs/remotes/origin/*), atualizadas a cada fetch. */
  remoteBranches?: string[];
  /** HEAD aponta para um commit, não para uma branch; currentBranch traz o hash abreviado. */
  detachedHead?: boolean;
  /** URL do remote "origin" sem credenciais embutidas. */
  remoteUrl?: string;
  /** Página do repositório no provedor, quando dedutível a partir do remote. */
  webUrl?: string;
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
  fileVersion?: string;
  productVersion?: string;
}

export interface ExecutableVersionInfo {
  fileVersion?: string;
  productVersion?: string;
  companyName?: string;
  fileDescription?: string;
  legalCopyright?: string;
  originalFilename?: string;
  internalName?: string;
  productName?: string;
}

export interface RoutineBackupEntry {
  fileName: string;
  fullPath: string;
  routineName: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  timestampFormatted: string;
  fileVersion?: string;
  productVersion?: string;
  isPreRollback?: boolean;
  // Aliases / campos opcionais para componentes de UI
  backupFilePath?: string;
  backupPath?: string;
  targetRoutinePath?: string;
  targetPath?: string;
  dateFormatted?: string;
  version?: {
    fileVersion?: string;
    productVersion?: string;
  };
}

export interface RoutineRollbackResult {
  success: boolean;
  message: string;
  restoredFromBackup: string;
  targetRoutinePath: string;
  preRollbackBackupPath?: string;
  restoredVersion?: string | { fileVersion?: string; productVersion?: string };
  error?: string;
}

export type BatchRoutineTargetType = 'favorites' | 'module' | 'custom';

export interface BatchRoutineDownloadRequest {
  targetType: BatchRoutineTargetType;
  module?: string;
  moduleFolder?: string;
  routineCodesOrNames?: string[];
  routineCodes?: string[];
  winthorVersion?: string;
  backupExisting?: boolean;
}

export interface BatchRoutineItemProgress {
  routine: string;
  routineCode?: string;
  routineCodeOrName?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';
  installedPath?: string;
  backupPath?: string;
  fileSizeBytes?: number;
  fileVersion?: string;
  error?: string;
  message?: string;
}

export interface BatchRoutineDownloadResult {
  success: boolean;
  total: number;
  totalRoutines?: number;
  completed: number;
  successfulDownloads?: number;
  failed: number;
  failedDownloads?: number;
  skipped: number;
  results: BatchRoutineItemProgress[];
  durationMs: number;
  message: string;
}

export interface RoutineLaunchResult {
  success: boolean;
  message?: string;
  error?: string;
  karafOffline?: boolean;
  authFailed?: boolean;
  winthorStartOffline?: boolean;
  fallbackDirect?: boolean;
}

export interface RoutineDownloadRequest {
  routineCodeOrName: string;
  winthorVersion?: string;
  targetModule?: string;
  backupExisting?: boolean;
  customDownloadUrl?: string;
  authCookie?: string;
}

export interface RoutineDownloadResult {
  success: boolean;
  message: string;
  error?: string;
  routineName?: string;
  routineCode?: string;
  installedPath?: string;
  backupPath?: string;
  fileSizeBytes?: number;
  extractedFiles?: string[];
  winthorVersion?: string;
}

export interface CcwCatalogItem {
  id: number;
  rotina: string;
  modulo: number;
  moduloDesc: string;
  versaoCorrente?: string;
  versaoAnterior?: string;
  versaoNova?: string;
  dataPublicacao?: string;
  downloadUrl?: string;
}

export interface CcwCatalogResponse {
  success: boolean;
  authenticated: boolean;
  items: CcwCatalogItem[];
  error?: string;
  message?: string;
}

export interface KarafWtaStatusResult {
  online: boolean;
  wtaUrl: string;
  isEmbedded?: boolean;
  message: string;
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
  /** Ambiente de execução do Apache Karaf ('local' | 'wsl'). Padrão: 'local' */
  karafEnvironment?: 'local' | 'wsl';
  /** Nome da distribuição WSL onde o Karaf está instalado (ex: 'Ubuntu', 'Debian'). Usado quando karafEnvironment === 'wsl' */
  karafWslDistro?: string;
  jdkPath?: string;
  karafScript?: string;
  karafUser: string;
  karafPass: string;
  /** Indicador se a senha do Karaf já está salva de forma segura (quando karafPass trafega sanitizado). */
  hasKarafPass?: boolean;
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
  /** URL da API da Rotina 801 (ferramenta-servidor) no Karaf (padrão: http://localhost:8889 ou a wtaUrl configurada) */
  routine801Url?: string;
  /** Porta do receptor OTLP/HTTP do APM (padrão 4318); o Karaf iniciado pelo app exporta traces para ela */
  apmReceiverPort?: number;
  /** Nome de serviço (`otel.service.name`) anexado pelo agente Java do APM (padrão: karaf-app) */
  apmServiceName?: string;
  /** Anexa o agente OpenTelemetry automaticamente ao iniciar o Karaf pelo Cockpit (padrão: desligado, para não poluir o log quando a telemetria não é usada) */
  apmInstrumentationEnabled?: boolean;
  /** Usuário para login automático no WTA (ex: PCADMIN) */
  wtaLogin?: string;
  /** Senha ou hash MD5 da senha do usuário no WTA */
  wtaPassword?: string;
  /** Indicador de que a senha do WTA já está salva (wtaPassword trafega vazio quando sanitizado). */
  hasWtaPassword?: boolean;
  /** Cookie de sessão ou token do WTA para autenticação automática no lançamento de rotinas (opcional) */
  wtaAuthToken?: string;
  /** Indicador de que o cookie do WTA já está salvo (wtaAuthToken trafega vazio quando sanitizado). */
  hasWtaAuthToken?: boolean;
  /** Payload de sessão pré-configurado para o Winthor Start (contendo m, u, p, t, s) como fallback permanente */
  winthorStartDefaultPayload?: string;
  /** URL base da Central de Controle WinThor (CCW) (padrão: https://centraldecontrole.pcinformatica.com.br) */
  ccwBaseUrl?: string;
  /** Versão major padrão do WinThor para download de rotinas na CCW (padrão: "30") */
  ccwWinthorVersion?: string;
  /** Cookie de sessão / autenticação da Central de Controle para consulta de catálogo (opcional, criptografado em repouso) */
  ccwAuthCookie?: string;
  /** Mapa de extensão -> caminho de executável launcher, para formatos de rotina que não rodam sozinhos (ex: ".PC" -> caminho de um launcher configurado pelo usuário) */
  routineLauncherMap?: Record<string, string>;
  /** Caminho do arquivo tnsnames.ora de configuração de rede do Oracle (ex: C:\oracle\product\11.2.0\dbhome_1\network\admin\tnsnames.ora) */
  oracleTnsnamesPath?: string;
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
  /** Personal Access Token (PAT) do Azure DevOps para consulta de Work Items e automação de branches (criptografado em repouso) */
  azureDevOpsToken?: string;
  /** Fontes externas de qualidade e testes (Zephyr Scale, Zephyr Squad, Jira, Azure Test Plans) */
  qualitySources?: QualitySourceConfig[];
  /** ID da fonte de qualidade ativa */
  activeQualitySourceId?: string;
  /** Caminho customizado para os templates de regressivo QA (opcional) */
  qaTemplatesDir?: string;
  /** Caminho local do projeto de automação TAUT / Cypress (ex: C:\Projetos\TAUT-Mississauga) */
  tautProjectPath?: string;
  /** Prefixo das chaves de cenário Zephyr do projeto TAUT (ex: PROJ-T). Vazio = aceita qualquer ABC-T123 */
  tautKeyPrefix?: string;
  /** Suítes e runners de testes automatizados configurados (Maven, Playwright, Cypress, Newman) */
  testRunners?: TestRunnerConfig[];
  /** Histórico das últimas execuções de testes automatizados (limitado a 100) */
  testExecutionHistory?: TestExecutionResult[];
}

export interface DocSyncTargetConfig {
  id: string;
  name: string;
  endpointUrl: string;
  method?: 'POST' | 'PUT';
  authHeader?: string;
  /** Criptografado em repouso (AES-256-GCM, ver ConfigService.encryptSecretsForDisk); trafega em texto plano no IPC/REST/MCP local. */
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
  /** Criptografado em repouso (AES-256-GCM, ver ConfigService.encryptSecretsForDisk); trafega em texto plano no IPC/REST/MCP local. */
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
  /** Token de API (Cloud) ou Personal Access Token (Server/Data Center). Criptografado em repouso (AES-256-GCM, ver ConfigService.encryptSecretsForDisk); trafega em texto plano no IPC/REST/MCP local. */
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
  /** Personal Access Token / API token. Criptografado em repouso (AES-256-GCM, ver ConfigService.encryptSecretsForDisk); trafega em texto plano no IPC/REST/MCP local. */
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
  /** true apenas na primeiríssima execução após instalação (nunca existiu marcador de versão) */
  isFirstRun?: boolean;
  /** true quando o app foi atualizado para uma versão nova (marcador existia, mas com versão diferente) */
  isAppUpdated?: boolean;
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

export interface OracleTnsEntry {
  alias: string;
  host?: string;
  port?: number;
  serviceName?: string;
  sid?: string;
  oracleMode: 'serviceName' | 'sid';
  protocol?: string;
  server?: string;
}

export interface ParseTnsNamesResult {
  success: boolean;
  filePath?: string;
  entries: OracleTnsEntry[];
  error?: string;
}

export interface DatabaseConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  /** Indicador retornado pela API informando se a senha já está salva de forma segura (quando password trafega sanitizado). */
  hasPassword?: boolean;
  /** Para Oracle: se a conexão deve usar Service Name (ex: 'XEPDB1') ou SID (padrão: serviceName) */
  oracleMode?: 'serviceName' | 'sid';
  /** Para Oracle: caminho do diretório do Oracle Instant Client (Thick mode, ex: 'C:\oracle\instantclient_19_25') */
  oracleClientPath?: string;
  /** Para Oracle: força uso do Thick Mode com Oracle Instant Client (necessário para Oracle 11g e anteriores) */
  oracleThickMode?: boolean;
  /** Para Oracle: alias TNS de onde a conexão foi carregada a partir do tnsnames.ora (opcional) */
  tnsAlias?: string;
  /** Flag para SSL/TLS (PostgreSQL e MySQL) */
  ssl?: boolean;
  isDefault?: boolean;
  /** Conexão de produção: o editor SQL começa em modo manual de commit e destaca o ambiente. */
  isProduction?: boolean;
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
  /** O resultado atingiu o limite de linhas: existem mais linhas no banco do que as retornadas. */
  truncated?: boolean;
  error?: string;
}

export type DbObjectType =
  | 'TABLE'
  | 'VIEW'
  | 'MATERIALIZED VIEW'
  | 'PROCEDURE'
  | 'FUNCTION'
  | 'PACKAGE'
  | 'PACKAGE BODY'
  | 'SEQUENCE'
  | 'TRIGGER'
  | 'SYNONYM'
  | 'TYPE'
  | 'TYPE BODY'
  | 'INDEX';

export interface DbObjectInfo {
  name: string;
  type: DbObjectType;
  /** Oracle: objetos INVALID precisam ser recompilados. */
  status: 'VALID' | 'INVALID';
}

export type TableConstraintKind = 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'OTHER';

export interface TableColumnDetail {
  position: number;
  name: string;
  /** Tipo já formatado (ex.: VARCHAR2(30), NUMBER(10,2), numeric(12,4)). */
  type: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey: boolean;
}

export interface TableConstraintDetail {
  name: string;
  kind: TableConstraintKind;
  columns: string[];
  /** Chave estrangeira: tabela e colunas referenciadas. */
  refTable?: string;
  refColumns?: string[];
  onDelete?: string;
  /** CHECK: expressão. */
  condition?: string;
  status?: string;
  /** Definição pronta do banco (PostgreSQL), quando as colunas não bastam para descrever. */
  definition?: string;
}

export interface TableIndexDetail {
  name: string;
  unique: boolean;
  primary?: boolean;
  type?: string;
  columns: string[];
  status?: string;
  definition?: string;
}

export interface TableTriggerDetail {
  name: string;
  event: string;
  timing?: string;
  status?: string;
  definition?: string;
}

/** Especificação completa de uma tabela ou view: o que o "Descrever tabela" mostra. */
export interface TableDetails {
  success: boolean;
  error?: string;
  name: string;
  owner?: string;
  objectType: string;
  comment?: string;
  rowCountEstimate?: number;
  lastAnalyzed?: string;
  columns: TableColumnDetail[];
  constraints: TableConstraintDetail[];
  indexes: TableIndexDetail[];
  triggers: TableTriggerDetail[];
}

export interface ObjectDdlResult {
  success: boolean;
  ddl?: string;
  error?: string;
}

/** Estado de uma sessão dedicada do editor SQL (conexão própria, com controle de transação). */
export interface DbSessionState {
  sessionId: string;
  dbType: DatabaseType;
  autoCommit: boolean;
  /** Comandos que alteram dados executados desde o último commit/rollback (só no modo manual). */
  pendingStatements: number;
  /** Soma das linhas afetadas por esses comandos. */
  pendingRows: number;
  running: boolean;
}

/** Resultado de uma execução em sessão: o resultado normal mais o estado da transação depois dele. */
export type DbSessionQueryResult = QueryResult & { session: DbSessionState };

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

/**
 * Filtros aceitos pelo Statement Tracer do Oracle (v$session/v$sql). Todos opcionais —
 * sem filtro nenhum, retorna tudo que a query base já limita via `limit`.
 */
export interface OracleTracerFilter {
  schemaFilter?: string;
  textFilter?: string;
  limit?: number;
}

/** Parâmetro / variável de bind capturado pelo Oracle (v$sql_bind_capture). */
export interface OracleCapturedBind {
  sqlId?: string;
  name: string;
  position: number;
  datatype?: string | null;
  value: string | null;
  lastCaptured?: string | null;
}

export interface OracleStatementBindsResult {
  success: boolean;
  sqlId: string;
  binds: OracleCapturedBind[];
  interpolatedSql?: string;
  executionTimeMs: number;
  error?: string;
}

/** Uma sessão conectada ao Oracle e a instrução SQL atual/última que ela executou. */
export interface OracleActiveSession {
  sid: number;
  serialNum: number;
  username: string | null;
  program: string | null;
  machine: string | null;
  module: string | null;
  action: string | null;
  clientIdentifier: string | null;
  status: string | null;
  lastCallEt: number | null;
  sqlId: string | null;
  sqlText: string | null;
  binds?: OracleCapturedBind[];
  interpolatedSql?: string;
}

export interface OracleActiveSessionsResult {
  success: boolean;
  sessions: OracleActiveSession[];
  executionTimeMs: number;
  error?: string;
}

/** Uma instrução SQL recente no cursor cache do Oracle (v$sql). */
export interface OracleRecentStatement {
  sqlId: string;
  sqlText: string;
  parsingSchemaName: string | null;
  module: string | null;
  action: string | null;
  executions: number | null;
  firstLoadTime: string | null;
  lastActiveTime: string | null;
  binds?: OracleCapturedBind[];
  interpolatedSql?: string;
}

export interface OracleRecentStatementsResult {
  success: boolean;
  statements: OracleRecentStatement[];
  executionTimeMs: number;
  error?: string;
}

/** Opções de uma captura contínua (Statement Tracer rodando em segundo plano). */
export interface OracleCaptureOptions {
  /** Intervalo entre consultas ao Oracle, em ms (piso de 2000ms aplicado pelo service). */
  intervalMs: number;
  schemaFilter?: string;
  textFilter?: string;
}

/** Uma sessão Oracle observada durante a captura, no instante em que passou a rodar `sqlId`. */
export interface OracleSessionCaptureEntry extends OracleActiveSession {
  capturedAt: string;
}

/** Estado acumulado de uma captura contínua para uma conexão (sobrevive à navegação na UI). */
export interface OracleCaptureState {
  isCapturing: boolean;
  startedAt: string | null;
  intervalMs: number;
  pollCount: number;
  lastPolledAt: string | null;
  lastError: string | null;
  /** Instruções distintas vistas (deduplicadas por SQL_ID), mais recentes primeiro. */
  statements: OracleRecentStatement[];
  /** Linha do tempo de mudanças de SQL por sessão, mais recentes primeiro. */
  sessionEvents: OracleSessionCaptureEntry[];
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

export interface KarafFeatureInfo {
  name: string;
  version: string;
  required?: boolean;
  state: string;
  repository: string;
  description?: string;
  isWinthor?: boolean;
  installed?: boolean;
}

export interface KarafFeatureRepoInfo {
  name: string;
  url: string;
  isWinthor?: boolean;
  isWinThor?: boolean;
}

export interface KarafJvmMemoryInfo {
  timestamp: number;
  heapUsedBytes: number;
  heapCommittedBytes: number;
  heapMaxBytes: number;
  heapUsedMb: number;
  heapCommittedMb: number;
  heapMaxMb: number;
  heapUsagePercent: number;
  nonHeapUsedBytes: number;
  nonHeapCommittedBytes: number;
  nonHeapMaxBytes: number;
  nonHeapUsedMb: number;
  nonHeapCommittedMb?: number;
  nonHeapMaxMb?: number;
  uptime?: string;
  liveThreads?: number;
  peakThreads?: number;
  daemonThreads?: number;
  classesLoaded?: number;
  isNearOom: boolean;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
  alertMessage?: string;
  source: 'jmx' | 'info';
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
// Rotina 801 - Atualização e Instalação de Serviços Web (Ferramenta Servidor)
// ==========================================

export type Routine801Status =
  | 'LIBERADO'
  | 'HOMOLOGACAO'
  | 'BLOQUEADO'
  | 'APROVADO'
  | 'AGUARDANDO_HOMOLOGACAO'
  | 'NENHUM';

export type Routine801ProjectType = 'SERVICO' | 'ROTINA';

export type Routine801Command = 'INSTALL' | 'UPDATE' | 'REPLACE' | 'UNINSTALL';

export interface Routine801Repository {
  groupId: string;
  artifactId: string;
  version: string;
  featureMavenUrl?: string;
}

export interface Routine801RepositoryUpdate {
  comando: string;
  repositorio: Routine801Repository;
}

export interface Routine801Dependency {
  featureName?: string;
  version?: string;
  type?: string;
}

export interface Routine801Feature {
  nome: string;
  versao: string;
  versaoAnterior?: string;
  comando?: Routine801Command | string;
  codigoRotina: number;
  codigoModulo: number;
  tipoProjeto: Routine801ProjectType | string;
  descricao: string;
  status: Routine801Status | string;
  dependencias?: Routine801Dependency[];
  featureMavenUrl?: string;
}

export interface Routine801CatalogResponse {
  repositorios: Routine801RepositoryUpdate[];
  funcionalidades: Routine801Feature[];
}

export interface Routine801InstallRequest {
  funcionalidades: Routine801Feature[];
  repositorios?: Routine801RepositoryUpdate[];
  action?: 'install' | 'repo_add_only';
  executeVia?: 'karaf_cli' | 'api';
  serverUrl?: string;
  credentials?: { user?: string; pass?: string; port?: number };
  targetVersionOverride?: string;
}

export interface Routine801InstallResult {
  success: boolean;
  output: string;
  installedCount: number;
  failedCount: number;
  details?: {
    featureName: string;
    version: string;
    success: boolean;
    error?: string;
  }[];
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
  /** Caminho de origem em renomeações/cópias. */
  originalPath?: string;
}

export interface GitCommandResult {
  success: boolean;
  output: string;
  /** Commit criado, mas o push falhou (o commit continua só local). */
  pushFailed?: boolean;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  files: string[];
  error?: string;
}

export type GitTaskProvider = 'azure' | 'jira' | 'manual';

export interface GitTaskItem {
  id: string;
  title: string;
  provider: GitTaskProvider;
  type?: string;
  status?: string;
  url?: string;
}

export interface CreateTaskBranchOptions {
  taskId?: string;
  title?: string;
  prefix?: string;
  baseBranch?: string;
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
// APM & Traces OpenTelemetry (OTel / SigNoz)
// ==========================================

/** Porta padrão do OTLP/HTTP, usada pelo receptor embutido do APM. */
export const DEFAULT_APM_OTLP_PORT = 4318;

/** Porta aceitável para o receptor: inteira e fora da faixa privilegiada (< 1024 exige admin). */
export function isValidApmReceiverPort(port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/** Porta configurada para o receptor do APM, com fallback para a padrão do OTLP/HTTP. */
export function getApmReceiverPort(settings?: Pick<AppSettings, 'apmReceiverPort'> | null): number {
  const configured = settings?.apmReceiverPort;
  return isValidApmReceiverPort(configured) ? configured : DEFAULT_APM_OTLP_PORT;
}

/** Nome de serviço (`otel.service.name`) usado quando o usuário não configurou um próprio. */
export const DEFAULT_APM_SERVICE_NAME = 'karaf-app';

/** Nome de serviço configurado para o agente OTel anexado pelo Cockpit, com fallback genérico. */
export function getApmServiceName(settings?: Pick<AppSettings, 'apmServiceName'> | null): string {
  const configured = settings?.apmServiceName?.trim();
  return configured || DEFAULT_APM_SERVICE_NAME;
}

/**
 * Endpoint base do receptor OTLP do APM. Usa 127.0.0.1 porque o receptor escuta só em IPv4 e
 * `localhost` resolve primeiro para ::1 em alguns runtimes (ex.: Node 17–19), derrubando o export.
 */
export function getApmOtlpEndpoint(port: number = DEFAULT_APM_OTLP_PORT): string {
  return `http://127.0.0.1:${port}`;
}

/**
 * Propriedades de sistema do OpenTelemetry Java Agent para exportar apenas traces ao APM.
 * O protocolo é explícito porque o agente 1.x usa gRPC (porta 4317) por padrão; métricas e logs
 * ficam desligados porque o receptor só aceita traces e o agente encheria o console de erros 404.
 */
export function buildOtelJavaAgentProperties(
  port: number = DEFAULT_APM_OTLP_PORT,
  serviceName: string = DEFAULT_APM_SERVICE_NAME
): string[] {
  return [
    `-Dotel.exporter.otlp.endpoint=${getApmOtlpEndpoint(port)}`,
    '-Dotel.exporter.otlp.protocol=http/protobuf',
    `-Dotel.service.name=${serviceName}`,
    '-Dotel.traces.sampler=always_on',
    '-Dotel.metrics.exporter=none',
    '-Dotel.logs.exporter=none'
  ];
}

export type TraceSpanKind = 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER' | 'UNSPECIFIED';

export type TraceStatusCode = 'OK' | 'ERROR' | 'UNSET';

export interface TraceSpanEvent {
  name: string;
  timestampUnixMs: number;
  attributes?: Record<string, any>;
}

/** Exceção registrada no span (evento `exception` da convenção semântica OpenTelemetry). */
export interface TraceSpanException {
  type?: string;
  message?: string;
  stacktrace?: string;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: TraceSpanKind;
  serviceName: string;
  startTimeUnixMs: number;
  endTimeUnixMs: number;
  durationMs: number;
  statusCode: TraceStatusCode;
  statusMessage?: string;
  // Atributos semânticos HTTP
  httpMethod?: string;
  httpUrl?: string;
  httpRoute?: string;
  httpStatusCode?: number;
  // Atributos de banco (Oracle, Postgres, MySQL)
  dbSystem?: string;
  dbStatement?: string;
  dbName?: string;
  // Atributos genéricos / tags
  attributes: Record<string, any>;
  events?: TraceSpanEvent[];
  exception?: TraceSpanException;
}

export interface TraceSpanTreeNode {
  span: TraceSpan;
  children: TraceSpanTreeNode[];
  depth: number;
  offsetPercent: number;
  widthPercent: number;
}

export interface TraceSummary {
  traceId: string;
  rootSpanName: string;
  serviceName: string;
  httpMethod?: string;
  httpRoute?: string;
  httpStatusCode?: number;
  startTimeUnixMs: number;
  durationMs: number;
  spanCount: number;
  hasError: boolean;
  errorCount: number;
  hasDatabaseQuery: boolean;
}

/**
 * Decomposição do tempo de parede de um trace. Intervalos sobrepostos de uma mesma categoria
 * contam uma única vez (queries paralelas, spans aninhados), então db + externo + app = total.
 */
export interface TraceTimeBreakdown {
  totalMs: number;
  dbMs: number;
  /** Chamadas CLIENT que não são banco (HTTP/RPC externos), descontado o banco feito dentro delas. */
  externalMs: number;
  appMs: number;
  /** Tempo atribuído à camada de requisição HTTP (servidor de entrada + chamadas HTTP externas). */
  httpMs?: number;
  /** Tempo atribuído à execução e processamento Java na JVM/OSGi. */
  javaMs?: number;
  /** Tempo atribuído à execução de queries JDBC no banco de dados. */
  jdbcMs?: number;
}

export interface TraceDetails {
  summary: TraceSummary;
  spans: TraceSpan[];
  rootTree: TraceSpanTreeNode[];
  breakdown: TraceTimeBreakdown;
}

export interface ServiceMetricsSummary {
  serviceName: string;
  requestCount: number;
  errorCount: number;
  errorRate: number; // percentual de 0 a 100
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  lastSeenAt: number;
}

export interface EndpointMetricsSummary {
  serviceName: string;
  method: string;
  route: string;
  requestCount: number;
  /** Alias para requestCount */
  count?: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  maxDurationMs?: number;
}

/**
 * Filtro de traces. O overview agregado só considera o escopo (`serviceName`, `startTimeMs`,
 * `endTimeMs`); os demais campos filtram apenas a listagem de traces.
 */
export interface ApmFilter {
  serviceName?: string;
  search?: string;
  hasError?: boolean;
  hasDatabaseQuery?: boolean;
  minDurationMs?: number;
  maxDurationMs?: number;
  limit?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  /** Ordenação dos traces: 'time' (mais recente primeiro, padrão) ou 'duration' (mais lentos primeiro). */
  sortBy?: 'time' | 'duration';
  /** Filtro automático para retornar apenas chamadas e queries detectadas como lentas. */
  slowOnly?: boolean;
}

export interface ApmReceiverStatus {
  listening: boolean;
  port: number;
  error?: string;
  totalIngestedSpans: number;
  totalIngestedTraces: number;
  bufferSize: number;
  maxBufferSize: number;
  /** Spans descartados por excederem o limite de spans por trace. */
  droppedSpans?: number;
}

export interface ApmReceiverPortChangeResult {
  success: boolean;
  /** Motivo da falha; nesse caso o receptor que estava ativo continua na porta atual. */
  error?: string;
  status: ApmReceiverStatus;
}

export interface SlowQueryMetricsSummary {
  statement: string;
  dbSystem?: string;
  dbName?: string;
  executionCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  sampleTraceId: string;
}

export interface ApmTimeSeriesBucket {
  timestampUnixMs: number;
  label: string; // Ex: "16:20"
  requestCount: number;
  successCount: number;
  clientErrorCount: number; // 4xx
  serverErrorCount: number; // 5xx
  avgDurationMs: number;
  p95DurationMs: number;
}

export interface ObservabilityOverview {
  totalTraces: number;
  totalSpans: number;
  requestsPerSecond: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  services: ServiceMetricsSummary[];
  topEndpoints: EndpointMetricsSummary[];
  slowQueries: SlowQueryMetricsSummary[];
  timeSeries: ApmTimeSeriesBucket[];
  dbTimePercentage: number;
  receiverStatus: ApmReceiverStatus;
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

export type LogExceptionType =
  | 'ORA'
  | 'NPE'
  | 'BUNDLE'
  | 'OOM'
  | 'CLASS_NOT_FOUND'
  | 'LINK_COMM'
  | 'GENERIC_EXCEPTION';

export interface LogExceptionMatch {
  id: string;
  type: LogExceptionType;
  title: string;
  code?: string;
  message: string;
  lineIndex: number;
  rawLine: string;
  timestamp?: string;
  suggestedCommands: string[];
  explanation: string;
}

export interface LogAnalysisSummary {
  totalErrors: number;
  oraErrorsCount: number;
  npeCount: number;
  bundleErrorsCount: number;
  oomCount: number;
  otherErrorsCount: number;
  matches: LogExceptionMatch[];
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
  /** Criptografado em repouso (AES-256-GCM, ver ConfigService.encryptSecretsForDisk); trafega em texto plano no IPC/REST/MCP local. */
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

// ==========================================
// Módulo de Qualidade & Testes (QA / Zephyr / Jira / Azure Test Plans)
// ==========================================

export type QualitySourceType =
  | 'zephyr-scale'
  | 'zephyr-squad'
  | 'jira'
  | 'azure-test-plans'
  | 'custom-webhook';

export interface QualitySourceConfig {
  id: string;
  name: string;
  type: QualitySourceType;
  /** URL base (ex: https://api.zephyrscale.smartbear.com/v2, https://empresa.atlassian.net, https://dev.azure.com/empresa) */
  baseUrl: string;
  /** Chave do projeto no Jira/Zephyr/Azure (ex: WIN, DIST, CORE) */
  projectKey?: string;
  /** Identificador do plano de teste, ciclo ou test suite (ex: WIN-P12, Test Cycle 1) */
  testPlanKey?: string;
  /** E-mail / Usuário de autenticação (para Basic Auth em Jira Cloud / Zephyr) */
  userEmail?: string;
  /** Token de API, Zephyr Token ou PAT (criptografado em repouso com AES-256-GCM) */
  apiToken?: string;
  /** Indicador retornado pela API informando se o token já está salvo com segurança */
  hasApiToken?: boolean;
  /** JQL customizado para filtrar testes ou bugs associados */
  jqlFilter?: string;
  /** Se a fonte está ativa */
  enabled: boolean;
  /** Se é a fonte primária/padrão */
  isDefault?: boolean;
}

export interface QualitySourceTemplate {
  name: string;
  type: QualitySourceType;
  baseUrl: string;
  description: string;
  defaultProjectKey?: string;
  defaultJqlFilter?: string;
}

export const DEFAULT_QUALITY_SOURCE_TEMPLATES: QualitySourceTemplate[] = [
  {
    name: 'Zephyr Scale (Cloud)',
    type: 'zephyr-scale',
    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
    description: 'API oficial v2 do Zephyr Scale para Jira Cloud (Test Cases, Test Cycles e Executions).'
  },
  {
    name: 'Zephyr Squad / Jira Server',
    type: 'zephyr-squad',
    baseUrl: 'https://jira.empresa.com.br',
    description: 'Integração Zephyr Squad para instâncias Jira Server / Data Center.'
  },
  {
    name: 'Jira Software (Bugs & Cenários)',
    type: 'jira',
    baseUrl: 'https://empresa.atlassian.net',
    description: 'Consulta direta de Issues de tipo Teste, Bug ou Histórias com critérios de aceite via REST API do Jira.',
    defaultJqlFilter: 'issuetype in (Test, Bug) AND project = "WIN" ORDER BY updated DESC'
  },
  {
    name: 'Azure DevOps Test Plans',
    type: 'azure-test-plans',
    baseUrl: 'https://dev.azure.com/empresa',
    description: 'Test Plans, Test Suites e Test Points da organização Azure DevOps.'
  }
];

// ==========================================
// Módulo de Asserções & Validador Regressivo (QA Regression Suite)
// ==========================================

export type QaAssertionExpectedType =
  | 'jsonPath'     // Extrai via JSONPath do rawJson (ex: $.vlTotal, $.produtos[0].qt)
  | 'literal'      // Valor fixo informado (ex: 4387, "S", "CODST Gravado")
  | 'notNull'      // Valida se não é null/vazio/inexistente (<S>)
  | 'null'         // Valida se é null/vazio/não preenchido (<N>)
  | 'zero'         // Valida se é numérico 0 (<0>)
  | 'regex';       // Valida via Expressão Regular

export interface QaRegressionAssertion {
  id: string;
  column: string;
  expectedType: QaAssertionExpectedType;
  expectedValue?: string;
  description?: string;
  /** Índice da linha do resultado da query a validar (padrão: 0). Se for -1, valida em todas as linhas retornadas. */
  rowIndex?: number;
}

export interface QaRegressionVariableExtract {
  variableName: string;
  column: string;
  rowIndex?: number;
}

export interface QaRegressionStep {
  id: string;
  title: string;
  tableName?: string;
  description?: string;
  enabled: boolean;
  query: string;
  assertions: QaRegressionAssertion[];
  extractVariables?: QaRegressionVariableExtract[];
}

export interface QaRegressionTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  author?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  defaultVariables?: Record<string, any>;
  sampleJson?: string;
  steps: QaRegressionStep[];
}

export interface QaExecutionRequest {
  connectionId?: string;
  connectionConfig?: DatabaseConnectionConfig;
  templateId?: string;
  template?: QaRegressionTemplate;
  rawJson?: string;
  variables?: Record<string, any>;
  selectedStepIds?: string[];
}

export type QaAssertionStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface QaAssertionResult {
  assertionId: string;
  column: string;
  expectedType: QaAssertionExpectedType;
  expectedValue?: any;
  expectedDisplay: string;
  actualValue?: any;
  actualDisplay: string;
  status: QaAssertionStatus;
  message?: string;
  rowIndex?: number;
}

export interface QaStepExecutionResult {
  stepId: string;
  stepTitle: string;
  tableName?: string;
  query: string;
  interpolatedQuery?: string;
  rowCount: number;
  executionTimeMs: number;
  success: boolean;
  error?: string;
  assertions: QaAssertionResult[];
  rows?: Record<string, any>[];
}

export interface QaExecutionResult {
  templateId: string;
  templateName: string;
  timestamp: string;
  durationMs: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  warningAssertions: number;
  success: boolean;
  extractedVariables: Record<string, any>;
  stepResults: QaStepExecutionResult[];
}

// --- Busca e Obtenção de Payload de Integração (PCINTEGRACAOCORE / QA Studio) ---

export type QaCoreSearchMode = 'cupom' | 'cgcEnt' | 'chave' | 'idExterno' | 'recent';

export interface QaCoreSearchFilter {
  mode: QaCoreSearchMode;
  numCupom?: string;
  codFilial?: string;
  cgcEnt?: string;
  chaveNfe?: string;
  idExterno?: string;
  limit?: number;
}

export interface QaCorePayloadItem {
  id?: string | number;
  numCupom?: string;
  codFilial?: string;
  cgcEnt?: string;
  cliente?: string;
  pdvOrigem?: string;
  chaveNfe?: string;
  vlTotal?: string | number;
  data?: string;
  rawJson: string;
}

export interface QaCoreSearchResult {
  success: boolean;
  totalFound: number;
  items: QaCorePayloadItem[];
  error?: string;
}

// --- Obtenção de Payload de Integração via API REST Externa (QA Studio) ---

export interface QaApiFetchRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  jsonPath?: string;
  timeoutMs?: number;
}

export interface QaApiFetchResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  rawJson?: string;
  extractedJson?: string;
  durationMs?: number;
  error?: string;
}


// ==========================================
// Runner de Testes Automatizados (Maven, Playwright, Cypress, Newman)
// ==========================================

export type TestRunnerType = 'maven' | 'playwright' | 'cypress' | 'newman' | 'custom';

export interface TestRunnerConfig {
  id: string;
  name: string;
  type: TestRunnerType;
  /** Diretório de trabalho do teste (suporta placeholders {PROJECTS_PATH}, {KARAF_PATH}) */
  workingDir?: string;
  /** Comando executável customizado quando o tipo for 'custom' (ex: pytest, dotnet test, cargo test) */
  customCommand?: string;
  /** Argumentos ou comando customizado (ex: "test", "verify -Dtest=FaturamentoTest", "test --grep @smoke") */
  commandArgs?: string;
  /** Variáveis de ambiente complementares */
  envVars?: Record<string, string>;
  /** Limite de execução em segundos (padrão: 300) */
  timeoutSeconds?: number;
  /** IDs dos cenários de teste vinculados na Matriz de Validação para sincronização automática */
  linkedValidationItemIds?: string[];
  /** Descrição ou finalidade da suíte de teste */
  description?: string;
  createdAt?: string;
}

export interface TestExecutionResult {
  id: string;
  runnerId: string;
  runnerName: string;
  type: TestRunnerType;
  status: 'passed' | 'failed' | 'aborted';
  exitCode: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  output: string;
  executedAt: string;
  linkedValidationItemIds?: string[];
  summaryMessage?: string;
}

export interface TestRunnerPreset {
  name: string;
  type: TestRunnerType;
  description: string;
  defaultCommandArgs: string;
  suggestedWorkingDirPlaceholder: string;
}

export const DEFAULT_TEST_RUNNER_PRESETS: TestRunnerPreset[] = [
  {
    name: 'Maven Unit/Integration Tests',
    type: 'maven',
    description: 'Executa testes unitários e de integração JUnit / Mockito via Maven (mvn test)',
    defaultCommandArgs: 'test',
    suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/seu-projeto'
  },
  {
    name: 'Maven Verify (com Fail-Safe)',
    type: 'maven',
    description: 'Executa suíte completa de testes de integração e empacotamento com verify',
    defaultCommandArgs: 'verify',
    suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/seu-projeto'
  },
  {
    name: 'Playwright E2E Tests',
    type: 'playwright',
    description: 'Executa suíte de automação web End-to-End no navegador via Playwright',
    defaultCommandArgs: 'test',
    suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/seu-portal-web'
  },
  {
    name: 'Cypress E2E Tests',
    type: 'cypress',
    description: 'Executa testes E2E headless via Cypress em portais web locais',
    defaultCommandArgs: 'run',
    suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/seu-portal-web'
  },
  {
    name: 'Newman API Collection (Postman CLI)',
    type: 'newman',
    description: 'Executa coleção de requisições e asserções de API REST via Newman',
    defaultCommandArgs: 'run ./tests/collection.json',
    suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/api-gateway'
  }
];

// --- Tipos da Integração TAUT (Cypress / QA Hub) ---

export interface TautProjectStatus {
  exists: boolean;
  projectPath: string;
  hasPackageJson: boolean;
  hasCypressConfig: boolean;
  hasEnv: boolean;
  cypressVersion?: string;
  envVariables?: {
    hasOracleUser: boolean;
    hasOraclePassword: boolean;
    hasOracleConnectString: boolean;
    hasBaseUrl: boolean;
    oracleConnectString?: string;
    baseUrl?: string;
    apiUrlMode?: string;
    reporterZephyr?: boolean;
    cycleKey?: string;
  };
}

export interface TautCoverageItem {
  key: string;
  status: 'automated' | 'pending';
  filePath?: string;
}

export interface TautCoverageReport {
  totalScenarios: number;
  automatedCount: number;
  pendingCount: number;
  coveragePercentage: number;
  /** true quando não há CSV de insumo (pasta Insumo/): a porcentagem não é calculada */
  baselineMissing?: boolean;
  items: TautCoverageItem[];
  generatedAt: string;
}

export interface TautSpecSummary {
  module: string;
  specFile: string;
  relativePath: string;
  testCount: number;
  testIds: string[];
  tags: string[];
}

export interface TautRunOptions {
  tags?: string;
  spec?: string;
  apiUrlMode?: 'v39' | 'legacy';
  openInteractive?: boolean;
  projectPath?: string;
}

export interface TautCsvIntakeScenario {
  key: string;
  name: string;
  testData: string;
  expectedResult: string;
  type: 'contrato' | 'positivo' | 'negativo';
  priority?: string;
}

export interface TautCsvIntakeResult {
  csvFile: string;
  module: string;
  endpoint: string;
  method: string;
  wtaService: string;
  scenariosCount: number;
  scenarios: TautCsvIntakeScenario[];
  intakeBlock: string;
  implementationPlan: string;
  recommendedModel: string;
  checklistWarnings: string[];
  checklistBlockers: string[];
}

export interface TautEnvSyncResult {
  success: boolean;
  envPath: string;
  updatedKeys: string[];
  message: string;
}



