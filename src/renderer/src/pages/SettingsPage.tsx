import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Folder,
  KeyRound,
  GitBranch,
  Radio,
  Server,
  Zap,
  Download,
  Upload,
  ShieldCheck,
  ChevronDown,
  ScrollText,
  HardDriveDownload,
  Bot,
  Sparkles,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import {
  AppSettings,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  PathStatusInfo,
  RealtimeLogSource,
  EnvironmentProfile,
  LlmProviderConfig,
  LlmProviderType,
  LlmTestResult
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
import {
  SettingsTab,
  SettingsSearchEntry,
  SETTINGS_SEARCH_INDEX
} from '../components/settings/settingsSearchData';
import { SettingsSearchBar } from '../components/settings/SettingsSearchBar';
import { SetupChecklistCard } from '../components/settings/SetupChecklistCard';
import { DirsTab } from '../components/settings/tabs/DirsTab';
import { KarafTab } from '../components/settings/tabs/KarafTab';
import { AzureTab } from '../components/settings/tabs/AzureTab';
import { ServicesTab } from '../components/settings/tabs/ServicesTab';
import { PortsTab } from '../components/settings/tabs/PortsTab';
import { AutomationTab } from '../components/settings/tabs/AutomationTab';
import { LogsTab } from '../components/settings/tabs/LogsTab';
import { BackupTab } from '../components/settings/tabs/BackupTab';
import { AiTab } from '../components/settings/tabs/AiTab';

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
    mysqlPath: '',
    ccwBaseUrl: 'https://centraldecontrole.pcinformatica.com.br',
    ccwWinthorVersion: '30',
    ccwAuthCookie: ''
  });

  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEnvironmentProfileLabel, setNewEnvironmentProfileLabel] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWtaPassword, setShowWtaPassword] = useState(false);
  const [launcherRows, setLauncherRows] = useState<{ ext: string; path: string }[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsSearchOpen, setSettingsSearchOpen] = useState(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const hasUnsavedChanges = savedSnapshot !== null && JSON.stringify(settings) !== savedSnapshot;

  const settingsSearchResults = useMemo(() => {
    const query = settingsSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return SETTINGS_SEARCH_INDEX.filter(
      (entry) => entry.label.toLowerCase().includes(query) || entry.keywords.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [settingsSearchQuery]);

  const handleSettingsSearchSelect = (entry: SettingsSearchEntry) => {
    setActiveTab(entry.tab);
    setSettingsSearchQuery('');
    setSettingsSearchOpen(false);
    setHighlightedFieldId(entry.id);
    window.setTimeout(() => {
      document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    window.setTimeout(() => setHighlightedFieldId(null), 2200);
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Aplica um realce temporário (ring) no campo encontrado pela busca de Configurações
  useEffect(() => {
    if (!highlightedFieldId) return undefined;
    const el = document.getElementById(highlightedFieldId);
    if (!el) return undefined;
    const highlightClasses = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background', 'rounded-xl'];
    el.classList.add(...highlightClasses);
    return () => {
      el.classList.remove(...highlightClasses);
    };
  }, [highlightedFieldId, activeTab]);

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
      { karafUser: settings.karafUser, karafPass: settings.karafPass, hasKarafPass: settings.hasKarafPass, databaseConnections: settings.databaseConnections },
      pathStatuses
    ).map((item) => ({
      ...item,
      action: actionsById[item.id]
    }));
  }, [pathStatuses, settings.karafUser, settings.karafPass, settings.hasKarafPass, settings.databaseConnections, onNavigate]);
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
          const res = await checkPath(val.trim());
          return [key, res] as [string, PathStatusInfo];
        }
        return [key, { exists: false, isDirectory: false, isFile: false, message: 'Não configurado' }] as [
          string,
          PathStatusInfo
        ];
      })
    );

    const statuses: Record<string, PathStatusInfo> = {};
    for (const [k, v] of entries) {
      statuses[k] = v;
    }
    setPathStatuses(statuses);
  }, []);

  const validateSinglePath = async (key: keyof AppSettings, value: string) => {
    const checkPath = window.electronAPI?.checkPath;
    if (!checkPath) return;

    if (!value || !value.trim()) {
      setPathStatuses((prev) => ({
        ...prev,
        [key]: { path: value || '', exists: false, isDirectory: false, isFile: false, message: 'Não configurado' }
      }));
      return;
    }

    try {
      const res = await checkPath(value.trim());
      setPathStatuses((prev) => ({ ...prev, [key]: res }));
    } catch {
      setPathStatuses((prev) => ({
        ...prev,
        [key]: { path: value, exists: false, isDirectory: false, isFile: false, message: 'Erro ao validar caminho' }
      }));
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
          mysqlPath: st.mysqlPath || '',
          ccwBaseUrl: st.ccwBaseUrl || 'https://centraldecontrole.pcinformatica.com.br',
          ccwWinthorVersion: st.ccwWinthorVersion || '30',
          ccwAuthCookie: st.ccwAuthCookie || '',
          routineLauncherMap: st.routineLauncherMap || {}
        };
        setSettings(loaded);
        setSavedSnapshot(JSON.stringify(loaded));
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
              { name: 'Scripts de Execução (*.bat;*.cmd)', extensions: ['bat', 'cmd'] },
              { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
            ]
          : [
              { name: 'Executáveis (*.exe)', extensions: ['exe'] },
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
        setSavedSnapshot(JSON.stringify(settings));
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
    const count = (settings.trackedServices || DEFAULT_SERVICES).length;
    if (count > 0 && !window.confirm(`Remover os ${count} serviço(s) monitorado(s) configurado(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
      return;
    }
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
    const count = (settings.trackedProcesses || DEFAULT_PROCESSES).length;
    if (count > 0 && !window.confirm(`Remover os ${count} processo(s) conflitante(s) configurado(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
      return;
    }
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
    if (!window.confirm('Restaurar a lista de portas monitoradas para o padrão (:8889, :9195, :8101, :5005, :1521)? Qualquer porta personalizada adicionada será perdida ao salvar.')) {
      return;
    }
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
    const count = (settings.realtimeLogSources || DEFAULT_LOG_SOURCES).length;
    if (count > 0 && !window.confirm(`Remover as ${count} fonte(s) de log configurada(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
      return;
    }
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

  const renderPathStatusBadge = (fieldKey: keyof AppSettings | string) => {
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
    <div className="h-full w-full flex flex-col p-4 md:p-5 space-y-4 overflow-hidden">
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
                      <div className="font-bold text-foreground">Exportação Completa (Backup)</div>
                      <div className="text-[10px] text-muted-foreground">Contém todas as senhas (Para este PC)</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Auto-Detectar */}
          <button
            data-tour="auto-detect-button"
            type="button"
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="px-3.5 py-2.5 bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50 shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-primary ${isDetecting ? 'animate-spin' : ''}`} />
            <span>{isDetecting ? 'Detectando...' : 'Auto-Detectar'}</span>
          </button>

          <div className="relative flex items-center">
            {hasUnsavedChanges && !isSaving && (
              <span
                className="mr-2 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg"
                title="Existem alterações que ainda não foram salvas"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Não salvo
              </span>
            )}
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
      </div>

      {/* Busca Rápida dentro de Configurações */}
      <SettingsSearchBar
        query={settingsSearchQuery}
        onQueryChange={setSettingsSearchQuery}
        isOpen={settingsSearchOpen}
        onOpenChange={setSettingsSearchOpen}
        results={settingsSearchResults}
        onSelectResult={handleSettingsSearchSelect}
      />

      {/* Banner de Feedback de Importação / Exportação */}
      {importStatusMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{importStatusMessage}</span>
        </div>
      )}

      {/* Checklist de Primeira Configuração */}
      <SetupChecklistCard
        checklist={setupChecklist}
        pendingCount={pendingChecklistCount}
      />

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

      {/* Área rolável: apenas o conteúdo da aba ativa rola, cabeçalho e abas ficam fixos */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col">
        {activeTab === 'dirs' && (
          <DirsTab
            settings={settings}
            setSettings={setSettings}
            renderPathStatusBadge={renderPathStatusBadge}
            validateSinglePath={validateSinglePath}
            handleBrowseDirectory={handleBrowseDirectory}
            handleBrowseFile={handleBrowseFile}
            handleActivateEnvironmentProfile={handleActivateEnvironmentProfile}
            handleDeleteEnvironmentProfile={handleDeleteEnvironmentProfile}
            newEnvironmentProfileLabel={newEnvironmentProfileLabel}
            setNewEnvironmentProfileLabel={setNewEnvironmentProfileLabel}
            handleSaveCurrentAsEnvironmentProfile={handleSaveCurrentAsEnvironmentProfile}
            launcherRows={launcherRows}
            handleAddLauncherRow={handleAddLauncherRow}
            handleUpdateLauncherRow={handleUpdateLauncherRow}
            handleRemoveLauncherRow={handleRemoveLauncherRow}
            handleBrowseLauncherPath={handleBrowseLauncherPath}
            showWtaPassword={showWtaPassword}
            setShowWtaPassword={setShowWtaPassword}
          />
        )}

        {activeTab === 'karaf' && (
          <KarafTab
            settings={settings}
            setSettings={setSettings}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        )}

        {activeTab === 'azure' && (
          <AzureTab
            settings={settings}
            setSettings={setSettings}
            renderPathStatusBadge={renderPathStatusBadge}
            validateSinglePath={validateSinglePath}
            handleBrowseDirectory={handleBrowseDirectory}
          />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            settings={settings}
            defaultServices={DEFAULT_SERVICES}
            defaultProcesses={DEFAULT_PROCESSES}
            handleResetServices={handleResetServices}
            handleAddService={handleAddService}
            handleUpdateService={handleUpdateService}
            handleRemoveService={handleRemoveService}
            handleResetProcesses={handleResetProcesses}
            handleAddProcess={handleAddProcess}
            handleUpdateProcess={handleUpdateProcess}
            handleRemoveProcess={handleRemoveProcess}
          />
        )}

        {activeTab === 'ports' && (
          <PortsTab
            settings={settings}
            setSettings={setSettings}
            defaultPorts={DEFAULT_PORTS}
            handleResetPorts={handleResetPorts}
            handleAddPort={handleAddPort}
            handleUpdatePort={handleUpdatePort}
            handleRemovePort={handleRemovePort}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationTab
            settings={settings}
            setSettings={setSettings}
            defaultAutomation={DEFAULT_AUTOMATION}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            settings={settings}
            defaultLogSources={DEFAULT_LOG_SOURCES}
            handleResetLogSources={handleResetLogSources}
            handleAddLogSource={handleAddLogSource}
            handleUpdateLogSource={handleUpdateLogSource}
            handleRemoveLogSource={handleRemoveLogSource}
            handleBrowseLogPath={handleBrowseLogPath}
          />
        )}

        {activeTab === 'backup' && (
          <BackupTab
            settings={settings}
            setSettings={setSettings}
            handleBrowseFile={handleBrowseFile}
          />
        )}

        {activeTab === 'ai' && (
          <AiTab
            settings={settings}
            setSettings={setSettings}
            editingLlmProvider={editingLlmProvider}
            setEditingLlmProvider={setEditingLlmProvider}
            isTestingLlmId={isTestingLlmId}
            llmTestResults={llmTestResults}
            showLlmFormKey={showLlmFormKey}
            setShowLlmFormKey={setShowLlmFormKey}
            handleApplyLlmTemplate={handleApplyLlmTemplate}
            handleSaveLlmProvider={handleSaveLlmProvider}
            handleDeleteLlmProvider={handleDeleteLlmProvider}
            handleToggleLlmProvider={handleToggleLlmProvider}
            handleSetActiveLlmProvider={handleSetActiveLlmProvider}
            handleTestLlmConnection={handleTestLlmConnection}
          />
        )}
      </div>

      <OnboardingTour
        steps={SETTINGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={SETTINGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
