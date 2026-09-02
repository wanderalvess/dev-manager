import React, { useState, useEffect, useCallback } from 'react';
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
  SlidersHorizontal,
  CheckSquare,
  Square,
  Globe,
  Terminal
} from 'lucide-react';
import {
  AppSettings,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  PathStatusInfo,
  detectIdeInfo
} from '../../../shared/types';

interface SettingsPageProps {
  onSettingsSaved?: () => void;
}

const DEFAULT_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

const DEFAULT_SERVICES: TrackedServiceConfig[] = [
  { name: 'PDVSync.Client.API', displayName: 'Serviço API Local', enabled: true, autoStop: true, autoStart: false },
  { name: 'PDVSync.Client.Down', displayName: 'Serviço Sync Down', enabled: true, autoStop: true, autoStart: false },
  { name: 'PDVSync.Client.Up', displayName: 'Serviço Sync Up', enabled: true, autoStop: true, autoStart: false },
  { name: 'WinThor', displayName: 'Serviço Web Local', enabled: true, autoStop: true, autoStart: false }
];

const DEFAULT_PROCESSES: TrackedProcessConfig[] = [
  { name: 'pdvsyncclientservicocontrole.exe', displayName: 'PDV Sync Controle', enabled: true, autoKill: true }
];

const DEFAULT_AUTOMATION: EnvironmentAutomationConfig = {
  stopServices: true,
  killProcesses: true,
  launchIde: true,
  startKaraf: true,
  openBrowser: false,
  launchMode: 'embedded',
  selectedServiceNames: ['PDVSync.Client.API', 'PDVSync.Client.Down', 'PDVSync.Client.Up', 'WinThor'],
  selectedProcesses: ['pdvsyncclientservicocontrole.exe'],
  selectedStartServiceNames: []
};

