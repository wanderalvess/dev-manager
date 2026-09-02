import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Zap,
  Flame,
  Code2,
  Bug,
  CheckCircle2,
  Server,
  Radio,
  Globe,
  Terminal,
  Power,
  Settings,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity,
  Cpu,
  Sparkles,
  ExternalLink,
  Layers,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Clock,
  FolderOpen
} from 'lucide-react';
import {
  ServiceStatus,
  EnvironmentLog,
  PortStatus,
  ProcessStatus,
  IdeInfo,
  AppSettings,
  EnvironmentAutomationConfig,
  AutomationProfile,
  AutomationStep,
  detectIdeInfo,
  getWebPort,
  getWebUrl
} from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';
import { ProfileEditorModal } from '../components/ProfileEditorModal';

interface EnvironmentPageProps {
  services: ServiceStatus[];
  onRefreshServices: () => void;
  onNavigateToSettings?: () => void;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = ({
  services,
  onRefreshServices,
  onNavigateToSettings
}) => {
  const [logs, setLogs] = useState<(string | EnvironmentLog)[]>([]);
  const [ports, setPorts] = useState<PortStatus[]>([]);
  const [processes, setProcesses] = useState<ProcessStatus[]>([]);
  const [isCheckingPorts, setIsCheckingPorts] = useState(false);
  const [isCheckingProcesses, setIsCheckingProcesses] = useState(false);
  const [isKarafEmbeddedRunning, setIsKarafEmbeddedRunning] = useState<boolean>(false);
  const [ideInfo, setIdeInfo] = useState<IdeInfo>(() => detectIdeInfo());
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Perfis de Automação
  const [profiles, setProfiles] = useState<AutomationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AutomationProfile | null>(null);

  // Estados de Execução da Esteira
  const [isRunningProfile, setIsRunningProfile] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeStepTotal, setActiveStepTotal] = useState<number>(0);
  const [currentRunningStepId, setCurrentRunningStepId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stepActionLoading, setStepActionLoading] = useState<Record<string, 'run' | 'stop' | 'restart'>>({});
  const [selectedServiceRows, setSelectedServiceRows] = useState<Set<string>>(new Set());

  // Perfil Ativo Selecionado
  const activeProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  // Carregar Configurações e Perfis
  const fetchSettings = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
      try {
        const st = await window.electronAPI.getSettings();
        setSettings(st);
        setIdeInfo(detectIdeInfo(st.intellijPath, st.ideName));

        if (st.automationProfiles && st.automationProfiles.length > 0) {
          setProfiles(st.automationProfiles);
          setActiveProfileId(st.activeProfileId || st.automationProfiles[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
      }
    }
  }, []);

