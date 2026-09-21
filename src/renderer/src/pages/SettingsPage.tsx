import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Folder,
  FolderOpen,
  KeyRound,
  GitBranch,
  RotateCcw,
  Sparkles,
  Radio,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  HardDrive,
  Code2,
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  FileCode2,
  Server,
  Flame,
  Zap,
  Globe,
  Terminal,
  Download,
  Upload,
  ShieldCheck,
  ChevronDown,
  ScrollText,
  Database,
  HardDriveDownload,
  Bot,
  Sliders,
  Cpu,
  Activity
} from 'lucide-react';
import {
  AppSettings,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  PathStatusInfo,
  detectIdeInfo,
  RealtimeLogSource,
  EnvironmentProfile,
  LlmProviderConfig,
  LlmProviderType,
  LlmTestResult,
  DEFAULT_LLM_PROVIDER_TEMPLATES
} from '../../../shared/types';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { SETTINGS_TOUR_STEPS, SETTINGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/settingsTour';
import {
  addToList,
  coercePortFieldValue,
  computeSetupChecklistStatus,
  removeAtIndex,
  updateAtIndex
} from '../utils/settingsListEditors';

interface SettingsPageProps {
  onSettingsSaved?: () => void;
  onNavigate?: (tab: string) => void;
}

const DEFAULT_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local (WTA)', enabled: true },
  { port: 9195, label: 'WinThor Start (Launcher Delphi)', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

const DEFAULT_SERVICES: TrackedServiceConfig[] = [];

const DEFAULT_PROCESSES: TrackedProcessConfig[] = [];

const DEFAULT_AUTOMATION: EnvironmentAutomationConfig = {
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

const DEFAULT_LOG_SOURCES: RealtimeLogSource[] = [];

type SettingsTab = 'dirs' | 'karaf' | 'azure' | 'services' | 'ports' | 'automation' | 'logs' | 'backup' | 'ai';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsSaved, onNavigate }) => {
  const tour = usePageTour(SETTINGS_TOUR_STORAGE_KEY);
  const [activeTab, setActiveTab] = useState<SettingsTab>('dirs');
  const [settings, setSettings] = useState<AppSettings>({
    appPath: '',
    karafPath: '',
    jdkPath: '',
    karafScript: '',
    karafUser: 'karaf',
    karafPass: 'karaf',
    intellijPath: '',
    projectsPath: '',
    targetPrBranch: 'develop',
    favoriteRoutines: [],
    webPort: 8889,
    webPath: '',
    winthorStartEnabled: true,
    winthorStartPort: 9195,
    wtaUrl: 'http://localhost:8889',
    wtaLogin: 'PCADMIN',
    wtaPassword: '',
    wtaAuthToken: '',
    winthorStartDefaultPayload: '',
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_PORTS,
    trackedServices: DEFAULT_SERVICES,
    trackedProcesses: DEFAULT_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION,
    pgDumpPath: '',
    expdpPath: '',
    mysqldumpPath: '',
    psqlPath: '',
    impdpPath: '',
    mysqlPath: ''
  });

  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEnvironmentProfileLabel, setNewEnvironmentProfileLabel] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [launcherRows, setLauncherRows] = useState<{ ext: string; path: string }[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IA & Provedores LLM (BYOK)
  const [editingLlmProvider, setEditingLlmProvider] = useState<Partial<LlmProviderConfig> | null>(null);
  const [isTestingLlmId, setIsTestingLlmId] = useState<string | null>(null);
  const [llmTestResults, setLlmTestResults] = useState<Record<string, LlmTestResult>>({});
  const [showLlmFormKey, setShowLlmFormKey] = useState<boolean>(false);

  const handleApplyLlmTemplate = (template: Omit<LlmProviderConfig, 'id'>) => {
    setEditingLlmProvider({
      ...template,
      id: editingLlmProvider?.id || `llm-${Date.now()}`
    });
  };

  const handleSaveLlmProvider = () => {
    if (!editingLlmProvider) return;
    const name = editingLlmProvider.name?.trim() || 'Provedor Personalizado';
    const model = editingLlmProvider.model?.trim() || 'gpt-4o-mini';
    const providerType: LlmProviderType = editingLlmProvider.provider || 'openai';
    const id = editingLlmProvider.id || `llm-${Date.now()}`;

    const newProvider: LlmProviderConfig = {
      id,
      name,
      provider: providerType,
      apiKey: editingLlmProvider.apiKey?.trim() || '',
      baseUrl: editingLlmProvider.baseUrl?.trim() || undefined,
      model,
      temperature: editingLlmProvider.temperature ?? 0.7,
      maxTokens: editingLlmProvider.maxTokens ?? 2048,
      timeoutMs: editingLlmProvider.timeoutMs ?? 30000,
      enabled: editingLlmProvider.enabled ?? true,
      isDefault: editingLlmProvider.isDefault ?? false
    };

    setSettings((prev) => {
      const existing = prev.llmProviders || [];
      const index = existing.findIndex((p) => p.id === id);
      let updated: LlmProviderConfig[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = newProvider;
      } else {
        updated = [...existing, newProvider];
      }

      const activeId = prev.activeLlmProviderId || id;
      return {
        ...prev,
        llmProviders: updated,
        activeLlmProviderId: activeId
      };
    });

    setEditingLlmProvider(null);
  };

  const handleDeleteLlmProvider = (id: string) => {
    setSettings((prev) => {
      const updated = (prev.llmProviders || []).filter((p) => p.id !== id);
      const nextActive = prev.activeLlmProviderId === id ? updated[0]?.id : prev.activeLlmProviderId;
      return {
        ...prev,
        llmProviders: updated,
        activeLlmProviderId: nextActive
      };
    });
  };

  const handleToggleLlmProvider = (id: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      llmProviders: (prev.llmProviders || []).map((p) => (p.id === id ? { ...p, enabled } : p))
    }));
  };

  const handleSetActiveLlmProvider = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      activeLlmProviderId: id
    }));
  };

  const handleTestLlmConnection = async (provider: LlmProviderConfig) => {
    setIsTestingLlmId(provider.id);
    try {
      const tester = window.electronAPI?.testLlmConnection;
      if (!tester) {
        throw new Error('API não disponível no ambiente atual.');
      }
      const result = await tester(provider);
      setLlmTestResults((prev) => ({ ...prev, [provider.id]: result }));
    } catch (err: any) {
      setLlmTestResults((prev) => ({
        ...prev,
        [provider.id]: { success: false, message: err?.message || 'Falha ao testar conexão' }
      }));
    } finally {
      setIsTestingLlmId(null);
    }
  };

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const row of launcherRows) {
      if (row.ext.trim()) {
        const key = row.ext.trim().startsWith('.') ? row.ext.trim().toUpperCase() : `.${row.ext.trim().toUpperCase()}`;
        map[key] = row.path.trim();
      }
    }
    setSettings((prev) => ({ ...prev, routineLauncherMap: map }));
  }, [launcherRows]);

  // Checklist de Primeira Configuração: orienta o usuário novo pelas etapas essenciais
  const setupChecklist = useMemo(() => {
    const actionsById: Record<string, () => void> = {
      dirs: () => setActiveTab('dirs'),
      ide: () => setActiveTab('dirs'),
      'karaf-creds': () => setActiveTab('karaf'),
      database: () => onNavigate?.('database')
    };
    return computeSetupChecklistStatus(
      { karafUser: settings.karafUser, karafPass: settings.karafPass, databaseConnections: settings.databaseConnections },
      pathStatuses
    ).map((item) => ({
      ...item,
      action: actionsById[item.id]
    }));
  }, [pathStatuses, settings.karafUser, settings.karafPass, settings.databaseConnections, onNavigate]);
  const pendingChecklistCount = setupChecklist.filter((item) => !item.done).length;

  // Validação de Caminhos
  const validateAllPaths = useCallback(async (st: AppSettings) => {
    const checkPath = window.electronAPI?.checkPath;
    if (!checkPath) return;

    const keys: (keyof AppSettings)[] = ['projectsPath', 'karafPath', 'jdkPath', 'appPath', 'intellijPath'];
    const entries = await Promise.all(
      keys.map(async (key) => {
        const val = st[key];
        if (typeof val === 'string' && val.trim()) {
          return [key, await checkPath(val)] as const;
        }
        return null;
      })
    );
    const results: Record<string, PathStatusInfo> = {};
    for (const entry of entries) {
      if (entry) results[entry[0]] = entry[1];
    }
    setPathStatuses(results);
  }, []);

  const validateSinglePath = async (key: string, val: string) => {
    if (window.electronAPI && window.electronAPI.checkPath) {
      if (!val || !val.trim()) {
        setPathStatuses((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        return;
      }
      const status = await window.electronAPI.checkPath(val);
      setPathStatuses((prev) => ({ ...prev, [key]: status }));
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((st) => {
        const loaded: AppSettings = {
          ...st,
          jdkPath: st.jdkPath || '',
          karafScript: st.karafScript || '',
          webPort: st.webPort || 8889,
          webPath: st.webPath || '',
          winthorStartEnabled: st.winthorStartEnabled !== undefined ? st.winthorStartEnabled : true,
          winthorStartPort: st.winthorStartPort || 9195,
          wtaUrl: st.wtaUrl || 'http://localhost:8889',
          wtaLogin: st.wtaLogin !== undefined ? st.wtaLogin : 'PCADMIN',
          wtaPassword: st.wtaPassword || '',
          wtaAuthToken: st.wtaAuthToken || '',
          winthorStartDefaultPayload: st.winthorStartDefaultPayload || '',
          karafSshPort: st.karafSshPort || 8101,
          karafDebugPort: st.karafDebugPort || 5005,
          monitoredPorts: st.monitoredPorts && st.monitoredPorts.length > 0 ? st.monitoredPorts : DEFAULT_PORTS,
          trackedServices: st.trackedServices && st.trackedServices.length > 0 ? st.trackedServices : DEFAULT_SERVICES,
          trackedProcesses: st.trackedProcesses && st.trackedProcesses.length > 0 ? st.trackedProcesses : DEFAULT_PROCESSES,
          automationDefaults: st.automationDefaults || DEFAULT_AUTOMATION,
          pgDumpPath: st.pgDumpPath || '',
          expdpPath: st.expdpPath || '',
          mysqldumpPath: st.mysqldumpPath || '',
          psqlPath: st.psqlPath || '',
          impdpPath: st.impdpPath || '',
          mysqlPath: st.mysqlPath || ''
        };
        setSettings(loaded);
        setLauncherRows(Object.entries(st.routineLauncherMap || {}).map(([ext, path]) => ({ ext, path })));
        validateAllPaths(loaded);
      });
    }
  }, [validateAllPaths]);

  const handleAddLauncherRow = () => {
    setLauncherRows((prev) => [...prev, { ext: '', path: '' }]);
  };

  const handleUpdateLauncherRow = (index: number, field: 'ext' | 'path', value: string) => {
    setLauncherRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleRemoveLauncherRow = (index: number) => {
    setLauncherRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBrowseLauncherPath = async (index: number) => {
    if (window.electronAPI && window.electronAPI.selectFile) {
      const selected = await window.electronAPI.selectFile();
      if (selected) {
        handleUpdateLauncherRow(index, 'path', selected);
      }
    }
  };

  const handleBrowseDirectory = async (field: keyof AppSettings) => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const current = (settings[field] as string) || '';
      const selected = await window.electronAPI.selectDirectory(current);
      if (selected) {
        const updated = { ...settings, [field]: selected };
        setSettings(updated);
        validateSinglePath(field, selected);
      }
    }
  };

  const handleBrowseFile = async (field: keyof AppSettings) => {
    if (window.electronAPI && window.electronAPI.selectFile) {
      const current = (settings[field] as string) || '';
      const isScript = field === 'karafScript';
      const selected = await window.electronAPI.selectFile({
        defaultPath: current,
        filters: isScript
          ? [
              { name: 'Scripts de Inicialização (*.bat, *.cmd, *.sh)', extensions: ['bat', 'cmd', 'sh'] },
              { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
            ]
          : [
              { name: 'Executáveis da IDE (*.exe)', extensions: ['exe'] },
              { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
            ]
      });
      if (selected) {
        const updated = { ...settings, [field]: selected };
        setSettings(updated);
        validateSinglePath(field, selected);
      }
    }
  };

  const handleAutoDetect = async () => {
    if (window.electronAPI && window.electronAPI.autoDetectPaths) {
      setIsDetecting(true);
      try {
        const detected = await window.electronAPI.autoDetectPaths();
        const updated = { ...settings, ...detected };
        setSettings(updated);
        await validateAllPaths(updated);
      } finally {
        setIsDetecting(false);
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(settings);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
        if (onSettingsSaved) onSettingsSaved();
      }
    } finally {
      setIsSaving(false);
    }
  };

  /** Campos que compõem um preset de ambiente — os mesmos que EnvironmentProfile declara em shared/types. */
  const ENVIRONMENT_PROFILE_FIELDS = [
    'projectsPath',
    'karafPath',
    'jdkPath',
    'intellijPath',
    'appPath',
    'webPort',
    'karafSshPort',
    'karafDebugPort',
    'monitoredPorts'
  ] as const;

  const handleSaveCurrentAsEnvironmentProfile = async () => {
    const label = newEnvironmentProfileLabel.trim();
    if (!label || !window.electronAPI) return;
    const profile: EnvironmentProfile = { id: `envprofile_${Date.now()}`, label };
    for (const field of ENVIRONMENT_PROFILE_FIELDS) {
      (profile as any)[field] = settings[field];
    }
    const updated = [...(settings.environmentProfiles || []), profile];
    setSettings({ ...settings, environmentProfiles: updated });
    await window.electronAPI.saveSettings({ environmentProfiles: updated });
    setNewEnvironmentProfileLabel('');
  };

  const handleActivateEnvironmentProfile = async (profile: EnvironmentProfile) => {
    if (!window.electronAPI) return;
    const fieldsToApply: Partial<AppSettings> = { activeEnvironmentProfileId: profile.id };
    for (const field of ENVIRONMENT_PROFILE_FIELDS) {
      if (profile[field] !== undefined) (fieldsToApply as any)[field] = profile[field];
    }
    const merged = { ...settings, ...fieldsToApply };
    setSettings(merged);
    await window.electronAPI.saveSettings(fieldsToApply);
    validateAllPaths(merged);
  };

  const handleDeleteEnvironmentProfile = async (id: string) => {
    if (!window.electronAPI) return;
    const updated = (settings.environmentProfiles || []).filter((p) => p.id !== id);
    setSettings({ ...settings, environmentProfiles: updated });
    await window.electronAPI.saveSettings({ environmentProfiles: updated });
  };

  const handleExportSettings = async (sanitizePasswords: boolean) => {
    try {
      setExportMenuOpen(false);
      if (!window.electronAPI?.exportSettings) return;
      const json = await window.electronAPI.exportSettings(sanitizePasswords);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dev-manager-settings-${sanitizePasswords ? 'seguro' : 'completo'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatusMessage(
        sanitizePasswords
          ? 'Configurações exportadas com segurança (senhas omitidas)!'
          : 'Backup completo de configurações exportado!'
      );
      setTimeout(() => setImportStatusMessage(null), 3500);
    } catch (err: any) {
      alert(`Falha ao exportar configurações: ${err?.message || err}`);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!window.electronAPI?.importSettings) return;
      const res: any = await window.electronAPI.importSettings(text);
      if (res && res.success === false) {
        throw new Error(res.error || 'Falha ao validar arquivo JSON');
      }
      const imported: AppSettings = (res?.settings || res) as AppSettings;
      setSettings(imported);
      await validateAllPaths(imported);
      if (onSettingsSaved) onSettingsSaved();
      if (res?.warnings?.length) {
        alert(
          `Configurações importadas, mas atenção:\n\n${res.warnings.join('\n')}\n\n` +
            'Revise esses perfis antes de executá-los — eles rodam comandos no seu computador.'
        );
      }
      setImportStatusMessage('Configurações importadas e aplicadas com sucesso!');
      setTimeout(() => setImportStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Erro ao importar arquivo de configurações: ${err?.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  // Gerenciamento de Serviços Windows
  const handleAddService = (name = 'NovoServico', displayName = 'Novo Serviço Windows') => {
    setSettings({
      ...settings,
      trackedServices: addToList(settings.trackedServices, DEFAULT_SERVICES, {
        name,
        displayName,
        enabled: true,
        autoStop: true,
        autoStart: false
      })
    });
  };

  const handleUpdateService = (index: number, field: keyof TrackedServiceConfig, value: any) => {
    setSettings({
      ...settings,
      trackedServices: updateAtIndex(settings.trackedServices, DEFAULT_SERVICES, index, { [field]: value })
    });
  };

  const handleRemoveService = (index: number) => {
    setSettings({ ...settings, trackedServices: removeAtIndex(settings.trackedServices, DEFAULT_SERVICES, index) });
  };

  const handleResetServices = () => {
    setSettings({ ...settings, trackedServices: DEFAULT_SERVICES });
  };

  // Gerenciamento de Processos Conflitantes
  const handleAddProcess = (name = 'processo.exe', displayName = 'Processo em Segundo Plano') => {
    setSettings({
      ...settings,
      trackedProcesses: addToList(settings.trackedProcesses, DEFAULT_PROCESSES, {
        name,
        displayName,
        enabled: true,
        autoKill: true
      })
    });
  };

  const handleUpdateProcess = (index: number, field: keyof TrackedProcessConfig, value: any) => {
    setSettings({
      ...settings,
      trackedProcesses: updateAtIndex(settings.trackedProcesses, DEFAULT_PROCESSES, index, { [field]: value })
    });
  };

  const handleRemoveProcess = (index: number) => {
    setSettings({ ...settings, trackedProcesses: removeAtIndex(settings.trackedProcesses, DEFAULT_PROCESSES, index) });
  };

  const handleResetProcesses = () => {
    setSettings({ ...settings, trackedProcesses: DEFAULT_PROCESSES });
  };

  // Gerenciamento de Portas
  const handleAddPort = (port = 8080, label = 'Nova Porta') => {
    setSettings({
      ...settings,
      monitoredPorts: addToList(settings.monitoredPorts, DEFAULT_PORTS, { port, label, enabled: true })
    });
  };

  const handleUpdatePort = (index: number, field: keyof MonitoredPortConfig, value: any) => {
    setSettings({
      ...settings,
      monitoredPorts: updateAtIndex(settings.monitoredPorts, DEFAULT_PORTS, index, {
        [field]: coercePortFieldValue(field, value)
      })
    });
  };

  const handleRemovePort = (index: number) => {
    setSettings({ ...settings, monitoredPorts: removeAtIndex(settings.monitoredPorts, DEFAULT_PORTS, index) });
  };

  const handleResetPorts = () => {
    setSettings({ ...settings, monitoredPorts: DEFAULT_PORTS });
  };

  // Gerenciamento de Fontes de Logs em Tempo Real
  const handleAddLogSource = () => {
    const newId = `log-source-${Date.now()}`;
    setSettings({
      ...settings,
      realtimeLogSources: addToList(settings.realtimeLogSources, DEFAULT_LOG_SOURCES, {
        id: newId,
        name: 'Nova Fonte de Log',
        filePath: '',
        encoding: 'utf-8',
        enabled: true
      })
    });
  };

  const handleUpdateLogSource = (index: number, field: keyof RealtimeLogSource, value: any) => {
    setSettings({
      ...settings,
      realtimeLogSources: updateAtIndex(settings.realtimeLogSources, DEFAULT_LOG_SOURCES, index, { [field]: value })
    });
  };

  const handleRemoveLogSource = (index: number) => {
    setSettings({
      ...settings,
      realtimeLogSources: removeAtIndex(settings.realtimeLogSources, DEFAULT_LOG_SOURCES, index)
    });
  };

  const handleResetLogSources = () => {
    setSettings({ ...settings, realtimeLogSources: DEFAULT_LOG_SOURCES });
  };

  const handleBrowseLogPath = async (index: number) => {
    if (window.electronAPI && window.electronAPI.selectFile) {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Arquivos de Log (*.log, *.out, *.txt)', extensions: ['log', 'out', 'txt'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected) {
        handleUpdateLogSource(index, 'filePath', selected);
        const autoName = selected.split(/[\\/]/).pop()?.replace(/\.(log|out|txt)$/i, '');
        if (autoName) {
          handleUpdateLogSource(index, 'name', autoName);
        }
      }
    }
  };

  const presetBranches = ['develop', 'master', 'main', 'release/37.0', 'release/38.0'];

  const renderPathStatusBadge = (fieldKey: string) => {
    const status = pathStatuses[fieldKey];
    if (!status) return null;

    if (status.exists) {
      return (
        <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          <span className="font-medium">{status.message || 'Caminho acessível'}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
        <span className="font-medium">{status.message || 'Caminho não localizado no disco'}</span>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-5 space-y-4 overflow-y-auto">
      {/* Cabeçalho da Página de Configurações */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Configurações do Ambiente & Diretórios
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Perfil Local
              </span>
              <button
                type="button"
                onClick={tour.open}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                title="Rever o tour guiado desta página"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Configure os diretórios base, serviços Windows, processos de encerramento, portas e preferências de automação.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Input oculto para importação de JSON */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleImportFileChange}
            className="hidden"
          />

          {/* Importar Configurações */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2.5 bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            title="Importar configurações de um arquivo JSON compartilhado pela equipe"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>Importar</span>
          </button>

          {/* Menu de Exportação de Configurações */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="px-3 py-2.5 bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              title="Exportar configurações para compartilhar com o time ou criar backup"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Exportar</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-card border border-border shadow-2xl p-1.5 z-50 flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={() => handleExportSettings(true)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors hover:bg-muted text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-foreground">Exportação Segura (JSON)</div>
                      <div className="text-[10px] text-muted-foreground">Omite senhas do banco e Karaf (P/ Time)</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSettings(false)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors hover:bg-muted text-left"
                  >
                    <Download className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold text-foreground">Backup Completo (JSON)</div>
                      <div className="text-[10px] text-muted-foreground">Inclui todas as credenciais locais</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            data-tour="auto-detect-button"
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="px-3 py-2.5 bg-card hover:bg-muted text-primary border border-primary/30 hover:border-primary/60 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            title="Escanear automaticamente o disco local e identificar os diretórios instalados"
          >
            <Sparkles className={`w-3.5 h-3.5 text-primary ${isDetecting ? 'animate-spin' : ''}`} />
            <span>{isDetecting ? 'Detectando...' : 'Auto-Detectar'}</span>
          </button>

          <button
            data-tour="save-settings-button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] flex items-center space-x-2 border border-primary/40"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner de Feedback de Importação / Exportação */}
      {importStatusMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{importStatusMessage}</span>
        </div>
      )}

      {/* Checklist de Primeira Configuração */}
      {pendingChecklistCount > 0 && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border/80 shadow-sm shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Checklist de Configuração Inicial
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {setupChecklist.length - pendingChecklistCount}/{setupChecklist.length} concluídos
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {setupChecklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  item.done
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                }`}
                title={item.done ? `${item.label} - configurado` : `${item.label} - clique para configurar`}
              >
                {item.done ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abas de Navegação Interna das Configurações */}
      <div className="flex items-center space-x-2 border-b border-border pb-2 text-xs flex-wrap gap-y-2" data-tour="tabs-nav-dirs">
        <button
          onClick={() => setActiveTab('dirs')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'dirs'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Diretórios & IDE</span>
        </button>

        <button
          onClick={() => setActiveTab('karaf')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'karaf'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-500" />
          <span>Credenciais Karaf</span>
        </button>

        <button
          onClick={() => setActiveTab('azure')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'azure'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <GitBranch className="w-4 h-4 text-blue-500" />
          <span>Azure DevOps & Git</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'services'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Serviços Windows & Processos</span>
          <span className="text-[10px] bg-primary/20 text-foreground px-1.5 py-0.5 rounded-full font-mono">
            {(settings.trackedServices || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ports')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'ports'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Portas de Rede Monitoradas</span>
          <span className="text-[10px] bg-primary/20 text-foreground px-1.5 py-0.5 rounded-full font-mono">
            {(settings.monitoredPorts || []).length}
          </span>
        </button>

        <button
          data-tour="automation-defaults"
          onClick={() => setActiveTab('automation')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'automation'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Automação Padrão</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'logs'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <ScrollText className="w-4 h-4 text-emerald-500" />
          <span>Logs em Tempo Real</span>
          <span className="text-[10px] bg-primary/20 text-foreground px-1.5 py-0.5 rounded-full font-mono">
            {(settings.realtimeLogSources || DEFAULT_LOG_SOURCES).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'backup'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <HardDriveDownload className="w-4 h-4 text-sky-500" />
          <span>Backup de Bancos</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'ai'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Bot className="w-4 h-4 text-primary" />
          <span>IA & LLM (BYOK)</span>
          <span className="text-[10px] bg-primary/20 text-foreground px-1.5 py-0.5 rounded-full font-mono">
            {(settings.llmProviders || []).length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Diretórios & IDE */}
      {activeTab === 'dirs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-3 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Perfis de Ambiente
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Presets de paths/portas</span>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Salve o estado atual dos diretórios e portas abaixo como um preset nomeado, e alterne entre eles com um clique — útil pra quem trabalha com múltiplos clientes/ambientes na mesma máquina.
              </p>

              {(settings.environmentProfiles || []).length > 0 && (
                <ul className="space-y-1.5">
                  {(settings.environmentProfiles || []).map((profile) => {
                    const isActive = settings.activeEnvironmentProfileId === profile.id;
                    return (
                      <li
                        key={profile.id}
                        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                          isActive ? 'border-primary/50 bg-primary/10' : 'border-border/80 bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-foreground truncate">{profile.label}</span>
                          {isActive && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary shrink-0">
                              Ativo
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground truncate">{profile.projectsPath}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleActivateEnvironmentProfile(profile)}
                            disabled={isActive}
                            className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            Ativar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnvironmentProfile(profile.id)}
                            className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center gap-2" data-tour="environment-profiles">
                <input
                  type="text"
                  value={newEnvironmentProfileLabel}
                  onChange={(e) => setNewEnvironmentProfileLabel(e.target.value)}
                  placeholder="Rótulo do novo perfil (ex: Cliente A)..."
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCurrentAsEnvironmentProfile();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentAsEnvironmentProfile}
                  disabled={!newEnvironmentProfileLabel.trim()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Salvar estado atual como perfil</span>
                </button>
              </div>
            </div>

            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" /> Diretórios e Executáveis Locais
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Windows Explorer</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Diretório de Repositórios Git */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-bold text-foreground flex items-center gap-1.5"
                      title="Pasta onde ficam (ou vão ficar) os repositórios Git clonados. O Dev Manager escaneia essa pasta para listar seus projetos na aba Git & Azure DevOps."
                    >
                      <HardDrive className="w-3.5 h-3.5 text-primary" />
                      Diretório Base dos Repositórios Git:
                    </label>
                    {renderPathStatusBadge('projectsPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      data-tour="dirs-projects-path"
                      value={settings.projectsPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, projectsPath: val });
                        validateSinglePath('projectsPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Projetos ou C:\Users\seu.usuario\Projetos"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('projectsPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta no Windows Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-primary" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                {/* Diretório do Apache Karaf */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-bold text-foreground flex items-center gap-1.5"
                      title="Raiz da instalação do servidor Apache Karaf (a pasta que contém bin/client.bat). Usado para iniciar/parar o Karaf, abrir o console e rodar deploys."
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Diretório do Servidor Apache Karaf (OSGi):
                    </label>
                    {renderPathStatusBadge('karafPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      data-tour="dirs-karaf-path"
                      value={settings.karafPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, karafPath: val });
                        validateSinglePath('karafPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\servers\runtime ou C:\app\server"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('karafPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta do Karaf"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                {/* Diretório Java JDK / JRE (JAVA_HOME) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-bold text-foreground flex items-center gap-1.5"
                      title="JDK usado para compilar/rodar o Karaf embutido e builds Maven. Equivalente à variável de ambiente JAVA_HOME."
                    >
                      <HardDrive className="w-3.5 h-3.5 text-orange-500" />
                      Diretório Java JDK (JAVA_HOME):
                    </label>
                    {renderPathStatusBadge('jdkPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.jdkPath || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, jdkPath: val });
                        validateSinglePath('jdkPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Program Files\Java\jdk-17 ou C:\tools\jdk..."
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('jdkPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta do JDK"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Utilizado pelo runtime, compilador Maven e scripts. Se vazio, detecta o JAVA_HOME padrão do sistema operacional.
                  </p>
                </div>

                {/* Script de Inicialização Customizado do Karaf */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                      Script de Inicialização do Karaf (Opcional):
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.karafScript || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, karafScript: val });
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: start.bat, run.bat ou caminho completo"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('karafScript')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar script .bat / .cmd"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Script usado para subir o servidor na automação. Se vazio, prioriza os scripts padrão detectados na raiz.
                  </p>
                </div>

                {/* Diretório Base das Rotinas (Prod) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-emerald-500" />
                      Diretório Raiz das Rotinas / Binários (Prod):
                    </label>
                    {renderPathStatusBadge('appPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.appPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, appPath: val });
                        validateSinglePath('appPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\app ou C:\ERP"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('appPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta das Rotinas"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                {/* Extensões e Launchers do Catálogo de Rotinas */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
                    Extensões Reconhecidas como Rotina:
                  </label>
                  <input
                    type="text"
                    value={(settings.routineFileExtensions || ['.EXE']).join(', ')}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => (s.startsWith('.') ? s.toUpperCase() : `.${s.toUpperCase()}`));
                      setSettings({ ...settings, routineFileExtensions: list });
                    }}
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                    placeholder=".EXE, .BAT"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Separadas por vírgula. Arquivos com essas extensões aparecem no Catálogo de Rotinas.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
                      Launchers por Extensão (opcional):
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLauncherRow}
                      className="px-2 py-1 bg-card hover:bg-muted border border-border rounded-lg text-[10px] font-semibold text-foreground transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Para formatos que não rodam sozinhos (ex: um arquivo de rotina que precisa ser aberto por outro
                    programa), aponte aqui a extensão e o executável que deve abri-lo.
                  </p>
                  {launcherRows.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.ext}
                        onChange={(e) => handleUpdateLauncherRow(index, 'ext', e.target.value)}
                        placeholder=".PC"
                        className="w-20 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
                      />
                      <input
                        type="text"
                        value={row.path}
                        onChange={(e) => handleUpdateLauncherRow(index, 'path', e.target.value)}
                        placeholder="Caminho do executável launcher"
                        className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleBrowseLauncherPath(index)}
                        className="p-1.5 bg-card hover:bg-muted border border-border rounded-lg shrink-0"
                        title="Selecionar executável"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLauncherRow(index)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Integração WinThor Start & WTA */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-500" /> Integração WinThor Start (DataSnap) & WTA
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Abre rotinas desktop autenticadas via serviço local do WinThor Start sem necessitar do menu aberto.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.winthorStartEnabled ?? true}
                        onChange={(e) => setSettings({ ...settings, winthorStartEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Porta do WinThor Start:
                      </label>
                      <input
                        type="number"
                        value={settings.winthorStartPort ?? 9195}
                        onChange={(e) => setSettings({ ...settings, winthorStartPort: parseInt(e.target.value) || 9195 })}
                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                        placeholder="9195"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        URL do Portal WTA:
                      </label>
                      <input
                        type="text"
                        value={settings.wtaUrl || 'http://localhost:8889'}
                        onChange={(e) => setSettings({ ...settings, wtaUrl: e.target.value })}
                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                        placeholder="http://localhost:8889"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Usuário WTA (Login Automático):
                      </label>
                      <input
                        type="text"
                        value={settings.wtaLogin || ''}
                        onChange={(e) => setSettings({ ...settings, wtaLogin: e.target.value })}
                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                        placeholder="Ex: PCADMIN"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Senha / Hash WTA:
                      </label>
                      <input
                        type="password"
                        value={settings.wtaPassword || ''}
                        onChange={(e) => setSettings({ ...settings, wtaPassword: e.target.value })}
                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                        placeholder="Senha ou Hash MD5 do WTA"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Cookie de Autenticação WTA (Cookie <code>suukie</code>):
                      </label>
                      <input
                        type="password"
                        value={settings.wtaAuthToken || ''}
                        onChange={(e) => setSettings({ ...settings, wtaAuthToken: e.target.value })}
                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                        placeholder="Cole o valor do cookie 'suukie' do WTA (opcional)"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Permite que o Dev Manager consulte os parâmetros atualizados direto da sua sessão web.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Payload de Fallback (JSON com <code>m, u, p, t, s</code>):
                      </label>
                      <textarea
                        rows={2}
                        value={settings.winthorStartDefaultPayload || ''}
                        onChange={(e) => setSettings({ ...settings, winthorStartDefaultPayload: e.target.value })}
                        className="w-full bg-muted/40 border border-border rounded-lg p-2 text-foreground font-mono text-[11px] focus:outline-none focus:border-primary resize-none"
                        placeholder='{"m":"...","u":"...","p":"...","t":"...","s":"..."}'
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Usado como parâmetros fixos quando o WTA estiver fechado ou sem cookie ativo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executável da IDE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-bold text-foreground flex items-center gap-1.5"
                      title="Caminho do .exe da sua IDE (IntelliJ IDEA, VS Code, etc). Usado pelo botão 'Abrir na IDE' para abrir projetos com um clique."
                    >
                      <Code2 className="w-3.5 h-3.5 text-primary" />
                      Executável da IDE / Editor de Código:
                    </label>
                    {renderPathStatusBadge('intellijPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.intellijPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, intellijPath: val });
                        validateSinglePath('intellijPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: idea64.exe, Code.exe, Cursor.exe..."
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('intellijPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar executável (.exe)"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-primary" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                {/* Rótulo de Exibição da IDE */}
                <div className="md:col-span-2 pt-1">
                  <div className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1">
                    <label className="block text-[11px] font-bold text-foreground">
                      Rótulo de Exibição da IDE (Opcional):
                    </label>
                    <input
                      type="text"
                      value={settings.ideName || ''}
                      onChange={(e) => setSettings({ ...settings, ideName: e.target.value })}
                      className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors"
                      placeholder={`Padrão automático: "${detectIdeInfo(settings.intellijPath).name}"`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Credenciais Karaf */}
      {activeTab === 'karaf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" /> Credenciais & Autenticação do Apache Karaf
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Utilizado para autenticação no <code className="font-mono text-amber-500">client.bat</code> (OSGi) e comandos SSH remotos.
                  </p>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  client.bat SSH
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-foreground mb-1">Usuário Karaf (SSH / client.bat):</label>
                  <input
                    type="text"
                    value={settings.karafUser}
                    onChange={(e) => setSettings({ ...settings, karafUser: e.target.value })}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                    placeholder="karaf"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Usuário configurado em <code>{settings.karafPath}\etc\users.properties</code> (Padrão: <code>karaf</code>).
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1 flex items-center justify-between">
                    <span>Senha Karaf:</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-normal flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.karafPass}
                    onChange={(e) => setSettings({ ...settings, karafPass: e.target.value })}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                    placeholder="karaf"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Senha de acesso SSH (Padrão: <code>karaf</code>).
                  </p>
                </div>

                <div className="pt-1">
                  <label className="block font-bold text-foreground mb-1">Porta SSH do Karaf (client.bat):</label>
                  <input
                    type="number"
                    value={settings.karafSshPort ?? 8101}
                    onChange={(e) => setSettings({ ...settings, karafSshPort: parseInt(e.target.value) || 0 })}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                    placeholder="8101"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Porta de conexão do console interativo via <code>client.bat -a 8101</code>.
                  </p>
                </div>

                <div className="pt-1">
                  <label className="block font-bold text-foreground mb-1">Porta Debug Remote JVM (Java):</label>
                  <input
                    type="number"
                    value={settings.karafDebugPort ?? 5005}
                    onChange={(e) => setSettings({ ...settings, karafDebugPort: parseInt(e.target.value) || 0 })}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                    placeholder="5005"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Porta JDWP para depuração remota via IntelliJ / IDE.
                  </p>
                </div>
              </div>

              {/* Box Informativo de Uso */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-foreground space-y-1">
                <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> Uso das Credenciais Karaf no Sistema
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Estas credenciais são enviadas automaticamente ao script <code className="font-mono text-foreground">{settings.karafPath}\bin\client.bat</code> durante as operações de deploy na aba <strong>Deploy OSGi Karaf</strong> e execução de diagnósticos (<code>feature:list</code>, <code>bundle:list</code>, <code>log:display</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Azure DevOps & Git */}
      {activeTab === 'azure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-blue-500" /> Configurações do Git & Azure DevOps
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Parâmetros para criação automatizada de Pull Requests e rastreamento de repositórios.
                  </p>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  dev.azure.com
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Branch Padrão para Pull Requests */}
                <div className="space-y-2">
                  <label
                    className="block font-bold text-foreground flex items-center gap-1.5"
                    title="Branch de destino sugerido ao criar um novo Pull Request no Azure DevOps (ex: develop, main)."
                  >
                    <GitBranch className="w-3.5 h-3.5 text-primary" /> Branch Padrão para Pull Requests:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={settings.targetPrBranch}
                      onChange={(e) => setSettings({ ...settings, targetPrBranch: e.target.value })}
                      className="flex-1 min-w-[200px] bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                      placeholder="develop"
                    />
                    {presetBranches.map((br) => (
                      <button
                        key={br}
                        type="button"
                        onClick={() => setSettings({ ...settings, targetPrBranch: br })}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                          settings.targetPrBranch === br
                            ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {br}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Branch alvo utilizada por padrão na aba <strong>Git & Azure DevOps</strong> ao gerar URLs diretas para Pull Requests no Azure.
                  </p>
                </div>

                {/* Diretório de Repositórios Git */}
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-bold text-foreground flex items-center gap-1.5"
                      title="Pasta onde ficam (ou vão ficar) os repositórios Git clonados. O Dev Manager escaneia essa pasta para listar seus projetos na aba Git & Azure DevOps."
                    >
                      <HardDrive className="w-3.5 h-3.5 text-primary" />
                      Diretório Base dos Repositórios Git:
                    </label>
                    {renderPathStatusBadge('projectsPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.projectsPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, projectsPath: val });
                        validateSinglePath('projectsPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Projetos ou C:\Users\seu.usuario\Projetos"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('projectsPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta no Windows Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-primary" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    O Dev Manager realiza a varredura das pastas contidas neste diretório procurando por projetos Git com remote do Azure DevOps.
                  </p>
                </div>
              </div>

              {/* Box Informativo de Integração Azure */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 text-xs text-foreground space-y-1">
                <span className="font-bold text-blue-600 dark:text-blue-400 block flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4" /> Integração com o Azure DevOps (dev.azure.com)
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O painel lê automaticamente as configurações dos repositórios localizados em seu computador (identificando a organização, projeto e nome do repositório no Azure DevOps). Ao clicar para abrir um Pull Request, a URL é montada com o <code>sourceRef</code> (sua branch local) e o <code>targetRef</code> (a branch padrão configurada acima).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Serviços Windows & Processos */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Card: Serviços Windows Monitorados */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" /> Serviços Windows Monitorados
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Serviços gerenciados pelo painel com suporte a parada e início automatizados.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleResetServices}
                    className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
                    title="Restaurar lista de serviços padrão"
                  >
                    <RotateCcw className="w-3 h-3 text-muted-foreground" />
                    <span>Restaurar Padrões</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddService()}
                    className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Serviço</span>
                  </button>
                </div>
              </div>

              {/* Lista de Serviços */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {(settings.trackedServices || DEFAULT_SERVICES).map((srv, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex flex-col space-y-2 transition-all ${
                      srv.enabled
                        ? 'bg-card border-border hover:border-primary/40'
                        : 'bg-muted/40 border-border/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateService(index, 'enabled', !srv.enabled)}
                        className={`p-1 rounded text-xs transition-colors ${
                          srv.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                        }`}
                        title={srv.enabled ? 'Clique para Desativar Monitoramento' : 'Clique para Ativar'}
                      >
                        {srv.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={srv.displayName}
                          onChange={(e) => handleUpdateService(index, 'displayName', e.target.value)}
                          className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                          placeholder="Nome Amigável (ex: Serviço API Local)"
                        />
                        <input
                          type="text"
                          value={srv.name}
                          onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                          className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-muted-foreground focus:outline-none focus:border-primary"
                          placeholder="Nome do Serviço (ex: MeuServico.API)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Remover Serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Checkboxes de Automação Padrão */}
                    <div className="flex items-center space-x-4 pl-9 text-[11px] text-muted-foreground">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={srv.autoStop ?? true}
                          onChange={(e) => handleUpdateService(index, 'autoStop', e.target.checked)}
                          className="rounded border-border text-rose-500 h-3.5 w-3.5"
                        />
                        <span>Parar na Preparação</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={srv.autoStart ?? false}
                          onChange={(e) => handleUpdateService(index, 'autoStart', e.target.checked)}
                          className="rounded border-border text-emerald-500 h-3.5 w-3.5"
                        />
                        <span>Iniciar na Preparação</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Processos Conflitantes (Encerramento de Travas) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" /> Processos Conflitantes (Kill)
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Processos finalizados para liberação de portas e arquivos.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleResetProcesses}
                    className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
                    title="Restaurar padrões de processos"
                  >
                    <RotateCcw className="w-3 h-3 text-muted-foreground" />
                    <span>Padrões</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddProcess()}
                    className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Lista de Processos */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {(settings.trackedProcesses || DEFAULT_PROCESSES).map((proc, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 transition-all ${
                      proc.enabled
                        ? 'bg-card border-border hover:border-rose-500/40'
                        : 'bg-muted/40 border-border/40 opacity-60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateProcess(index, 'enabled', !proc.enabled)}
                      className={`p-1 rounded text-xs transition-colors ${
                        proc.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                      }`}
                      title={proc.enabled ? 'Clique para Desativar' : 'Clique para Ativar'}
                    >
                      {proc.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>

                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={proc.displayName}
                        onChange={(e) => handleUpdateProcess(index, 'displayName', e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                        placeholder="Nome Amigável"
                      />
                      <input
                        type="text"
                        value={proc.name}
                        onChange={(e) => handleUpdateProcess(index, 'name', e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-muted-foreground focus:outline-none focus:border-primary"
                        placeholder="Nome do Executável (.exe)"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProcess(index)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Remover Processo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Portas de Rede Monitoradas */}
      {activeTab === 'ports' && (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Card: Portas Principais de Integração */}
          <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Portas Principais de Integração
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Portas-chave utilizadas pelo Portal Web, Karaf client.bat e JVM Debug.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Porta Web Local */}
              <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-3.5 space-y-2 transition-all">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" /> Porta do Portal Web Local:
                  </label>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                    HTTP
                  </span>
                </div>
                <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
                  <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
                  <input
                    type="number"
                    value={settings.webPort ?? 8889}
                    onChange={(e) => {
                      const portNum = parseInt(e.target.value) || 0;
                      setSettings({ ...settings, webPort: portNum });
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="8889"
                  />
                </div>
                <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner mt-2">
                  <span className="text-primary font-mono text-xs select-none mr-1 font-bold">/</span>
                  <input
                    type="text"
                    value={settings.webPath?.replace(/^\//, '') ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? `/${e.target.value.replace(/^\//, '')}` : '';
                      setSettings({ ...settings, webPath: val });
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="web"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Usada para abrir o Portal Web no navegador (<code>http://localhost:{settings.webPort || 8889}{settings.webPath || ''}</code>) e verificar o status ativo.
                </p>
              </div>

              {/* Porta SSH do Apache Karaf */}
              <div className="bg-card border border-border hover:border-amber-500/40 rounded-xl p-3.5 space-y-2 transition-all">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-500" /> Porta SSH Karaf (client.bat):
                  </label>
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
                    SSH
                  </span>
                </div>
                <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
                  <span className="text-amber-500 font-mono text-xs select-none mr-1 font-bold">:</span>
                  <input
                    type="number"
                    value={settings.karafSshPort ?? 8101}
                    onChange={(e) =>
                      setSettings({ ...settings, karafSshPort: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="8101"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Usada pelo <code>client.bat -a {settings.karafSshPort || 8101}</code> para envio de comandos OSGi e deploy de bundles.
                </p>
              </div>

              {/* Porta Remote Debug Java */}
              <div className="bg-card border border-border hover:border-emerald-500/40 rounded-xl p-3.5 space-y-2 transition-all">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-500" /> Porta Debug JVM (Java):
                  </label>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-mono font-bold">
                    JDWP
                  </span>
                </div>
                <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
                  <span className="text-emerald-500 font-mono text-xs select-none mr-1 font-bold">:</span>
                  <input
                    type="number"
                    value={settings.karafDebugPort ?? 5005}
                    onChange={(e) =>
                      setSettings({ ...settings, karafDebugPort: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="5005"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Porta TCP onde a JVM do Karaf aguarda conexão de Remote Debug da IDE (IntelliJ, VS Code, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Card: Portas de Rede Monitoradas em Tempo Real */}
          <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary" /> Lista Geral de Portas TCP Monitoradas
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Portas consultadas em tempo real na barra de status do painel de ambiente.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetPorts}
                  className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
                  title="Restaurar portas padrão (:8889, :8101, :5005, :1521)"
                >
                  <RotateCcw className="w-3 h-3 text-muted-foreground" />
                  <span>Restaurar Padrões</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddPort()}
                  className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Porta</span>
                </button>
              </div>
            </div>

            {/* Lista Rolável de Portas Configuradas */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {(settings.monitoredPorts || DEFAULT_PORTS).map((portCfg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                    portCfg.enabled
                      ? 'bg-card border-border hover:border-primary/40'
                      : 'bg-muted/40 border-border/40 opacity-60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleUpdatePort(index, 'enabled', !portCfg.enabled)}
                    className={`p-1 rounded text-xs transition-colors ${
                      portCfg.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                    }`}
                    title={portCfg.enabled ? 'Clique para Desativar' : 'Clique para Ativar'}
                  >
                    {portCfg.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>

                  {/* Número da Porta */}
                  <div className="w-28">
                    <div className="flex items-center bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
                      <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
                      <input
                        type="number"
                        value={portCfg.port || ''}
                        onChange={(e) => handleUpdatePort(index, 'port', e.target.value)}
                        className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                        placeholder="8889"
                      />
                    </div>
                  </div>

                  {/* Descrição da Porta */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={portCfg.label}
                      onChange={(e) => handleUpdatePort(index, 'label', e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="Descrição do serviço (ex: Portal Web, Banco de Dados...)"
                    />
                  </div>

                  {/* Botão Remover */}
                  <button
                    type="button"
                    onClick={() => handleRemovePort(index)}
                    className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Remover Porta da Lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Presets Rápidos de Portas Comuns */}
            <div className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Atalhos Rápidos de Adição:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => handleAddPort(8889, 'Portal Web Local')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
                >
                  + :8889 (Portal Web)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(8181, 'Karaf Web Alternativo')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
                >
                  + :8181 (Karaf Web)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(8101, 'Karaf SSH (client.bat)')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-amber-500/40 transition-colors shadow-sm"
                >
                  + :8101 (Karaf SSH)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(8080, 'Tomcat / Web')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
                >
                  + :8080 (Web)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(5005, 'Java Remote Debug')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-emerald-500/40 transition-colors shadow-sm"
                >
                  + :5005 (Debug JVM)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(1521, 'Oracle DB Listener')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-blue-500/40 transition-colors shadow-sm"
                >
                  + :1521 (Oracle DB)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(6379, 'Redis Cache')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-rose-500/40 transition-colors shadow-sm"
                >
                  + :6379 (Redis)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPort(8085, 'Serviço API Local')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-emerald-500/40 transition-colors shadow-sm"
                >
                  + :8085 (API Local)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 4: Automação Padrão */}
      {activeTab === 'automation' && (
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Preferências Padrão de Automação
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Defina o comportamento pré-selecionado ao abrir o Painel de Preparação de Ambiente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                Ações Pré-Debug Padrão
              </h4>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automationDefaults?.stopServices ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automationDefaults: {
                        ...(settings.automationDefaults || DEFAULT_AUTOMATION),
                        stopServices: e.target.checked
                      }
                    })
                  }
                  className="rounded border-border text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Parar Serviços Windows por Padrão</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automationDefaults?.killProcesses ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automationDefaults: {
                        ...(settings.automationDefaults || DEFAULT_AUTOMATION),
                        killProcesses: e.target.checked
                      }
                    })
                  }
                  className="rounded border-border text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Finalizar Processos Conflitantes (Liberar Portas)</span>
              </label>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                Ações de Inicialização Padrão
              </h4>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automationDefaults?.launchIde ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automationDefaults: {
                        ...(settings.automationDefaults || DEFAULT_AUTOMATION),
                        launchIde: e.target.checked
                      }
                    })
                  }
                  className="rounded border-border text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Inicializar IDE configurada automaticamente</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automationDefaults?.startKaraf ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automationDefaults: {
                        ...(settings.automationDefaults || DEFAULT_AUTOMATION),
                        startKaraf: e.target.checked
                      }
                    })
                  }
                  className="rounded border-border text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Iniciar Servidor OSGi Debug</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automationDefaults?.openBrowser ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automationDefaults: {
                        ...(settings.automationDefaults || DEFAULT_AUTOMATION),
                        openBrowser: e.target.checked
                      }
                    })
                  }
                  className="rounded border-border text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Abrir Portal Web no Navegador</span>
              </label>
            </div>
          </div>

          {/* Lista de Perfis de Ambiente Cadastrados */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Perfis de Automação Cadastrados ({settings.automationProfiles?.length || 0})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Gerencie, adicione e edite passos na aba de Ambiente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {(settings.automationProfiles || []).map((prof) => {
                const isActive = (settings.activeProfileId || settings.automationProfiles?.[0]?.id) === prof.id;
                return (
                  <div
                    key={prof.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'border-primary/50 bg-primary/10 shadow-sm'
                        : 'border-border bg-card/60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{prof.name}</span>
                        {isActive && (
                          <span className="text-[9px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {prof.description || `${prof.steps?.length || 0} passos configurados`}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-muted px-2 py-1 rounded shrink-0">
                      {prof.steps?.length || 0} passos
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba: Logs em Tempo Real */}
      {activeTab === 'logs' && (
        <div className="space-y-4 flex flex-col flex-1">
          <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-emerald-500" /> Fontes de Logs em Tempo Real (Tail -f)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arquivos de saída de serviços e rotinas monitorados continuamente pela aba &quot;Logs em Tempo Real&quot;.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetLogSources}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border/70 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  title="Remove todas as fontes de log configuradas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Todas</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddLogSource}
                  className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Fonte de Log</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(settings.realtimeLogSources || DEFAULT_LOG_SOURCES).map((src, idx) => (
                <div
                  key={src.id || idx}
                  className="bg-card/70 border border-border/80 rounded-xl p-4 space-y-3 hover:border-border transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground block">Nome de Exibição</label>
                      <input
                        type="text"
                        value={src.name || ''}
                        onChange={(e) => handleUpdateLogSource(idx, 'name', e.target.value)}
                        placeholder="Ex: API Backend, Serviço de Integração..."
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground block">Caminho do Arquivo de Log (.log, .out, .txt)</label>
                        <span className="text-[10px] text-muted-foreground font-mono">Windows Local</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={src.filePath || ''}
                          onChange={(e) => handleUpdateLogSource(idx, 'filePath', e.target.value)}
                          placeholder="Ex: C:\meu-servico\logs\saida.log"
                          className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleBrowseLogPath(idx)}
                          className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Procurar...</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-[11px] font-semibold text-muted-foreground">Codificação:</label>
                      <select
                        value={src.encoding || 'utf-8'}
                        onChange={(e) => handleUpdateLogSource(idx, 'encoding', e.target.value)}
                        className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs"
                      >
                        <option value="utf-8">UTF-8 (Padrão)</option>
                        <option value="latin1">Latin1 / ISO-8859-1 (Delphi legada)</option>
                        <option value="windows-1252">Windows-1252 (ANSI)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLogSource(idx)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 p-1 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Dica de Produtividade
              </span>
              <p>
                Os logs cadastrados aqui aparecem instantaneamente na aba <strong>Logs em Tempo Real (Alt+8)</strong>{' '}
                com auto-scroll, busca regex e filtro por nível (ERROR, WARN, INFO). Se o arquivo ainda não existir, o
                sistema aguardará o serviço criá-lo sem travar a interface.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba: Backup de Bancos de Dados */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <HardDriveDownload className="w-4 h-4 text-sky-500" /> Executáveis de Backup
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Opcional se já estiverem no PATH</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usados pela função de Backup da aba <strong>Banco de Dados</strong>. Deixe em branco se o executável já
                estiver acessível no PATH do sistema.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* pg_dump */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-500" /> pg_dump (Postgres)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.pgDumpPath || ''}
                      onChange={(e) => setSettings({ ...settings, pgDumpPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('pgDumpPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                    </button>
                  </div>
                </div>

                {/* expdp */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-rose-500" /> expdp (Oracle)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.expdpPath || ''}
                      onChange={(e) => setSettings({ ...settings, expdpPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\oracle\instantclient\expdp.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('expdpPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>

                {/* mysqldump */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-500" /> mysqldump (MySQL)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.mysqldumpPath || ''}
                      onChange={(e) => setSettings({ ...settings, mysqldumpPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('mysqldumpPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-500" /> Executáveis de Restauração
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Opcional se já estiverem no PATH</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* psql */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-500" /> psql (Postgres)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.psqlPath || ''}
                      onChange={(e) => setSettings({ ...settings, psqlPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Program Files\PostgreSQL\17\bin\psql.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('psqlPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                    </button>
                  </div>
                </div>

                {/* impdp */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-rose-500" /> impdp (Oracle)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.impdpPath || ''}
                      onChange={(e) => setSettings({ ...settings, impdpPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\oracle\instantclient\impdp.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('impdpPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>

                {/* mysql */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-500" /> mysql (Cliente MySQL)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.mysqlPath || ''}
                      onChange={(e) => setSettings({ ...settings, mysqlPath: e.target.value })}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseFile('mysqlPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                      title="Selecionar executável"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba: IA & Modelos LLM (BYOK) */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border bg-card">
              {/* Cabeçalho com Status Operacional */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      Provedores de IA & Motores LLM (BYOK)
                    </h3>
                    {(() => {
                      const active = (settings.llmProviders || []).find((p) =>
                        settings.activeLlmProviderId ? p.id === settings.activeLlmProviderId : p.enabled
                      );
                      return active ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE · {active.name} ({active.model})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          NENHUM MOTOR ATIVO
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-2xl">
                    Configure suas próprias credenciais (<em>Bring Your Own Key</em>) para OpenAI, Gemini, Claude, Ollama ou OpenRouter.
                    As chaves são salvas apenas localmente e usadas para o Copilot de Documentação e ferramentas MCP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingLlmProvider({
                      id: `llm-${Date.now()}`,
                      name: 'Novo Motor',
                      provider: 'openai',
                      baseUrl: 'https://api.openai.com/v1',
                      model: 'gpt-4o-mini',
                      temperature: 0.7,
                      maxTokens: 2048,
                      timeoutMs: 30000,
                      enabled: true
                    })
                  }
                  className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Novo Motor de IA
                </button>
              </div>

              {/* Presets Rápidos de Conexão */}
              <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                    Presets de Conexão Rápida
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Clique em um preset para carregar o template no formulário
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DEFAULT_LLM_PROVIDER_TEMPLATES.map((tmpl) => {
                    const isLocal = tmpl.provider === 'ollama';
                    return (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => handleApplyLlmTemplate(tmpl)}
                        className="p-2.5 rounded-xl bg-card hover:bg-muted/80 border border-border hover:border-primary/50 text-left transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
                        title={`Configurar ${tmpl.name} (${tmpl.model})`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {tmpl.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-muted-foreground">
                          <span className="truncate">{tmpl.model}</span>
                          {isLocal && (
                            <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-500 text-[9px] font-bold border border-cyan-500/20">
                              LOCAL
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lista de Motores Cadastrados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    Motores Configurados ({(settings.llmProviders || []).length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    O motor selecionado é consultado pelo Copilot de Documentação e MCP.
                  </span>
                </div>

                {(settings.llmProviders || []).length === 0 ? (
                  <div className="p-8 text-center bg-card/50 rounded-2xl border border-dashed border-border/80 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Nenhum motor de IA configurado</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Selecione um preset acima ou clique em <strong>Novo Motor de IA</strong> para cadastrar sua chave de API (OpenAI, Gemini, Claude, Ollama local, etc.).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(settings.llmProviders || []).map((provider) => {
                      const isActive = settings.activeLlmProviderId === provider.id;
                      const testResult = llmTestResults[provider.id];
                      const isTesting = isTestingLlmId === provider.id;

                      return (
                        <div
                          key={provider.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 ${
                            isActive
                              ? 'border-primary/60 bg-gradient-to-br from-primary/5 via-card to-card shadow-md ring-1 ring-primary/20'
                              : 'border-border bg-card hover:border-border/80 shadow-2xs'
                          } ${!provider.enabled ? 'opacity-55' : ''}`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                                    isActive
                                      ? 'bg-primary/10 border-primary/40 text-primary'
                                      : 'bg-muted border-border text-muted-foreground'
                                  }`}
                                >
                                  <Bot className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-sm text-foreground truncate block">
                                    {provider.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                    {provider.provider}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isActive ? (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ATIVO
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetActiveLlmProvider(provider.id)}
                                    className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-colors cursor-pointer"
                                    title="Definir como motor ativo"
                                  >
                                    Ativar
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5 font-mono">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Modelo:</span>
                                <span className="text-foreground font-bold truncate max-w-[180px]">
                                  {provider.model}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Endpoint:</span>
                                <span
                                  className="text-muted-foreground truncate max-w-[180px]"
                                  title={provider.baseUrl || 'Endpoint padrão'}
                                >
                                  {provider.baseUrl ? provider.baseUrl.replace('https://', '') : 'Oficial Cloud'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Credencial:</span>
                                <span className="text-muted-foreground">
                                  {provider.apiKey
                                    ? `••••••••${provider.apiKey.slice(-4)}`
                                    : provider.provider === 'ollama'
                                    ? 'Sem chave (Local)'
                                    : 'Não informada'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 text-muted-foreground">
                                <span>Temp: {(provider.temperature ?? 0.7).toFixed(2)}</span>
                                <span>Timeout: {((provider.timeoutMs ?? 30000) / 1000).toFixed(0)}s</span>
                              </div>
                            </div>
                          </div>

                          {/* Telemetria do Teste de Conexão */}
                          {testResult && (
                            <div
                              className={`p-2.5 rounded-xl text-xs border font-mono ${
                                testResult.success
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-semibold text-[11px] min-w-0">
                                  {testResult.success ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                  )}
                                  <span className="truncate">{testResult.message}</span>
                                </div>
                                {testResult.latencyMs !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded bg-background/80 border border-current text-[10px] font-bold shrink-0">
                                    ⚡ {testResult.latencyMs}ms
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Ações do Card */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTestLlmConnection(provider)}
                                disabled={isTesting}
                                className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-[11px] font-semibold border border-border hover:border-primary/40 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                {isTesting ? (
                                  <RotateCcw className="w-3 h-3 animate-spin text-primary" />
                                ) : (
                                  <Zap className="w-3 h-3 text-amber-500" />
                                )}
                                <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleLlmProvider(provider.id, !provider.enabled)}
                                className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] border border-border transition-all cursor-pointer shadow-2xs"
                              >
                                {provider.enabled ? 'Desativar' : 'Habilitar'}
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingLlmProvider({ ...provider })}
                                className="p-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer shadow-2xs"
                                title="Editar parâmetros"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLlmProvider(provider.id)}
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Remover este motor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal de Adicionar / Editar Provedor */}
              {editingLlmProvider && (
                <div className="p-5 rounded-2xl border border-primary/40 bg-card shadow-2xl space-y-4 animate-in fade-in-0">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      {editingLlmProvider.id ? 'Configurar Motor de LLM' : 'Novo Motor de LLM'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingLlmProvider(null)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Nome de Exibição */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Nome de Identificação</label>
                      <input
                        type="text"
                        value={editingLlmProvider.name || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, name: e.target.value })}
                        placeholder="Ex: OpenAI Produtivo, Ollama Local"
                        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary shadow-2xs"
                      />
                    </div>

                    {/* Família de Provedor */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Tipo de Provedor / Protocolo</label>
                      <select
                        value={editingLlmProvider.provider || 'openai'}
                        onChange={(e) => {
                          const prov = e.target.value as LlmProviderType;
                          const template = DEFAULT_LLM_PROVIDER_TEMPLATES.find((t) => t.provider === prov);
                          setEditingLlmProvider({
                            ...editingLlmProvider,
                            provider: prov,
                            baseUrl: template?.baseUrl || editingLlmProvider.baseUrl,
                            model: template?.model || editingLlmProvider.model
                          });
                        }}
                        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                      >
                        <option value="openai">OpenAI / Compatível (OpenAI, Groq, DeepSeek)</option>
                        <option value="gemini">Google Gemini (REST nativo v1beta)</option>
                        <option value="anthropic">Anthropic Claude (Messages API)</option>
                        <option value="ollama">Ollama (Modelo Local Offline)</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="custom">Personalizado (OpenAI compatible)</option>
                      </select>
                    </div>

                    {/* URL Base */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">URL Base do Endpoint</label>
                      <input
                        type="text"
                        value={editingLlmProvider.baseUrl || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, baseUrl: e.target.value })}
                        placeholder="Ex: https://api.openai.com/v1 ou http://localhost:11434/v1"
                        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                      />
                    </div>

                    {/* Nome do Modelo */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Identificador do Modelo</label>
                      <input
                        type="text"
                        value={editingLlmProvider.model || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, model: e.target.value })}
                        placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, claude-3-5-sonnet, llama3.2"
                        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                      />
                    </div>

                    {/* Chave de API */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-foreground">Chave de API (API Key)</label>
                        <span className="text-[10px] text-muted-foreground">
                          {editingLlmProvider.provider === 'ollama'
                            ? 'Opcional para Ollama local'
                            : 'Armazenada localmente e sanitizada em exportações'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type={showLlmFormKey ? 'text' : 'password'}
                          value={editingLlmProvider.apiKey || ''}
                          onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, apiKey: e.target.value })}
                          placeholder="sk-..., AIzaSy..., ou deixe em branco para Ollama"
                          className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLlmFormKey(!showLlmFormKey)}
                          className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
                          title={showLlmFormKey ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {showLlmFormKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Temperatura Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-foreground">Temperatura (Calibração)</label>
                        <span className="font-mono text-muted-foreground">
                          {(editingLlmProvider.temperature ?? 0.7).toFixed(2)} (
                          {(editingLlmProvider.temperature ?? 0.7) <= 0.3
                            ? 'Técnica/Código'
                            : (editingLlmProvider.temperature ?? 0.7) >= 0.8
                            ? 'Criativa'
                            : 'Balanceada'}
                          )
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editingLlmProvider.temperature ?? 0.7}
                        onChange={(e) =>
                          setEditingLlmProvider({ ...editingLlmProvider, temperature: parseFloat(e.target.value) })
                        }
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>

                    {/* Timeout em segundos */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-foreground">Timeout da Requisição (segundos)</label>
                        <span className="font-mono text-muted-foreground">
                          {((editingLlmProvider.timeoutMs ?? 30000) / 1000).toFixed(0)}s
                        </span>
                      </div>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={(editingLlmProvider.timeoutMs ?? 30000) / 1000}
                        onChange={(e) =>
                          setEditingLlmProvider({
                            ...editingLlmProvider,
                            timeoutMs: Math.max(5000, Number(e.target.value) * 1000)
                          })
                        }
                        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setEditingLlmProvider(null)}
                      className="px-3 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLlmProvider}
                      className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar Motor
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <OnboardingTour
        steps={SETTINGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={SETTINGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
