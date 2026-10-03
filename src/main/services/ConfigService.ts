import fs from 'fs';
import path from 'path';
import os from 'os';
import { decryptSecret, encryptSecret } from '../utils/secretsCrypto';
import {
  AppSettings,
  PathStatusInfo,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  AutomationProfile,
  DeployProfile,
  RealtimeLogSource,
  LlmProviderConfig,
  DEFAULT_LLM_PROVIDER_TEMPLATES
} from '../../shared/types';

export const DEFAULT_MONITORED_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local (WTA)', enabled: true },
  { port: 9195, label: 'WinThor Start (Launcher Delphi)', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug (JVM)', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

export const DEFAULT_REALTIME_LOG_SOURCES: RealtimeLogSource[] = [];

export const DEFAULT_AUTOMATION_PROFILES: AutomationProfile[] = [
  {
    id: 'profile-example',
    name: 'Perfil de Exemplo',
    description: 'Modelo inicial — edite ou substitua pelos passos reais do seu ambiente',
    isDefault: false,
    steps: [
      {
        id: 'step-example-command',
        name: 'Comando de Exemplo',
        type: 'command',
        enabled: false,
        command: 'echo "Configure aqui os passos da sua esteira"',
        launchMode: 'wt'
      }
    ]
  }
];

export const DEFAULT_DEPLOY_PROFILES: DeployProfile[] = [
  {
    id: 'deploy-profile-karaf-osgi',
    name: 'Deploy Karaf OSGi',
    description: 'Registra o repositório Maven e instala/atualiza a feature no Karaf local',
    steps: [
      {
        id: 'deploy-step-karaf-repo-add',
        name: 'Registrar Repositório Maven',
        type: 'karaf-command',
        enabled: true,
        command: 'feature:repo-add mvn:com.empresa.service/meu-servico/0.0.1-SNAPSHOT/xml/features'
      },
      {
        id: 'deploy-step-karaf-feature-install',
        name: 'Instalar / Atualizar Feature',
        type: 'karaf-command',
        enabled: true,
        command: 'feature:install -r -u meu-servico/0.0.1-SNAPSHOT'
      }
    ]
  }
];

export { DEFAULT_LLM_PROVIDER_TEMPLATES };
export const DEFAULT_LLM_PROVIDERS: LlmProviderConfig[] = [];

export const DEFAULT_TRACKED_SERVICES: TrackedServiceConfig[] = [];

export const DEFAULT_TRACKED_PROCESSES: TrackedProcessConfig[] = [];

export const DEFAULT_AUTOMATION_CONFIG: EnvironmentAutomationConfig = {
  stopServices: true,
  killProcesses: true,
  launchIde: true,
  startKaraf: true,
  openBrowser: false,
  launchMode: 'embedded',
  selectedServiceNames: [],
  selectedProcesses: [],
  selectedStartServiceNames: []
};

export function detectDefaultIntelliJPath(): string {
  // 1. Tentar IntelliJ IDEA (JetBrains e Toolbox)
  const possibleRoots = [
    'C:\\Program Files\\JetBrains',
    'C:\\Program Files (x86)\\JetBrains',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    path.join(os.homedir(), 'AppData', 'Local', 'JetBrains', 'Toolbox', 'apps', 'IDEA-U', 'ch-0'),
    path.join(os.homedir(), 'AppData', 'Local', 'JetBrains', 'Toolbox', 'apps', 'IDEA-C', 'ch-0')
  ];

  for (const root of possibleRoots) {
    try {
      if (fs.existsSync(root)) {
        const entries = fs.readdirSync(root, { withFileTypes: true });
        const ideaDirs = entries
          .filter((e) => e.isDirectory() && (e.name.toLowerCase().includes('intellij') || e.name.toLowerCase().includes('idea')))
          .sort((a, b) => b.name.localeCompare(a.name));

        for (const dir of ideaDirs) {
          const exePath = path.join(root, dir.name, 'bin', 'idea64.exe');
          if (fs.existsSync(exePath)) {
            return exePath;
          }
          try {
            const subEntries = fs.readdirSync(path.join(root, dir.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory()) {
                const subExe = path.join(root, dir.name, sub.name, 'bin', 'idea64.exe');
                if (fs.existsSync(subExe)) {
                  return subExe;
                }
              }
            }
          } catch {
            // Ignora
          }
        }
      }
    } catch {
      // Ignorar erros de leitura de pastas
    }
  }

  // 2. Tentar VS Code
  const vsCodeCandidates = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'Code.exe'),
    'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    'C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe'
  ];
  for (const candidate of vsCodeCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. Tentar Cursor
  const cursorCandidates = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'Cursor.exe')
  ];
  for (const candidate of cursorCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 4. Tentar Eclipse
  const eclipseCandidates = [
    'C:\\eclipse\\eclipse.exe',
    'C:\\Program Files\\eclipse\\eclipse.exe',
    path.join(os.homedir(), 'eclipse', 'eclipse.exe')
  ];
  for (const candidate of eclipseCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe';
}

export function detectDefaultProjectsPath(): string {
  if (process.env.PROJECTS_DIR && fs.existsSync(process.env.PROJECTS_DIR)) {
    return process.env.PROJECTS_DIR;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/projects',
    '/projects',
    path.join(userHome, 'Projetos'),
    path.join(userHome, 'projetos'),
    path.join(userHome, 'Projects'),
    path.join(userHome, 'source', 'repos'),
    'C:\\Projetos'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function detectDefaultKarafPath(): string {
  if (process.env.KARAF_DIR && fs.existsSync(process.env.KARAF_DIR)) {
    return process.env.KARAF_DIR;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/karaf',
    '/karaf',
    path.join(userHome, 'karaf'),
    'C:\\karaf',
    'D:\\karaf'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function detectDefaultAppPath(): string {
  const envDir = process.env.APP_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/app',
    '/app',
    path.join(userHome, 'app'),
    'C:\\app',
    'D:\\app'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function detectDefaultJdkPath(): string {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const candidates = [
    'C:\\Program Files\\Java\\jdk1.8.0_202',
    'C:\\Program Files\\Java\\jdk1.8.0_232',
    'C:\\Program Files\\Java\\jdk-8',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-8.0.0.0-hotspot',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.0.0-hotspot',
    'C:\\Program Files\\Zulu\\zulu-8',
    'C:\\Program Files\\BellSoft\\LibericaJDK-8'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const javaRoots = ['C:\\Program Files\\Java', 'C:\\Program Files (x86)\\Java'];
  for (const root of javaRoots) {
    try {
      if (fs.existsSync(root)) {
        const dirs = fs.readdirSync(root);
        for (const d of dirs) {
          const full = path.join(root, d);
          if (fs.existsSync(path.join(full, 'bin', 'java.exe'))) {
            return full;
          }
        }
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function getDynamicDefaultConfig(): AppSettings {
  const appPath = detectDefaultAppPath();
  return {
    appPath,
    karafPath: detectDefaultKarafPath(),
    karafEnvironment: 'local',
    karafWslDistro: '',
    jdkPath: detectDefaultJdkPath(),
    karafScript: '',
    karafUser: process.env.KARAF_USER || 'karaf',
    karafPass: process.env.KARAF_PASS || 'karaf',
    intellijPath: detectDefaultIntelliJPath(),
    projectsPath: detectDefaultProjectsPath(),
    targetPrBranch: process.env.TARGET_PR_BRANCH || 'develop',
    favoriteRoutines: [],
    webPort: 8889,
    webPath: '',
    winthorStartEnabled: true,
    winthorStartPort: 9195,
    wtaUrl: 'http://localhost:8889',
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_MONITORED_PORTS,
    trackedServices: DEFAULT_TRACKED_SERVICES,
    trackedProcesses: DEFAULT_TRACKED_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION_CONFIG,
    automationProfiles: DEFAULT_AUTOMATION_PROFILES,
    activeProfileId: DEFAULT_AUTOMATION_PROFILES[0]?.id,
    deployProfiles: DEFAULT_DEPLOY_PROFILES,
    activeDeployProfileId: DEFAULT_DEPLOY_PROFILES[0]?.id,
    realtimeLogSources: DEFAULT_REALTIME_LOG_SOURCES,
    activeLogSourceId: DEFAULT_REALTIME_LOG_SOURCES[0]?.id,
    indexProjectsDocs: false,
    docSyncTargets: [],
    llmProviders: DEFAULT_LLM_PROVIDERS,
    activeLlmProviderId: undefined
  };
}

/**
 * Diretório de dados persistentes do app (config, índice de documentação, cache de modelos).
 * Independente do Electron pra funcionar igual em src/main, src/server e src/mcp.
 */
export function getAppDataDir(): string {
  const configDir =
    process.env.CONFIG_DIR ||
    process.env.APPDATA ||
    path.join(os.homedir(), '.config');
  const newDir = process.env.CONFIG_DIR ? configDir : path.join(configDir, 'dev-manager');

  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }
  return newDir;
}

/**
 * Retorna `parsedValue` se for um array não vazio, senão `fallback`. Usado por
 * getSettings() para os vários campos de lista persistidos (perfis, portas
 * monitoradas, serviços/processos rastreados), que antes repetiam a mesma
 * checagem `Array.isArray(...) && ...length > 0 ? ... : DEFAULT` uma a uma.
 */
function pickNonEmptyArray<T>(parsedValue: unknown, fallback: T[]): T[] {
  return Array.isArray(parsedValue) && parsedValue.length > 0 ? (parsedValue as T[]) : fallback;
}

export class ConfigService {
  private configPath: string;

  // getDynamicDefaultConfig() varre disco (IDE/JDK/projects) e getSettings() é chamado
  // com muita frequência (polling de status, cada IPC de settings); cachear evita repetir
  // esse custo e o readFileSync+JSON.parse do config.json em máquinas com disco/CPU carregados.
  private cachedDefaultConfig: AppSettings | null = null;
  private cachedSettings: { data: AppSettings; mtimeMs: number } | null = null;

  constructor() {
    const newDir = getAppDataDir();

    // Migração suave: se existir pasta legada winthor-dev-manager, copiar config.json
    if (process.env.APPDATA) {
      const oldFile = path.join(process.env.APPDATA, 'winthor-dev-manager', 'config.json');
      const newFile = path.join(newDir, 'config.json');
      if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
        try {
          fs.copyFileSync(oldFile, newFile);
        } catch (err) {
          console.warn('[ConfigService] Falha ao migrar config.json legado:', (err as Error).message);
        }
      }
    }
    this.configPath = path.join(newDir, 'config.json');
  }

  public getConfigFilePath(): string {
    return this.configPath;
  }

  /**
   * Descriptografa em memória os segredos persistidos (mutando `settings` diretamente).
   * Chamado uma vez por leitura do disco, para que o restante do app sempre lide com
   * texto plano — só a representação em disco fica criptografada.
   */
  private decryptSecretsInPlace(settings: AppSettings): void {
    const dir = path.dirname(this.configPath);
    if (settings.karafPass) settings.karafPass = decryptSecret(settings.karafPass, dir)!;
    settings.databaseConnections?.forEach((c) => {
      if (c.password) c.password = decryptSecret(c.password, dir);
    });
    settings.confluenceSources?.forEach((s) => {
      if (s.authToken) s.authToken = decryptSecret(s.authToken, dir)!;
    });
    settings.jiraSources?.forEach((s) => {
      if (s.authToken) s.authToken = decryptSecret(s.authToken, dir)!;
    });
    settings.llmProviders?.forEach((p) => {
      if (p.apiKey) p.apiKey = decryptSecret(p.apiKey, dir)!;
    });
    settings.docSyncTargets?.forEach((t) => {
      if (t.authValue) t.authValue = decryptSecret(t.authValue, dir)!;
    });
    settings.backupWebhooks?.forEach((w) => {
      if (w.authValue) w.authValue = decryptSecret(w.authValue, dir)!;
    });
    if (settings.ccwAuthCookie) settings.ccwAuthCookie = decryptSecret(settings.ccwAuthCookie, dir)!;
    if (settings.azureDevOpsToken) settings.azureDevOpsToken = decryptSecret(settings.azureDevOpsToken, dir)!;
    settings.qualitySources?.forEach((qs) => {
      if (qs.apiToken) qs.apiToken = decryptSecret(qs.apiToken, dir)!;
    });
  }

  /**
   * Retorna uma cópia de `settings` com os segredos criptografados, pronta para gravação
   * em disco. Não modifica o objeto original (que permanece em texto plano no cache/retorno).
   */
  private encryptSecretsForDisk(settings: AppSettings): AppSettings {
    const dir = path.dirname(this.configPath);
    const clone: AppSettings = structuredClone(settings);
    if (clone.karafPass) clone.karafPass = encryptSecret(clone.karafPass, dir)!;
    clone.databaseConnections = clone.databaseConnections?.map((c) =>
      c.password ? { ...c, password: encryptSecret(c.password, dir) } : c
    );
    clone.confluenceSources = clone.confluenceSources?.map((s) =>
      s.authToken ? { ...s, authToken: encryptSecret(s.authToken, dir)! } : s
    );
    clone.jiraSources = clone.jiraSources?.map((s) =>
      s.authToken ? { ...s, authToken: encryptSecret(s.authToken, dir)! } : s
    );
    clone.llmProviders = clone.llmProviders?.map((p) =>
      p.apiKey ? { ...p, apiKey: encryptSecret(p.apiKey, dir)! } : p
    );
    clone.docSyncTargets = clone.docSyncTargets?.map((t) =>
      t.authValue ? { ...t, authValue: encryptSecret(t.authValue, dir)! } : t
    );
    clone.backupWebhooks = clone.backupWebhooks?.map((w) =>
      w.authValue ? { ...w, authValue: encryptSecret(w.authValue, dir)! } : w
    );
    if (clone.ccwAuthCookie) clone.ccwAuthCookie = encryptSecret(clone.ccwAuthCookie, dir)!;
    if (clone.azureDevOpsToken) clone.azureDevOpsToken = encryptSecret(clone.azureDevOpsToken, dir)!;
    clone.qualitySources = clone.qualitySources?.map((qs) =>
      qs.apiToken ? { ...qs, apiToken: encryptSecret(qs.apiToken, dir)! } : qs
    );
    return clone;
  }

  private getDefaultConfigCached(): AppSettings {
    if (!this.cachedDefaultConfig) {
      this.cachedDefaultConfig = getDynamicDefaultConfig();
    }
    return this.cachedDefaultConfig;
  }

  public getSettings(): AppSettings {
    try {
      const stat = fs.existsSync(this.configPath) ? fs.statSync(this.configPath) : null;
      if (stat && this.cachedSettings && this.cachedSettings.mtimeMs === stat.mtimeMs) {
        return this.cachedSettings.data;
      }

      const defaultConfig = this.getDefaultConfigCached();

      if (stat) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const automationProfiles = pickNonEmptyArray(parsed.automationProfiles, DEFAULT_AUTOMATION_PROFILES);
        const activeProfileId = parsed.activeProfileId || automationProfiles[0]?.id;
        const deployProfiles = pickNonEmptyArray(parsed.deployProfiles, DEFAULT_DEPLOY_PROFILES);
        const activeDeployProfileId = parsed.activeDeployProfileId || deployProfiles[0]?.id;
        const realtimeLogSources = pickNonEmptyArray(parsed.realtimeLogSources, DEFAULT_REALTIME_LOG_SOURCES);
        const activeLogSourceId = parsed.activeLogSourceId || realtimeLogSources[0]?.id;

        // Migração de compatibilidade: config.json salvo por versões antigas podia usar as
        // chaves legadas "winthorPath"/"winthorWebPort"/"winthorWebPath". Lidas aqui apenas
        // como fallback — removidas do objeto logo em seguida para nunca serem gravadas de
        // volta no disco (senão sobrevivem indefinidamente a cada save() futuro).
        const legacyAppPath = parsed.winthorPath;
        const legacyWebPort = parsed.winthorWebPort;
        const legacyWebPath = parsed.winthorWebPath;
        delete parsed.winthorPath;
        delete parsed.winthorWebPort;
        delete parsed.winthorWebPath;

        const result: AppSettings = {
          ...defaultConfig,
          ...parsed,
          appPath: parsed.appPath || legacyAppPath || defaultConfig.appPath,
          // Usa ?? em vez de || para não tratar uma porta salva como 0 como "não definida".
          webPort: parsed.webPort ?? legacyWebPort ?? defaultConfig.webPort,
          webPath: parsed.webPath !== undefined ? parsed.webPath : (legacyWebPath !== undefined ? legacyWebPath : defaultConfig.webPath),
          karafSshPort: parsed.karafSshPort ?? defaultConfig.karafSshPort,
          karafDebugPort: parsed.karafDebugPort ?? defaultConfig.karafDebugPort,
          monitoredPorts: pickNonEmptyArray(parsed.monitoredPorts, DEFAULT_MONITORED_PORTS),
          trackedServices: pickNonEmptyArray(parsed.trackedServices, DEFAULT_TRACKED_SERVICES),
          trackedProcesses: pickNonEmptyArray(parsed.trackedProcesses, DEFAULT_TRACKED_PROCESSES),
          automationDefaults: parsed.automationDefaults ? { ...DEFAULT_AUTOMATION_CONFIG, ...parsed.automationDefaults } : DEFAULT_AUTOMATION_CONFIG,
          automationProfiles,
          activeProfileId,
          deployProfiles,
          activeDeployProfileId,
          realtimeLogSources,
          activeLogSourceId,
          llmProviders: Array.isArray(parsed.llmProviders) ? parsed.llmProviders : [],
          activeLlmProviderId: typeof parsed.activeLlmProviderId === 'string' ? parsed.activeLlmProviderId : (Array.isArray(parsed.llmProviders) ? parsed.llmProviders[0]?.id : undefined),
          azureDevOpsToken: typeof parsed.azureDevOpsToken === 'string' ? parsed.azureDevOpsToken : undefined,
          qualitySources: Array.isArray(parsed.qualitySources) ? parsed.qualitySources : [],
          activeQualitySourceId: typeof parsed.activeQualitySourceId === 'string' ? parsed.activeQualitySourceId : (Array.isArray(parsed.qualitySources) ? parsed.qualitySources[0]?.id : undefined)
        };
        this.decryptSecretsInPlace(result);
        this.cachedSettings = { data: result, mtimeMs: stat.mtimeMs };
        return result;
      }
      return defaultConfig;
    } catch (err) {
      console.error('Erro ao ler configurações:', err);
    }
    return this.getDefaultConfigCached();
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const candidate = this.preserveExistingSecrets(settings, current);
    const updated = { ...current, ...candidate };
    try {
      const forDisk = this.encryptSecretsForDisk(updated);
      fs.writeFileSync(this.configPath, JSON.stringify(forDisk, null, 2), 'utf-8');
      const stat = fs.statSync(this.configPath);
      this.cachedSettings = { data: updated, mtimeMs: stat.mtimeMs };
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
    return updated;
  }

  /**
   * Preenche de volta, num Partial<AppSettings> recebido de fora (IPC/REST/MCP/import), os
   * segredos que vieram vazios/ausentes com o valor já salvo para o mesmo id — sem isso, um
   * cliente que apenas ecoa de volta o resultado sanitizado de getSettings()/sanitizeSecrets()
   * (sem reenviar a senha/token, que chega vazia de propósito) apagaria a credencial salva a
   * cada save. Centralizado aqui (em vez de duplicado em registerIpc.ts/server/index.ts) para
   * que os três transportes tenham exatamente o mesmo comportamento — e para que um novo campo
   * de segredo só precise ser listado numa lista de shape (não em 3 arquivos).
   *
   * Cada item com segredo só reaproveita o valor salvo quando, além do próprio segredo vir
   * vazio, o destino (host/baseUrl/endpointUrl) para onde ele seria enviado **não mudou** —
   * caso contrário, um payload de save/import adulterado que só trocasse o destino conseguiria
   * redirecionar uma credencial real (senha de banco, token de API) pra um endpoint arbitrário
   * sem precisar conhecê-la. Guarda originalmente só aplicada a llmProviders em importSettings;
   * agora uniforme para todo campo de segredo, em todo caminho de save.
   */
  private preserveExistingSecrets(candidate: Partial<AppSettings>, current: AppSettings): Partial<AppSettings> {
    const merged: Partial<AppSettings> = { ...candidate };

    if (!merged.karafPass && current.karafPass) {
      merged.karafPass = current.karafPass;
    }
    if (Array.isArray(merged.databaseConnections)) {
      merged.databaseConnections = merged.databaseConnections.map((newConn) => {
        const existing = current.databaseConnections?.find(
          (c) => c.id === newConn.id || (c.host === newConn.host && c.port === newConn.port && c.user === newConn.user && c.database === newConn.database)
        );
        const destinationChanged = !!existing && (newConn.host !== existing.host || newConn.port !== existing.port);
        return { ...newConn, password: newConn.password || (destinationChanged ? '' : existing?.password || '') };
      });
    }
    if (Array.isArray(merged.confluenceSources)) {
      merged.confluenceSources = merged.confluenceSources.map((s) => {
        const existing = current.confluenceSources?.find((e) => e.id === s.id);
        const destinationChanged = !!existing && !!s.baseUrl && s.baseUrl !== existing.baseUrl;
        return { ...s, authToken: s.authToken || (destinationChanged ? '' : existing?.authToken || '') };
      });
    }
    if (Array.isArray(merged.jiraSources)) {
      merged.jiraSources = merged.jiraSources.map((s) => {
        const existing = current.jiraSources?.find((e) => e.id === s.id);
        const destinationChanged = !!existing && !!s.baseUrl && s.baseUrl !== existing.baseUrl;
        return { ...s, authToken: s.authToken || (destinationChanged ? '' : existing?.authToken || '') };
      });
    }
    if (Array.isArray(merged.llmProviders)) {
      merged.llmProviders = merged.llmProviders.map((p) => {
        const existing = current.llmProviders?.find((e) => e.id === p.id);
        const destinationChanged = !!existing && !!p.baseUrl && p.baseUrl !== existing.baseUrl;
        return { ...p, apiKey: p.apiKey || (destinationChanged ? '' : existing?.apiKey || '') };
      });
    }
    if (Array.isArray(merged.docSyncTargets)) {
      merged.docSyncTargets = merged.docSyncTargets.map((t) => {
        const existing = current.docSyncTargets?.find((e) => e.id === t.id);
        const destinationChanged = !!existing && !!t.endpointUrl && t.endpointUrl !== existing.endpointUrl;
        return { ...t, authValue: t.authValue || (destinationChanged ? '' : existing?.authValue || '') };
      });
    }
    if (Array.isArray(merged.backupWebhooks)) {
      merged.backupWebhooks = merged.backupWebhooks.map((w) => {
        const existing = current.backupWebhooks?.find((e) => e.id === w.id);
        const destinationChanged = !!existing && !!w.endpointUrl && w.endpointUrl !== existing.endpointUrl;
        return { ...w, authValue: w.authValue || (destinationChanged ? '' : existing?.authValue || '') };
      });
    }
    if (!merged.ccwAuthCookie && current.ccwAuthCookie) {
      const destinationChanged = !!merged.ccwBaseUrl && !!current.ccwBaseUrl && merged.ccwBaseUrl !== current.ccwBaseUrl;
      merged.ccwAuthCookie = destinationChanged ? '' : current.ccwAuthCookie;
    }
    if (!merged.azureDevOpsToken && current.azureDevOpsToken) {
      merged.azureDevOpsToken = current.azureDevOpsToken;
    }
    if (Array.isArray(merged.qualitySources)) {
      merged.qualitySources = merged.qualitySources.map((s) => {
        const existing = current.qualitySources?.find((e) => e.id === s.id);
        const destinationChanged = !!existing && !!s.baseUrl && s.baseUrl !== existing.baseUrl;
        return { ...s, apiToken: s.apiToken || (destinationChanged ? '' : existing?.apiToken || '') };
      });
    }

    return merged;
  }

  public autoDetectPaths(): Partial<AppSettings> {
    const appPath = detectDefaultAppPath();
    return {
      appPath,
      karafPath: detectDefaultKarafPath(),
      jdkPath: detectDefaultJdkPath(),
      intellijPath: detectDefaultIntelliJPath(),
      projectsPath: detectDefaultProjectsPath()
    };
  }

  public checkPath(targetPath: string): PathStatusInfo {
    if (!targetPath || targetPath.trim() === '') {
      return { path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho não informado' };
    }
    try {
      let resolvedPath = targetPath;
      if (targetPath.startsWith('/') && !fs.existsSync(targetPath)) {
        const settings = this.getSettings();
        if (settings.karafWslDistro) {
          const unc = `\\\\wsl.localhost\\${settings.karafWslDistro}${targetPath.replace(/\//g, '\\')}`;
          const uncAlt = `\\\\wsl$\\${settings.karafWslDistro}${targetPath.replace(/\//g, '\\')}`;
          if (fs.existsSync(unc)) resolvedPath = unc;
          else if (fs.existsSync(uncAlt)) resolvedPath = uncAlt;
        }
      }
      const exists = fs.existsSync(resolvedPath);
      if (!exists) {
        return { path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho não encontrado no disco' };
      }
      const stat = fs.statSync(resolvedPath);
      return {
        path: targetPath,
        exists: true,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        message: stat.isDirectory()
          ? (resolvedPath !== targetPath ? 'Diretório acessível no WSL' : 'Diretório acessível')
          : (resolvedPath !== targetPath ? 'Arquivo acessível no WSL' : 'Arquivo acessível')
      };
    } catch (err: any) {
      return {
        path: targetPath,
        exists: false,
        isDirectory: false,
        isFile: false,
        message: `Erro ao acessar caminho: ${err?.message || err}`
      };
    }
  }

  public toggleFavoriteRoutine(routineId: string): AppSettings {
    const current = this.getSettings();
    const favs = new Set(current.favoriteRoutines || []);
    if (favs.has(routineId)) {
      favs.delete(routineId);
    } else {
      favs.add(routineId);
    }
    return this.saveSettings({ favoriteRoutines: Array.from(favs) });
  }

  /**
   * Sanitiza todos os campos sensíveis (senhas e tokens) de um objeto AppSettings.
   * Usado tanto no exportSettings() quanto pelo endpoint GET /api/settings do server.
   */
  public sanitizeSecrets(settings: AppSettings): AppSettings {
    const sanitized: AppSettings = structuredClone(settings);
    sanitized.hasKarafPass = Boolean(settings.karafPass && settings.karafPass.trim().length > 0);
    sanitized.karafPass = '';
    if (sanitized.databaseConnections) {
      sanitized.databaseConnections = sanitized.databaseConnections.map((conn) => ({
        ...conn,
        password: '',
        hasPassword: Boolean(conn.password && conn.password.trim().length > 0)
      }));
    }
    if (sanitized.confluenceSources) {
      sanitized.confluenceSources = sanitized.confluenceSources.map((cs) => ({
        ...cs,
        authToken: ''
      }));
    }
    if (sanitized.jiraSources) {
      sanitized.jiraSources = sanitized.jiraSources.map((js) => ({
        ...js,
        authToken: ''
      }));
    }
    if (sanitized.llmProviders) {
      sanitized.llmProviders = sanitized.llmProviders.map((p) => ({
        ...p,
        apiKey: ''
      }));
    }
    if (sanitized.docSyncTargets) {
      sanitized.docSyncTargets = sanitized.docSyncTargets.map((t) => ({
        ...t,
        authValue: ''
      }));
    }
    if (sanitized.backupWebhooks) {
      sanitized.backupWebhooks = sanitized.backupWebhooks.map((w) => ({
        ...w,
        authValue: ''
      }));
    }
    if (sanitized.ccwAuthCookie) {
      sanitized.ccwAuthCookie = '';
    }
    if (sanitized.azureDevOpsToken) {
      sanitized.azureDevOpsToken = '';
    }
    if (sanitized.qualitySources) {
      sanitized.qualitySources = sanitized.qualitySources.map((qs) => ({
        ...qs,
        apiToken: '',
        hasApiToken: Boolean(qs.apiToken && qs.apiToken.trim().length > 0)
      }));
    }
    return sanitized;
  }

  /**
   * Exporta as configurações atuais como JSON, opcionalmente limpando senhas sensíveis.
   */
  public exportSettings(sanitizePasswords = true): string {
    const current: AppSettings = this.getSettings();
    const toExport = sanitizePasswords ? this.sanitizeSecrets(current) : structuredClone(current);
    return JSON.stringify(toExport, null, 2);
  }

  /**
   * Sinaliza perfis importados que contêm passos do tipo "comando" — estes executam
   * texto arbitrário no SO quando o perfil é rodado. O import em si não bloqueia
   * (é a finalidade da feature de compartilhar automações entre colegas), mas o
   * chamador deve exibir este aviso antes do usuário rodar o perfil importado.
   */
  private collectCommandStepWarnings(profiles: unknown, kind: string): string[] {
    if (!Array.isArray(profiles)) return [];
    const warnings: string[] = [];
    for (const profile of profiles) {
      const steps = Array.isArray((profile as any)?.steps) ? (profile as any).steps : [];
      const commandStep = steps.find((s: any) => s?.type === 'command' && s?.command);
      if (commandStep) {
        const label = (profile as any)?.name || (profile as any)?.id || '?';
        warnings.push(`${kind} "${label}" executa um comando do sistema ("${commandStep.command}") quando rodado.`);
      }
    }
    return warnings;
  }

  /**
   * Importa e mescla configurações a partir de um JSON exportado.
   */
  public importSettings(
    jsonString: string
  ): { success: boolean; error?: string; settings?: AppSettings; warnings?: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Formato JSON inválido.' };
      }

      const current = this.getSettings();
      const merged: Partial<AppSettings> = {};

      if (Array.isArray(parsed.automationProfiles)) merged.automationProfiles = parsed.automationProfiles;
      if (typeof parsed.activeProfileId === 'string') merged.activeProfileId = parsed.activeProfileId;
      if (Array.isArray(parsed.deployProfiles)) merged.deployProfiles = parsed.deployProfiles;
      if (typeof parsed.activeDeployProfileId === 'string') merged.activeDeployProfileId = parsed.activeDeployProfileId;
      if (Array.isArray(parsed.monitoredPorts)) merged.monitoredPorts = parsed.monitoredPorts;
      if (Array.isArray(parsed.trackedServices)) merged.trackedServices = parsed.trackedServices;
      if (Array.isArray(parsed.trackedProcesses)) merged.trackedProcesses = parsed.trackedProcesses;
      if (Array.isArray(parsed.favoriteRoutines)) merged.favoriteRoutines = parsed.favoriteRoutines;
      if (Array.isArray(parsed.mappedPrograms)) merged.mappedPrograms = parsed.mappedPrograms;
      if (Array.isArray(parsed.routineFileExtensions)) merged.routineFileExtensions = parsed.routineFileExtensions;
      if (parsed.routineLauncherMap && typeof parsed.routineLauncherMap === 'object' && !Array.isArray(parsed.routineLauncherMap)) {
        merged.routineLauncherMap = parsed.routineLauncherMap;
      }
      if (typeof parsed.webPort === 'number') merged.webPort = parsed.webPort;
      if (typeof parsed.webPath === 'string') merged.webPath = parsed.webPath;
      if (typeof parsed.winthorStartEnabled === 'boolean') merged.winthorStartEnabled = parsed.winthorStartEnabled;
      if (typeof parsed.winthorStartPort === 'number') merged.winthorStartPort = parsed.winthorStartPort;
      if (typeof parsed.wtaUrl === 'string') merged.wtaUrl = parsed.wtaUrl;
      if (typeof parsed.wtaLogin === 'string') merged.wtaLogin = parsed.wtaLogin;
      if (typeof parsed.wtaPassword === 'string') merged.wtaPassword = parsed.wtaPassword;
      if (typeof parsed.wtaAuthToken === 'string') merged.wtaAuthToken = parsed.wtaAuthToken;
      if (typeof parsed.winthorStartDefaultPayload === 'string') merged.winthorStartDefaultPayload = parsed.winthorStartDefaultPayload;
      if (typeof parsed.ccwBaseUrl === 'string') merged.ccwBaseUrl = parsed.ccwBaseUrl;
      if (typeof parsed.ccwWinthorVersion === 'string') merged.ccwWinthorVersion = parsed.ccwWinthorVersion;
      if (typeof parsed.ccwAuthCookie === 'string' && parsed.ccwAuthCookie) merged.ccwAuthCookie = parsed.ccwAuthCookie;
      if (typeof parsed.karafSshPort === 'number') merged.karafSshPort = parsed.karafSshPort;
      if (typeof parsed.karafDebugPort === 'number') merged.karafDebugPort = parsed.karafDebugPort;
      if (typeof parsed.ideName === 'string') merged.ideName = parsed.ideName;
      if (typeof parsed.karafScript === 'string') merged.karafScript = parsed.karafScript;

      if (Array.isArray(parsed.docFolders)) merged.docFolders = parsed.docFolders;

      if (Array.isArray(parsed.databaseConnections)) {
        merged.databaseConnections = parsed.databaseConnections.map((newConn: any) => {
          const existing = current.databaseConnections?.find(
            (c) => c.id === newConn.id || (c.host === newConn.host && c.user === newConn.user && c.database === newConn.database)
          );
          return {
            ...newConn,
            password: newConn.password || existing?.password || ''
          };
        });
      }

      if (Array.isArray(parsed.llmProviders)) {
        merged.llmProviders = parsed.llmProviders.map((newProv: any) => {
          const existing = current.llmProviders?.find((p) => p.id === newProv.id);
          // Só reaproveita a apiKey armazenada se o baseUrl não estiver mudando: caso
          // contrário, um arquivo de import adulterado poderia redirecionar a chave real
          // para um endpoint arbitrário. Se o baseUrl muda sem uma nova apiKey, exige reentrada.
          const baseUrlChanged = !!existing && !!newProv.baseUrl && newProv.baseUrl !== existing.baseUrl;
          return {
            ...newProv,
            apiKey: newProv.apiKey || (baseUrlChanged ? '' : existing?.apiKey || '')
          };
        });
      }

      if (typeof parsed.activeLlmProviderId === 'string') {
        merged.activeLlmProviderId = parsed.activeLlmProviderId;
      }

      if (parsed.automationDefaults && typeof parsed.automationDefaults === 'object') {
        merged.automationDefaults = parsed.automationDefaults;
      }
      if (typeof parsed.appPath === 'string') merged.appPath = parsed.appPath;
      if (typeof parsed.karafPath === 'string') merged.karafPath = parsed.karafPath;
      if (typeof parsed.jdkPath === 'string') merged.jdkPath = parsed.jdkPath;
      if (typeof parsed.intellijPath === 'string') merged.intellijPath = parsed.intellijPath;
      if (typeof parsed.projectsPath === 'string') merged.projectsPath = parsed.projectsPath;
      if (typeof parsed.targetPrBranch === 'string') merged.targetPrBranch = parsed.targetPrBranch;
      if (typeof parsed.karafUser === 'string') merged.karafUser = parsed.karafUser;
      if (typeof parsed.karafPass === 'string' && parsed.karafPass) merged.karafPass = parsed.karafPass;
      if (typeof parsed.azureDevOpsToken === 'string' && parsed.azureDevOpsToken) merged.azureDevOpsToken = parsed.azureDevOpsToken;

      if (Array.isArray(parsed.qualitySources)) {
        merged.qualitySources = parsed.qualitySources.map((newSrc: any) => {
          const existing = current.qualitySources?.find((s) => s.id === newSrc.id);
          const baseUrlChanged = !!existing && !!newSrc.baseUrl && newSrc.baseUrl !== existing.baseUrl;
          return {
            ...newSrc,
            apiToken: newSrc.apiToken || (baseUrlChanged ? '' : existing?.apiToken || '')
          };
        });
      }

      if (typeof parsed.activeQualitySourceId === 'string') {
        merged.activeQualitySourceId = parsed.activeQualitySourceId;
      }

      const warnings = [
        ...this.collectCommandStepWarnings(merged.automationProfiles, 'Perfil de automação'),
        ...this.collectCommandStepWarnings(merged.deployProfiles, 'Perfil de deploy')
      ];

      const saved = this.saveSettings(merged);
      return { success: true, settings: saved, warnings: warnings.length > 0 ? warnings : undefined };
    } catch (err: any) {
      return { success: false, error: `Falha ao processar arquivo JSON: ${err?.message || err}` };
    }
  }
}