type SettingsTab = 'dirs' | 'karaf' | 'azure' | 'services' | 'ports' | 'automation';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('dirs');
  const [settings, setSettings] = useState<AppSettings>({
    appPath: '',
    winthorPath: '',
    karafPath: '',
    karafUser: 'karaf',
    karafPass: 'karaf',
    intellijPath: '',
    projectsPath: '',
    targetPrBranch: 'develop',
    favoriteRoutines: [],
    webPort: 8889,
    webPath: '',
    winthorWebPort: 8889,
    winthorWebPath: '',
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_PORTS,
    trackedServices: DEFAULT_SERVICES,
    trackedProcesses: DEFAULT_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION
  });

  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validação de Caminhos
  const validateAllPaths = useCallback(async (st: AppSettings) => {
    if (window.electronAPI && window.electronAPI.checkPath) {
      const keys: (keyof AppSettings)[] = ['projectsPath', 'karafPath', 'winthorPath', 'intellijPath'];
      const results: Record<string, PathStatusInfo> = {};
      for (const key of keys) {
        const val = st[key];
        if (typeof val === 'string') {
          results[key] = await window.electronAPI.checkPath(val);
        }
      }
      setPathStatuses(results);
    }
  }, []);

  const validateSinglePath = async (key: string, val: string) => {
    if (window.electronAPI && window.electronAPI.checkPath) {
      const status = await window.electronAPI.checkPath(val);
      setPathStatuses((prev) => ({ ...prev, [key]: status }));
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((st) => {
        const loaded: AppSettings = {
          ...st,
          winthorWebPort: st.winthorWebPort || 8889,
          winthorWebPath: st.winthorWebPath || '/winthor',
          karafSshPort: st.karafSshPort || 8101,
          karafDebugPort: st.karafDebugPort || 5005,
          monitoredPorts: st.monitoredPorts && st.monitoredPorts.length > 0 ? st.monitoredPorts : DEFAULT_PORTS,
          trackedServices: st.trackedServices && st.trackedServices.length > 0 ? st.trackedServices : DEFAULT_SERVICES,
          trackedProcesses: st.trackedProcesses && st.trackedProcesses.length > 0 ? st.trackedProcesses : DEFAULT_PROCESSES,
          automationDefaults: st.automationDefaults || DEFAULT_AUTOMATION
        };
        setSettings(loaded);
        validateAllPaths(loaded);
      });
    }
  }, [validateAllPaths]);

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
      const selected = await window.electronAPI.selectFile({
        defaultPath: current,
        filters: [
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

  // Gerenciamento de Serviços Windows
  const handleAddService = (name = 'NovoServico', displayName = 'Novo Serviço Windows') => {
    const current = settings.trackedServices || DEFAULT_SERVICES;
    setSettings({
      ...settings,
      trackedServices: [...current, { name, displayName, enabled: true, autoStop: true, autoStart: false }]
    });
  };

  const handleUpdateService = (index: number, field: keyof TrackedServiceConfig, value: any) => {
    const current = [...(settings.trackedServices || DEFAULT_SERVICES)];
    if (current[index]) {
      current[index] = { ...current[index], [field]: value };
      setSettings({ ...settings, trackedServices: current });
    }
  };

  const handleRemoveService = (index: number) => {
    const current = [...(settings.trackedServices || DEFAULT_SERVICES)];
    current.splice(index, 1);
    setSettings({ ...settings, trackedServices: current });
  };

  const handleResetServices = () => {
    setSettings({ ...settings, trackedServices: DEFAULT_SERVICES });
  };

  // Gerenciamento de Processos Conflitantes
  const handleAddProcess = (name = 'processo.exe', displayName = 'Processo em Segundo Plano') => {
    const current = settings.trackedProcesses || DEFAULT_PROCESSES;
    setSettings({
      ...settings,
      trackedProcesses: [...current, { name, displayName, enabled: true, autoKill: true }]
    });
  };

  const handleUpdateProcess = (index: number, field: keyof TrackedProcessConfig, value: any) => {
    const current = [...(settings.trackedProcesses || DEFAULT_PROCESSES)];
    if (current[index]) {
      current[index] = { ...current[index], [field]: value };
      setSettings({ ...settings, trackedProcesses: current });
    }
  };

  const handleRemoveProcess = (index: number) => {
    const current = [...(settings.trackedProcesses || DEFAULT_PROCESSES)];
    current.splice(index, 1);
    setSettings({ ...settings, trackedProcesses: current });
  };

  const handleResetProcesses = () => {
    setSettings({ ...settings, trackedProcesses: DEFAULT_PROCESSES });
  };

  // Gerenciamento de Portas
  const handleAddPort = (port = 8080, label = 'Nova Porta') => {
    const current = settings.monitoredPorts || DEFAULT_PORTS;
    setSettings({
      ...settings,
      monitoredPorts: [...current, { port, label, enabled: true }]
    });
  };

  const handleUpdatePort = (index: number, field: keyof MonitoredPortConfig, value: any) => {
    const current = [...(settings.monitoredPorts || DEFAULT_PORTS)];
    if (current[index]) {
      current[index] = {
        ...current[index],
        [field]: field === 'port' ? parseInt(value) || 0 : value
      };
      setSettings({ ...settings, monitoredPorts: current });
    }
  };

  const handleRemovePort = (index: number) => {
    const current = [...(settings.monitoredPorts || DEFAULT_PORTS)];
    current.splice(index, 1);
    setSettings({ ...settings, monitoredPorts: current });
  };

  const handleResetPorts = () => {
    setSettings({ ...settings, monitoredPorts: DEFAULT_PORTS });
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
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Configurações do Ambiente & Diretórios
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Perfil Local
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Configure os diretórios base, serviços Windows, processos de encerramento, portas e preferências de automação.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="px-3.5 py-2.5 bg-card hover:bg-muted text-primary border border-primary/30 hover:border-primary/60 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            title="Escanear automaticamente o disco local e identificar os diretórios instalados"
          >
            <Sparkles className={`w-3.5 h-3.5 text-primary ${isDetecting ? 'animate-spin' : ''}`} />
            <span>{isDetecting ? 'Detectando...' : 'Auto-Detectar'}</span>
          </button>

          <button
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

      {/* Abas de Navegação Interna das Configurações */}
      <div className="flex items-center space-x-2 border-b border-border pb-2 text-xs flex-wrap gap-y-2">
        <button
          onClick={() => setActiveTab('dirs')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
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
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
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
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
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
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
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
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
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
          onClick={() => setActiveTab('automation')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'automation'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Automação Padrão</span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Diretórios & IDE */}
      {activeTab === 'dirs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-12 space-y-4 flex flex-col">
            <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" /> Diretórios e Executáveis Locais
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Windows Explorer</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Diretório de Repositórios Git */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
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
                </div>

                {/* Diretório do Apache Karaf */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Diretório do Servidor Apache Karaf (OSGi):
                    </label>
                    {renderPathStatusBadge('karafPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.karafPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, karafPath: val });
                        validateSinglePath('karafPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\karaf ou C:\apache-karaf"
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

                {/* Diretório Base das Rotinas (Prod) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-emerald-500" />
                      Diretório Raiz das Rotinas / Binários (Prod):
                    </label>
                    {renderPathStatusBadge('winthorPath')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.winthorPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, winthorPath: val, appPath: val });
                        validateSinglePath('winthorPath', val);
                      }}
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                      placeholder="Ex: C:\app ou C:\ERP"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseDirectory('winthorPath')}
                      className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Selecionar pasta das Rotinas"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                {/* Executável da IDE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                  <label className="block font-bold text-foreground flex items-center gap-1.5">
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
                    <label className="font-bold text-foreground flex items-center gap-1.5">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                          placeholder="Nome do Serviço (ex: PDVSync.Client.API)"
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                    value={settings.webPort ?? settings.winthorWebPort ?? 8889}
                    onChange={(e) => {
                      const portNum = parseInt(e.target.value) || 0;
                      setSettings({ ...settings, webPort: portNum, winthorWebPort: portNum });
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="8889"
                  />
                </div>
                <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner mt-2">
                  <span className="text-primary font-mono text-xs select-none mr-1 font-bold">/</span>
                  <input
                    type="text"
                    value={settings.webPath?.replace(/^\//, '') ?? settings.winthorWebPath?.replace(/^\//, '') ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? `/${e.target.value.replace(/^\//, '')}` : '';
                      setSettings({ ...settings, webPath: val, winthorWebPath: val });
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="web"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Usada para abrir o Portal Web no navegador (<code>http://localhost:{settings.webPort || settings.winthorWebPort || 8889}{settings.webPath || settings.winthorWebPath || ''}</code>) e verificar o status ativo.
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                      placeholder="Descrição do serviço (ex: WinThor Web, Oracle DB...)"
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
    </div>
  );
};