  // Verificar Portas
  const fetchPorts = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.checkPorts) {
      setIsCheckingPorts(true);
      try {
        const portData = await window.electronAPI.checkPorts();
        setPorts(portData);
      } finally {
        setIsCheckingPorts(false);
      }
    }
  }, []);

  // Verificar Processos
  const fetchProcesses = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.getProcessesStatus) {
      setIsCheckingProcesses(true);
      try {
        const procData = await window.electronAPI.getProcessesStatus();
        setProcesses(procData);
      } finally {
        setIsCheckingProcesses(false);
      }
    }
  }, []);

  // Verificar Karaf
  const checkKarafRunning = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.isEmbeddedKarafRunning) {
      const running = await window.electronAPI.isEmbeddedKarafRunning();
      setIsKarafEmbeddedRunning(running);
    }
  }, []);

  const refreshAllStatus = useCallback(() => {
    onRefreshServices();
    fetchPorts();
    fetchProcesses();
    checkKarafRunning();
  }, [onRefreshServices, fetchPorts, fetchProcesses, checkKarafRunning]);

  useEffect(() => {
    fetchSettings();
    refreshAllStatus();

    const interval = setInterval(() => {
      fetchPorts();
      fetchProcesses();
      checkKarafRunning();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchSettings, refreshAllStatus, fetchPorts, fetchProcesses, checkKarafRunning]);

  // Ouvir logs e progresso de passos
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubEnv = window.electronAPI.onEnvLog((newLog) => {
      setLogs((prev) => [...prev, newLog]);
      if (newLog.message.includes('sucesso') || newLog.message.includes('🎉')) {
        refreshAllStatus();
      }
    });

    const unsubKaraf = window.electronAPI.onKarafStdout((chunk) => {
      setLogs((prev) => [...prev, chunk]);
      checkKarafRunning();
    });

    const unsubStep = window.electronAPI.onProfileStepProgress?.((data) => {
      setActiveStepIndex(data.stepIndex);
      setActiveStepTotal(data.totalSteps);
      setCurrentRunningStepId(data.step.id);
    });

    return () => {
      unsubEnv();
      unsubKaraf();
      if (unsubStep) unsubStep();
    };
  }, [refreshAllStatus, checkKarafRunning]);

  // Gestão de Perfis (Salvar / Selecionar / Duplicar / Excluir)
  const handleSelectProfile = async (id: string) => {
    setActiveProfileId(id);
    if (window.electronAPI && window.electronAPI.saveProfiles) {
      await window.electronAPI.saveProfiles(profiles, id);
    }
  };

  const handleSaveProfile = async (saved: AutomationProfile) => {
    let updatedProfiles: AutomationProfile[];
    const exists = profiles.some((p) => p.id === saved.id);

    if (exists) {
      updatedProfiles = profiles.map((p) => (p.id === saved.id ? saved : p));
    } else {
      updatedProfiles = [...profiles, saved];
    }

    setProfiles(updatedProfiles);
    setActiveProfileId(saved.id);

    if (window.electronAPI && window.electronAPI.saveProfiles) {
      await window.electronAPI.saveProfiles(updatedProfiles, saved.id);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      alert('Não é possível excluir o único perfil existente.');
      return;
    }
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    const nextId = remaining[0]?.id || '';
    setActiveProfileId(nextId);

    if (window.electronAPI && window.electronAPI.saveProfiles) {
      await window.electronAPI.saveProfiles(remaining, nextId);
    }
  };

  const handleDuplicateProfile = async () => {
    if (!activeProfile) return;
    const duplicated: AutomationProfile = {
      ...activeProfile,
      id: `profile-${Date.now()}`,
      name: `${activeProfile.name} (Cópia)`,
      isDefault: false,
      steps: activeProfile.steps.map((s) => ({
        ...s,
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }))
    };
    await handleSaveProfile(duplicated);
  };

  // Toggle de Habilitação do Passo no Perfil Ativo
  const handleToggleStepEnabled = async (stepId: string, enabled: boolean) => {
    if (!activeProfile) return;
    const updatedSteps = activeProfile.steps.map((s) => (s.id === stepId ? { ...s, enabled } : s));
    const updatedProfile = { ...activeProfile, steps: updatedSteps };
    const updatedProfiles = profiles.map((p) => (p.id === activeProfile.id ? updatedProfile : p));

    setProfiles(updatedProfiles);
    if (window.electronAPI && window.electronAPI.saveProfiles) {
      await window.electronAPI.saveProfiles(updatedProfiles, activeProfile.id);
    }
  };

  // Execução do Perfil Completo em Sequência
  const handleRunActiveProfile = async () => {
    if (isRunningProfile || !activeProfile) return;
    if (!window.electronAPI || !window.electronAPI.runProfile) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: 'Interface desktop não detectada.'
        }
      ]);
      return;
    }

    setIsRunningProfile(true);
    setActiveStepIndex(1);
    setActiveStepTotal(activeProfile.steps.filter((s) => s.enabled !== false).length);
    setLogs([]);

    try {
      await window.electronAPI.runProfile(activeProfile);
      refreshAllStatus();
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: `Falha na execução do perfil: ${err?.message || err}`
        }
      ]);
    } finally {
      setIsRunningProfile(false);
      setCurrentRunningStepId(null);
    }
  };

  // Parar Todos do Perfil Ativo
  const handleStopActiveProfile = async () => {
    if (!activeProfile || !window.electronAPI || !window.electronAPI.stopProfile) return;
    setActionLoading('stop-all');
    try {
      await window.electronAPI.stopProfile(activeProfile);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  // Reiniciar Todos do Perfil Ativo
  const handleRestartActiveProfile = async () => {
    if (!activeProfile) return;
    await handleStopActiveProfile();
    await new Promise((r) => setTimeout(r, 1500));
    await handleRunActiveProfile();
  };

  // Ações Individuais de um Passo do Perfil
  const handleRunStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.runProfileStep) return;
    setStepActionLoading((prev) => ({ ...prev, [step.id]: 'run' }));
    try {
      await window.electronAPI.runProfileStep(step, activeProfile?.name);
      setTimeout(() => refreshAllStatus(), 2000);
    } finally {
      setStepActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[step.id];
        return copy;
      });
    }
  };

  const handleStopStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.stopProfileStep) return;
    setStepActionLoading((prev) => ({ ...prev, [step.id]: 'stop' }));
    try {
      await window.electronAPI.stopProfileStep(step);
      refreshAllStatus();
    } finally {
      setStepActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[step.id];
        return copy;
      });
    }
  };

  const handleRestartStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.restartProfileStep) return;
    setStepActionLoading((prev) => ({ ...prev, [step.id]: 'restart' }));
    try {
      await window.electronAPI.restartProfileStep(step, activeProfile?.name);
      setTimeout(() => refreshAllStatus(), 2000);
    } finally {
      setStepActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[step.id];
        return copy;
      });
    }
  };

  // Ações de Serviços Windows Individuais
  const handleStartService = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`start-${name}`);
    try {
      await window.electronAPI.startService(name);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopService = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`stop-${name}`);
    try {
      await window.electronAPI.stopService(name);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchStopServices = async () => {
    if (!window.electronAPI) return;
    const targets =
      selectedServiceRows.size > 0
        ? Array.from(selectedServiceRows)
        : services.filter((s) => s.state === 'RUNNING').map((s) => s.name);

    if (targets.length === 0) return;
    setActionLoading('batch-stop-srv');
    try {
      await window.electronAPI.batchStopServices(targets);
      refreshAllStatus();
      setSelectedServiceRows(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchStartServices = async () => {
    if (!window.electronAPI) return;
    const targets =
      selectedServiceRows.size > 0
        ? Array.from(selectedServiceRows)
        : services.filter((s) => s.state !== 'RUNNING').map((s) => s.name);

    if (targets.length === 0) return;
    setActionLoading('batch-start-srv');
    try {
      await window.electronAPI.batchStartServices(targets);
      refreshAllStatus();
      setSelectedServiceRows(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const handleKillProcess = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`kill-${name}`);
    try {
      const ok = await window.electronAPI.batchKillProcesses([name]);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: ok[name] ? 'success' : 'info',
          message: ok[name]
            ? `Processo ${name} encerrado com sucesso.`
            : `Processo ${name} não estava em execução.`
        }
      ]);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendKarafCommand = (cmd: string) => {
    if (window.electronAPI && window.electronAPI.sendKarafInput) {
      setLogs((prev) => [...prev, `karaf@root()> ${cmd}\r\n`]);
      window.electronAPI.sendKarafInput(cmd);
    }
  };

  const handleOpenLink = (url: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    }
  };

  const runningServicesCount = services.filter((s) => s.state === 'RUNNING').length;
  const runningProcessesCount = processes.filter((p) => p.isRunning).length;
  const activePortsCount = ports.filter((p) => p.inUse).length;
  const webPort = getWebPort(settings, ports);
  const isWebPortActive = ports.some((p) => p.port === webPort && p.inUse);
  const webPortalUrl = getWebUrl(settings, '', ports);
  const karafConsoleUrl = getWebUrl(settings, '/system/console', ports);

  // Helper para ícone por tipo de etapa
  const getStepIcon = (type: AutomationStep['type']) => {
    switch (type) {
      case 'command':
        return Terminal;
      case 'kill-port':
        return Activity;
      case 'service-start':
      case 'service-stop':
        return Server;
      case 'kill-process':
        return Flame;
      case 'ide':
        return Code2;
      case 'karaf':
        return Bug;
      case 'browser':
        return Globe;
      default:
        return Zap;
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-5 space-y-3.5 overflow-hidden">
      {/* 1. Cockpit Unificado: Seletor de Perfis & Orquestrador */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-col space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Título, Ícone e Seletor de Perfil */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Preparação de Ambiente &amp; Workflows
                </h2>

                {/* Dropdown de Perfis */}
                <div className="relative inline-block">
                  <select
                    value={activeProfileId}
                    onChange={(e) => handleSelectProfile(e.target.value)}
                    className="bg-card border border-primary/40 rounded-lg px-3 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="bg-card text-foreground font-medium">
                        📁 {p.name} ({p.steps?.length || 0} passos)
                      </option>
                    ))}
                  </select>
                </div>

                {isRunningProfile && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Executando [{activeStepIndex}/{activeStepTotal}]...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeProfile?.description || 'Ambiente 100% configurável sem nomes fixos. Suba projetos e libere portas em sequência.'}
              </p>
            </div>
          </div>

          {/* Ações de Gestão do Perfil e Botões Principais */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botões do Perfil: Novo, Editar, Duplicar */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(null);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
                title="Criar um novo perfil de ambiente personalizado"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Novo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingProfile(activeProfile);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
                title="Editar os passos, comandos e portas do perfil ativo"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={handleDuplicateProfile}
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
                title="Duplicar este perfil"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Parar Tudo do Perfil */}
            <button
              type="button"
              onClick={handleStopActiveProfile}
              disabled={actionLoading === 'stop-all' || isRunningProfile}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
              title="Encerrar todos os processos e portas configuradas neste perfil"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Parar Tudo</span>
            </button>

            {/* Reiniciar Tudo do Perfil */}
            <button
              type="button"
              onClick={handleRestartActiveProfile}
              disabled={isRunningProfile}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm"
              title="Derrubar todas as portas e reexecutar a esteira na sequência"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reiniciar Tudo</span>
            </button>

            {/* BOTÃO PRINCIPAL: Subir Ambiente em Sequência */}
            <button
              type="button"
              onClick={handleRunActiveProfile}
              disabled={isRunningProfile || !activeProfile?.steps || activeProfile.steps.length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                isRunningProfile || !activeProfile?.steps || activeProfile.steps.length === 0
                  ? 'bg-primary/40 text-muted-foreground cursor-not-allowed border border-primary/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.02] border border-primary/40'
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${isRunningProfile ? 'animate-spin' : ''}`} />
              <span>{isRunningProfile ? 'Executando Esteira...' : 'Subir Ambiente em Sequência'}</span>
            </button>
          </div>
        </div>

        {/* Stepper Visual Sequencial do Perfil Ativo */}
        {activeProfile?.steps && activeProfile.steps.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Esteira Sequencial de Inicialização ({activeProfile.steps.filter((s) => s.enabled !== false).length} etapas)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Ordem de subida: 1º ao último com intervalo e monitoramento de porta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {activeProfile.steps.map((step, index) => {
                const stepNum = index + 1;
                const isCurrent = isRunningProfile && currentRunningStepId === step.id;
                const isPast = isRunningProfile && activeStepIndex > stepNum;
                const portStatus = step.port ? ports.find((p) => p.port === step.port) : undefined;
                const isPortUp = portStatus?.inUse ?? false;
                const StepIcon = getStepIcon(step.type);

                let borderStyle = 'border-border bg-card/60 text-muted-foreground';
                if (isCurrent) {
                  borderStyle = 'border-primary bg-primary/15 text-primary ring-1 ring-primary glow-primary';
                } else if (isPast || isPortUp) {
                  borderStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
                }

                return (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2.5 transition-all ${
                      step.enabled === false ? 'opacity-40 grayscale' : ''
                    } ${borderStyle}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground animate-pulse'
                          : isPortUp || isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isPortUp || isPast ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : stepNum}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate text-foreground flex items-center gap-1">
                        <StepIcon className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{step.name}</span>
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground truncate flex items-center gap-1.5">
                        {step.port ? (
                          <span className={isPortUp ? 'text-emerald-500 font-bold' : ''}>
                            :{step.port} {isPortUp ? '● UP' : '○ OFF'}
                          </span>
                        ) : (
                          <span>{step.type}</span>
                        )}
                        {step.delayAfterSeconds ? <span>• {step.delayAfterSeconds}s delay</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Barra de Portas e Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Monitor de Portas */}
        <div className="md:col-span-8 bg-card border border-border/80 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <Radio className={`w-3.5 h-3.5 ${isCheckingPorts ? 'animate-spin text-primary' : 'text-primary'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Portas Monitoradas ({activePortsCount}/{ports.length} ativas):
            </span>
            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
                title="Personalizar portas monitoradas nas Configurações"
              >
                <Settings className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ports.map((p) => (
              <div
                key={p.port}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                  p.inUse
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-semibold'
                    : 'bg-muted/40 border-border/60 text-muted-foreground'
                }`}
                title={`${p.label} - ${p.inUse ? `Porta ocupada (PID: ${p.pid || 'Ativo'})` : 'Porta livre / desconectada'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.inUse ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                <span>:{p.port}</span>
                <span className="text-[9px] text-muted-foreground font-sans hidden sm:inline">({p.label.split(' ')[0]})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links Rápidos do Portal Web */}
        <div className="md:col-span-4 flex items-center space-x-2">
          <button
            onClick={() => handleOpenLink(webPortalUrl)}
            className="flex-1 py-2 px-3 bg-card hover:bg-muted/60 border border-border hover:border-primary/50 rounded-xl text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-all shadow-sm"
            title={`Abrir Portal Web no navegador (${webPortalUrl})`}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">Portal Web (:{webPort})</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>

          <button
            onClick={() => handleOpenLink(karafConsoleUrl)}
            className="py-2 px-3 bg-card hover:bg-muted/60 border border-border hover:border-primary/50 rounded-xl text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-all shadow-sm"
            title={`Abrir Console Web OSGi / Apache Felix (${karafConsoleUrl})`}
          >
            <Server className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Console OSGi</span>
          </button>
        </div>
      </div>

      {/* 3. Grid Principal: Cards das Etapas do Perfil à Esquerda / Console à Direita */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden">
        {/* Coluna Esquerda: Cards de cada Serviço / Etapa do Perfil + Diagnósticos */}
        <div className="lg:col-span-6 flex flex-col space-y-3 overflow-y-auto pr-1">
          {/* Cartões dos Passos do Perfil Ativo */}
          <div className="cockpit-panel rounded-2xl p-4 flex flex-col border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Projetos e Serviços da Stack ({activeProfile?.steps?.length || 0})
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(activeProfile);
                    setIsProfileModalOpen(true);
                  }}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Configurar Etapas
                </button>
              </div>
            </div>

            {/* Grid dos Cards de Cada Passo */}
            <div className="space-y-2.5">
              {activeProfile?.steps && activeProfile.steps.length > 0 ? (
                activeProfile.steps.map((step, idx) => {
                  const portStatus = step.port ? ports.find((p) => p.port === step.port) : undefined;
                  const isPortActive = portStatus?.inUse ?? false;
                  const loadingAction = stepActionLoading[step.id];
                  const StepIcon = getStepIcon(step.type);

                  return (
                    <div
                      key={step.id}
                      className={`p-3 bg-card border rounded-xl flex flex-col gap-2 transition-all shadow-sm ${
                        step.enabled === false
                          ? 'opacity-50 border-border/40 bg-muted/20'
                          : isPortActive
                          ? 'border-emerald-500/40 hover:border-emerald-500/60'
                          : 'border-border/80 hover:border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Checkbox e Título */}
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={step.enabled !== false}
                            onChange={(e) => handleToggleStepEnabled(step.id, e.target.checked)}
                            className="mt-1 rounded border-border text-primary h-4 w-4 shrink-0 cursor-pointer"
                            title="Habilitar ou desabilitar este passo na execução em lote"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">{step.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                                {step.type}
                              </span>
                              {step.launchMode && (
                                <span className="text-[9px] font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20">
                                  {step.launchMode === 'wt' ? 'WT Abas' : step.launchMode === 'cmd' ? 'CMD' : 'Background'}
                                </span>
                              )}
                            </div>

                            {/* Pasta e Comando */}
                            <div className="mt-1 space-y-0.5 text-[10px] font-mono text-muted-foreground truncate">
                              {step.cwd && (
                                <p className="truncate text-muted-foreground/80 flex items-center gap-1">
                                  <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{step.cwd}</span>
                                </p>
                              )}
                              {step.command && (
                                <p className="truncate text-foreground/80 font-mono bg-muted/40 px-1.5 py-0.5 rounded max-w-md">
                                  $ {step.command}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status da Porta & Botões Individuais */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {step.port ? (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                isPortActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-muted/40 text-muted-foreground border border-border/60'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPortActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                                }`}
                              />
                              :{step.port} {isPortActive ? 'Online' : 'Offline'}
                            </span>
                          ) : null}

                          <div className="flex items-center space-x-1">
                            {/* Botão Individual Play */}
                            <button
                              type="button"
                              onClick={() => handleRunStep(step)}
                              disabled={loadingAction === 'run' || isRunningProfile}
                              className="p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Iniciar apenas este serviço"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Subir</span>
                            </button>

                            {/* Botão Individual Stop */}
                            <button
                              type="button"
                              onClick={() => handleStopStep(step)}
                              disabled={loadingAction === 'stop' || isRunningProfile}
                              className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Encerrar porta / processo deste serviço"
                            >
                              <Square className="w-3 h-3" />
                              <span>Parar</span>
                            </button>

                            {/* Botão Individual Restart */}
                            <button
                              type="button"
                              onClick={() => handleRestartStep(step)}
                              disabled={loadingAction === 'restart' || isRunningProfile}
                              className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Reiniciar este serviço (mata a porta e sobe de novo)"
                            >
                              <RefreshCw className={`w-3 h-3 ${loadingAction === 'restart' ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhum passo cadastrado neste perfil. Clique em "Configurar Etapas" acima para adicionar!
                </div>
              )}
            </div>
          </div>

          {/* Seção Colapsável: Diagnósticos do Sistema (Serviços e Processos do Windows) */}
          <div className="cockpit-panel rounded-2xl p-3 border border-border flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                <span>Serviços Windows e Travas do Sistema ({services.length} monitorados)</span>
              </div>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDiagnostics && (
              <div className="space-y-3 pt-2 border-t border-border/50 animate-fade-in">
                {/* Ações Rápidas de Parada de Serviços */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {runningServicesCount} rodando • {runningProcessesCount} travas
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {runningServicesCount > 0 && (
                      <button
                        onClick={handleBatchStopServices}
                        disabled={actionLoading === 'batch-stop-srv'}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold"
                      >
                        Parar Serviços
                      </button>
                    )}
                    {runningServicesCount < services.length && (
                      <button
                        onClick={handleBatchStartServices}
                        disabled={actionLoading === 'batch-start-srv'}
                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
                      >
                        Iniciar Serviços
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista compacta de Serviços Windows */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {services.map((srv) => (
                    <div
                      key={srv.name}
                      className="p-2 bg-card/60 border border-border/60 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            srv.state === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                          }`}
                        />
                        <span className="font-semibold text-foreground truncate">{srv.displayName || srv.name}</span>
                      </div>
                      <div>
                        {srv.state === 'RUNNING' ? (
                          <button
                            onClick={() => handleStopService(srv.name)}
                            disabled={actionLoading === `stop-${srv.name}`}
                            className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[10px] font-bold"
                          >
                            Parar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartService(srv.name)}
                            disabled={actionLoading === `start-${srv.name}`}
                            className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-bold"
                          >
                            Iniciar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Processos com travas */}
                {processes.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Processos Conflitantes:
                    </span>
                    <div className="space-y-1">
                      {processes.map((p) => (
                        <div
                          key={p.name}
                          className="p-1.5 bg-card/40 border border-border/40 rounded flex items-center justify-between text-xs"
                        >
                          <span className="text-[11px] truncate text-foreground">{p.displayName || p.name}</span>
                          {p.isRunning ? (
                            <button
                              onClick={() => handleKillProcess(p.name)}
                              className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-bold"
                            >
                              Matar
                            </button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-mono">Inativo</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Console / Terminal Integrado */}
        <div className="lg:col-span-6 h-full">
          <TerminalViewer
            logs={logs}
            onClear={() => setLogs([])}
            title={`Console de Operações - ${activeProfile?.name || 'Ambiente'}`}
            isRunning={isRunningProfile || isKarafEmbeddedRunning}
            onSendCommand={isKarafEmbeddedRunning ? handleSendKarafCommand : undefined}
            inputPlaceholder="Digite um comando OSGi Karaf ou comando direto..."
          />
        </div>
      </div>

      {/* Modal de Criação / Edição de Perfil de Automação */}
      <ProfileEditorModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setEditingProfile(null);
        }}
        profile={editingProfile}
        onSave={handleSaveProfile}
        onDelete={handleDeleteProfile}
      />
    </div>
  );
};
