import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AppSettings,
  PathStatusInfo,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  AutomationProfile
} from '../../shared/types';

export const DEFAULT_MONITORED_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug (JVM)', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

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
    path.join(userHome, 'projetosTOTVS'),
    'C:\\Projetos',
    'C:\\projetosTOTVS'
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
    'C:\\pcsist\\produtos\\winthor',
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
    'C:\\pcsist\\produtos\\winthor-jdk',
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
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_MONITORED_PORTS,
    trackedServices: DEFAULT_TRACKED_SERVICES,
    trackedProcesses: DEFAULT_TRACKED_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION_CONFIG,
    automationProfiles: DEFAULT_AUTOMATION_PROFILES,
    activeProfileId: DEFAULT_AUTOMATION_PROFILES[0]?.id
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

export class ConfigService {
  private configPath: string;

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

  public getSettings(): AppSettings {
    const defaultConfig = getDynamicDefaultConfig();
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const automationProfiles =
          parsed.automationProfiles && Array.isArray(parsed.automationProfiles) && parsed.automationProfiles.length > 0
            ? parsed.automationProfiles
            : DEFAULT_AUTOMATION_PROFILES;
        const activeProfileId = parsed.activeProfileId || automationProfiles[0]?.id;

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

        return {
          ...defaultConfig,
          ...parsed,
          appPath: parsed.appPath || legacyAppPath || defaultConfig.appPath,
          webPort: parsed.webPort || legacyWebPort || defaultConfig.webPort,
          webPath: parsed.webPath !== undefined ? parsed.webPath : (legacyWebPath !== undefined ? legacyWebPath : defaultConfig.webPath),
          karafSshPort: parsed.karafSshPort || defaultConfig.karafSshPort,
          karafDebugPort: parsed.karafDebugPort || defaultConfig.karafDebugPort,
          monitoredPorts: parsed.monitoredPorts && parsed.monitoredPorts.length > 0 ? parsed.monitoredPorts : DEFAULT_MONITORED_PORTS,
          trackedServices: parsed.trackedServices && parsed.trackedServices.length > 0 ? parsed.trackedServices : DEFAULT_TRACKED_SERVICES,
          trackedProcesses: parsed.trackedProcesses && parsed.trackedProcesses.length > 0 ? parsed.trackedProcesses : DEFAULT_TRACKED_PROCESSES,
          automationDefaults: parsed.automationDefaults ? { ...DEFAULT_AUTOMATION_CONFIG, ...parsed.automationDefaults } : DEFAULT_AUTOMATION_CONFIG,
          automationProfiles,
          activeProfileId
        };
      }
    } catch (err) {
      console.error('Erro ao ler configurações:', err);
    }
    return defaultConfig;
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
    return updated;
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
      const exists = fs.existsSync(targetPath);
      if (!exists) {
        return { path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho não encontrado no disco' };
      }
      const stat = fs.statSync(targetPath);
      return {
        path: targetPath,
        exists: true,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        message: stat.isDirectory() ? 'Diretório acessível' : 'Arquivo acessível'
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
}
