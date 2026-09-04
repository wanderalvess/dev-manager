import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Settings,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity,
  ExternalLink,
  Layers,
  Plus,
  Edit3,
  Copy,
  Clock,
  FolderOpen,
  Wifi,
  Cpu,
  Check,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import {
  ServiceStatus,
  EnvironmentLog,
  PortStatus,
  ProcessStatus,
  AppSettings,
  AutomationProfile,
  AutomationStep,
  NetworkIpInfo,
  HttpHealthResult,
  getWebPort,
  getWebUrl
} from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';
import { ProfileEditorModal } from '../components/ProfileEditorModal';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

  // Referências para valores voláteis usados em checagens periódicas (evita recriar callbacks)
  const settingsRef = useRef<AppSettings | null>(settings);
  settingsRef.current = settings;

  const portsRef = useRef<PortStatus[]>(ports);
  portsRef.current = ports;

  const profilesRef = useRef<AutomationProfile[]>(profiles);
  profilesRef.current = profiles;

  // Carregar Configurações e Perfis
  const fetchSettings = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
      try {
        const st = await window.electronAPI.getSettings();
        setSettings(st);
        settingsRef.current = st;

        if (st.automationProfiles && st.automationProfiles.length > 0) {
          setProfiles(st.automationProfiles);
          profilesRef.current = st.automationProfiles;
          setActiveProfileId((curr) => curr || st.activeProfileId || st.automationProfiles[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
      }
    }
  }, []);

  // Verificar Portas com trava contra chamadas sobrepostas e verificação de igualdade
  const isCheckingPortsRef = useRef(false);
  const fetchPorts = useCallback(async () => {
    if (isCheckingPortsRef.current) return;
    if (window.electronAPI && window.electronAPI.checkPorts) {
      isCheckingPortsRef.current = true;
      setIsCheckingPorts(true);
      try {
        const portData = await window.electronAPI.checkPorts();
        setPorts((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(portData)) return prev;
          return portData || [];
        });
      } finally {
        setIsCheckingPorts(false);
        isCheckingPortsRef.current = false;
      }
    }
  }, []);

  // Verificar Processos com trava contra chamadas sobrepostas e verificação de igualdade
  const isCheckingProcessesRef = useRef(false);
  const fetchProcesses = useCallback(async () => {
    if (isCheckingProcessesRef.current) return;
    if (window.electronAPI && window.electronAPI.getProcessesStatus) {
      isCheckingProcessesRef.current = true;
      setIsCheckingProcesses(true);
      try {
        const procData = await window.electronAPI.getProcessesStatus();
        setProcesses((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(procData)) return prev;
          return procData || [];
        });
      } finally {
        setIsCheckingProcesses(false);
        isCheckingProcessesRef.current = false;
      }
    }
  }, []);

  // Verificar Karaf
  const isCheckingKarafRef = useRef(false);
  const checkKarafRunning = useCallback(async () => {
    if (isCheckingKarafRef.current) return;
    if (window.electronAPI && window.electronAPI.isEmbeddedKarafRunning) {
      isCheckingKarafRef.current = true;
      try {
        const running = await window.electronAPI.isEmbeddedKarafRunning();
        setIsKarafEmbeddedRunning((prev) => (prev === running ? prev : running));
      } finally {
        isCheckingKarafRef.current = false;
      }
    }
  }, []);

  // Verificar IPs de Rede
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo | null>(null);
  const { copy: copyIp, copiedKey: copiedIp } = useCopyToClipboard();
  const [webHealth, setWebHealth] = useState<HttpHealthResult | null>(null);

  const isCheckingNetworkRef = useRef(false);
  const fetchNetworkIps = useCallback(async () => {
    if (isCheckingNetworkRef.current) return;
    if (window.electronAPI && window.electronAPI.getNetworkIps) {
      isCheckingNetworkRef.current = true;
      try {
        const data = await window.electronAPI.getNetworkIps();
        setNetworkIps((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      } catch (err) {
        console.error('Erro ao buscar IPs de rede:', err);
      } finally {
        isCheckingNetworkRef.current = false;
      }
    }
  }, []);

  // Checagem Web Health estável com URL computada via refs atuais
  const isCheckingWebHealthRef = useRef(false);
  const checkWebHealth = useCallback(async () => {
    if (isCheckingWebHealthRef.current) return;
    if (window.electronAPI && window.electronAPI.checkHttpHealth) {
      isCheckingWebHealthRef.current = true;
      try {
        const url = getWebUrl(settingsRef.current, '', portsRef.current);
        const res = await window.electronAPI.checkHttpHealth(url, 2000);
        setWebHealth((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(res)) return prev;
          return res;
        });
      } catch {
        setWebHealth(null);
      } finally {
        isCheckingWebHealthRef.current = false;
      }
    }
  }, []);

  const refreshAllStatus = useCallback(() => {
    onRefreshServices();
    fetchPorts();
    fetchProcesses();
    checkKarafRunning();
    fetchNetworkIps();
    checkWebHealth();
  }, [onRefreshServices, fetchPorts, fetchProcesses, checkKarafRunning, fetchNetworkIps, checkWebHealth]);

  // Montagem estável: executa carga inicial UMA VEZ e define polling de 8s sem loop infinito
  useEffect(() => {
    fetchSettings();
    refreshAllStatus();

    const interval = setInterval(() => {
      fetchPorts();
      fetchProcesses();
      checkKarafRunning();
      checkWebHealth();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Ouvir logs e progresso de passos com buffer controlado para evitar estouro de memória
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubEnv = window.electronAPI.onEnvLog((newLog) => {
      setLogs((prev) => {
        const next = [...prev, newLog];
        return next.length > 1000 ? next.slice(next.length - 1000) : next;
      });
      if (newLog.message.includes('sucesso') || newLog.message.includes('🎉')) {
        refreshAllStatus();
      }
    });

    const unsubKaraf = window.electronAPI.onKarafStdout((chunk) => {
      setLogs((prev) => {
        const next = [...prev, chunk];
        return next.length > 1000 ? next.slice(next.length - 1000) : next;
      });
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

  // Persistência Centralizada de Perfis (Sem risco de closure defasada / sobreposição)
  const persistProfiles = useCallback(
    async (newProfiles: AutomationProfile[], newActiveId: string) => {
      setProfiles(newProfiles);
      profilesRef.current = newProfiles;
      setActiveProfileId(newActiveId);

      if (window.electronAPI && window.electronAPI.saveProfiles) {
        try {
          const updatedSettings = await window.electronAPI.saveProfiles(newProfiles, newActiveId);
          if (updatedSettings) {
            setSettings(updatedSettings);
            settingsRef.current = updatedSettings;
          }
        } catch (err) {
          console.error('Erro ao persistir perfis:', err);
        }
      }
    },
    []
  );

  // Gestão de Perfis (Salvar / Selecionar / Duplicar / Excluir / Exportar / Importar)
  const handleSelectProfile = useCallback(
    async (id: string) => {
      const currentList = profilesRef.current;
      await persistProfiles(currentList, id);
    },
    [persistProfiles]
  );

  const handleSaveProfile = useCallback(
    async (saved: AutomationProfile) => {
      const currentList = profilesRef.current;
      const exists = currentList.some((p) => p.id === saved.id);
      const updated = exists
        ? currentList.map((p) => (p.id === saved.id ? saved : p))
        : [...currentList, saved];
      await persistProfiles(updated, saved.id);
    },
    [persistProfiles]
  );

  const handleDeleteProfile = useCallback(
    async (id: string, skipConfirm = false) => {
      const currentList = profilesRef.current;
      if (currentList.length <= 1) {
        alert('Não é possível excluir o único perfil existente.');
        return;
      }
      const target = currentList.find((p) => p.id === id);
      if (!target) return;

      if (!skipConfirm) {
        if (!confirm(`Tem certeza que deseja excluir o perfil "${target.name}"?`)) {
          return;
        }
      }

      const remaining = currentList.filter((p) => p.id !== id);
      const nextActiveId = remaining[0]?.id || '';
      await persistProfiles(remaining, nextActiveId);
    },
    [persistProfiles]
  );

  const handleDuplicateProfile = useCallback(async () => {
    const currentActive = activeProfile;
    if (!currentActive) return;

    const newId = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: AutomationProfile = {
      ...currentActive,
      id: newId,
      name: `${currentActive.name} (Cópia)`,
      isDefault: false,
      steps: (currentActive.steps || []).map((s) => ({
        ...s,
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }))
    };

    const currentList = profilesRef.current;
    await persistProfiles([...currentList, duplicated], newId);
  }, [activeProfile, persistProfiles]);

  // Exportar Perfil Pronto como JSON
  const handleExportProfile = useCallback(
    (profileToExport?: AutomationProfile) => {
      const target = profileToExport || activeProfile;
      if (!target) {
        alert('Nenhum perfil selecionado para exportação.');
        return;
      }

      try {
        const exportData = {
          version: 1,
          type: 'dev-manager-automation-profile',
          exportedAt: new Date().toISOString(),
          profile: {
            name: target.name,
            description: target.description || '',
            steps: (target.steps || []).map((s) => ({
              name: s.name,
              type: s.type,
              enabled: s.enabled !== false,
              command: s.command || '',
              cwd: s.cwd || '',
              port: s.port,
              waitForPort: s.waitForPort ?? false,
              delayAfterSeconds: s.delayAfterSeconds ?? 2,
              targetName: s.targetName || '',
              browserUrl: s.browserUrl || '',
              launchMode: s.launchMode || 'wt'
            }))
          }
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (target.name || 'perfil')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_-]/gi, '_')
          .replace(/_+/g, '_');
        a.href = url;
        a.download = `perfil-${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        alert(`Erro ao exportar perfil: ${err?.message || err}`);
      }
    },
    [activeProfile]
  );

  // Importar Perfil a partir de JSON
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Suporta formato exportado padrão { profile: { ... } } ou direto { name, steps }
        const rawProfile = parsed.profile || (parsed.steps ? parsed : null);

        if (!rawProfile || !Array.isArray(rawProfile.steps)) {
          alert('Arquivo JSON inválido. O arquivo deve conter uma lista de etapas (steps) válida.');
          return;
        }

        const newId = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const importedProfile: AutomationProfile = {
          id: newId,
          name: rawProfile.name ? `${rawProfile.name} (Importado)` : 'Perfil Importado',
          description: rawProfile.description || '',
          isDefault: false,
          steps: (rawProfile.steps || []).map((s: any, idx: number) => ({
            id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: s.name || `Etapa ${idx + 1}`,
            type: s.type || 'command',
            enabled: s.enabled !== false,
            command: s.command || '',
            cwd: s.cwd || '',
            port: s.port,
            waitForPort: s.waitForPort ?? false,
            delayAfterSeconds: s.delayAfterSeconds ?? 2,
            targetName: s.targetName || '',
            browserUrl: s.browserUrl || '',
            launchMode: s.launchMode || 'wt'
          }))
        };

        const currentList = profilesRef.current;
        await persistProfiles([...currentList, importedProfile], newId);
        alert(`Perfil "${importedProfile.name}" importado com sucesso!`);
      } catch (err: any) {
        alert(`Falha ao importar perfil: ${err?.message || err}`);
      } finally {
        if (e.target) e.target.value = '';
      }
    },
    [persistProfiles]
  );

  // Toggle de Habilitação do Passo no Perfil Ativo
  const handleToggleStepEnabled = useCallback(
    async (stepId: string, enabled: boolean) => {
      if (!activeProfile) return;
      const currentList = profilesRef.current;
      const currentActive = currentList.find((p) => p.id === activeProfile.id) || activeProfile;
      const updatedSteps = (currentActive.steps || []).map((s) => (s.id === stepId ? { ...s, enabled } : s));
      const updatedProfile = { ...currentActive, steps: updatedSteps };
      const updatedProfiles = currentList.map((p) => (p.id === currentActive.id ? updatedProfile : p));

      await persistProfiles(updatedProfiles, currentActive.id);
    },
    [activeProfile, persistProfiles]
  );

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
    <div className="h-full flex flex-col p-4 md:p-5 pb-8 space-y-3.5 overflow-y-auto">
      {/* 1. Cockpit Unificado: Seletor de Perfis & Orquestrador */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-col space-y-3.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Título, Ícone e Seletor de Perfil */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-foreground">
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
            {/* Botões do Perfil: Novo, Editar, Duplicar, Exportar, Importar, Excluir */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 text-xs gap-0.5">
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
                title="Duplicar este perfil ativo"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportProfile(activeProfile || undefined)}
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
                title="Exportar este perfil como arquivo JSON"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Exportar</span>
              </button>

              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
                title="Importar perfil a partir de arquivo JSON"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Importar</span>
              </button>

              {profiles.length > 1 && activeProfile && (
                <button
                  type="button"
                  onClick={() => handleDeleteProfile(activeProfile.id)}
                  className="flex items-center gap-1 px-2 py-1 text-rose-500 hover:text-rose-600 font-semibold rounded-lg hover:bg-rose-500/10 transition-colors"
                  title={`Excluir perfil "${activeProfile.name}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={importFileInputRef}
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="hidden"
            />

            {/* Menu de Ações do Perfil: Parar Tudo / Reiniciar Tudo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                disabled={isRunningProfile}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-card hover:bg-muted text-foreground border border-border shadow-sm"
                title="Ações do perfil: parar ou reiniciar toda a esteira"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Ações</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-card border border-border shadow-2xl p-1.5 z-50 flex flex-col space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleStopActiveProfile();
                      }}
                      disabled={actionLoading === 'stop-all' || isRunningProfile}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left"
                      title="Encerrar todos os processos e portas configuradas neste perfil"
                    >
                      <Square className="w-3.5 h-3.5 shrink-0" />
                      <span>Parar Tudo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleRestartActiveProfile();
                      }}
                      disabled={isRunningProfile}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-left"
                      title="Derrubar todas as portas e reexecutar a esteira na sequência"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>Reiniciar Tudo</span>
                    </button>
                  </div>
                </>
              )}
            </div>

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

            {/* Trilha compacta: o detalhe de cada etapa fica nos cartões da coluna esquerda */}
            <div className="flex items-center gap-1">
              {activeProfile.steps.map((step, index) => {
                const stepNum = index + 1;
                const isCurrent = isRunningProfile && currentRunningStepId === step.id;
                const isPast = isRunningProfile && activeStepIndex > stepNum;
                const portStatus = step.port ? ports.find((p) => p.port === step.port) : undefined;
                const isPortUp = portStatus?.inUse ?? false;
                const srvName = step.targetName || step.name;
                const srvStatus = services.find((s) => s.name.toLowerCase() === srvName.toLowerCase());
                const procStatus = processes.find((p) => p.name.toLowerCase() === (step.targetName || step.name).toLowerCase());
                const isServiceSatisfied =
                  step.type === 'service-stop'
                    ? srvStatus?.state === 'STOPPED'
                    : step.type === 'service-start'
                    ? srvStatus?.state === 'RUNNING'
                    : step.type === 'kill-process'
                    ? procStatus?.isRunning === false
                    : false;
                const isDone = isPast || isPortUp || isServiceSatisfied;

                let dotStyle = 'bg-muted text-muted-foreground border-border';
                if (isCurrent) {
                  dotStyle = 'bg-primary text-primary-foreground border-primary animate-pulse glow-primary';
                } else if (isDone) {
                  dotStyle = 'bg-emerald-500 text-white border-emerald-500';
                }

                return (
                  <React.Fragment key={step.id}>
                    {index > 0 && (
                      <div
                        className={`h-[2px] flex-1 rounded-full ${
                          isDone || isCurrent ? 'bg-emerald-500/50' : 'bg-border'
                        }`}
                      />
                    )}
                    <div
                      className={`flex items-center gap-1.5 shrink-0 ${
                        step.enabled === false ? 'opacity-40 grayscale' : ''
                      }`}
                      title={`${stepNum}. ${step.name}${step.port ? ` — porta ${step.port} ${isPortUp ? 'ativa' : 'inativa'}` : ` — ${step.type}`}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-[11px] transition-all ${dotStyle}`}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
                      </div>
                      <span
                        className={`text-[11px] font-semibold truncate max-w-[140px] ${
                          isCurrent ? 'text-primary font-bold' : isDone ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Barra de Portas e Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
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
            className="flex-1 py-2 px-3 bg-card hover:bg-muted/60 border border-border hover:border-primary/50 rounded-xl text-xs font-semibold text-foreground flex items-center justify-between gap-1.5 transition-all shadow-sm group"
            title={`Abrir Portal Web no navegador (${webPortalUrl}) - ${(webHealth?.reachable ?? webHealth?.isHealthy) ? `Ativo: HTTP ${webHealth?.status ?? webHealth?.statusCode ?? 200} (${webHealth?.timeMs ?? webHealth?.responseTimeMs ?? 0}ms)` : 'Serviço HTTP indisponível ou iniciando'}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">Portal Web (:{webPort})</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {webHealth && (
                (webHealth.reachable ?? webHealth.isHealthy) ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {webHealth.status ?? webHealth.statusCode ?? 200} ({webHealth.timeMs ?? webHealth.responseTimeMs ?? 0}ms)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Off
                  </span>
                )
              )}
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[480px]">
        {/* Coluna Esquerda: Cards de cada Serviço / Etapa do Perfil + Diagnósticos */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          {/* Cartões dos Passos do Perfil Ativo */}
          <div className="cockpit-panel rounded-2xl p-4 flex flex-col border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
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

                  const srvTarget = (step.type === 'service-start' || step.type === 'service-stop') ? (step.targetName || step.name) : null;
                  const procTarget = step.type === 'kill-process' ? (step.targetName || step.name) : null;
                  const srvFound = srvTarget ? services.find((s) => s.name.toLowerCase() === srvTarget.toLowerCase()) : undefined;
                  const procFound = procTarget ? processes.find((p) => p.name.toLowerCase() === procTarget.toLowerCase()) : undefined;

                  return (
                    <div
                      key={step.id}
                      className={`p-3 bg-card border rounded-xl flex flex-col gap-2 transition-all shadow-sm ${
                        step.enabled === false
                          ? 'opacity-50 border-border/40 bg-muted/20'
                          : isPortActive || (srvFound && srvFound.state === 'RUNNING')
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
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1">
                                <StepIcon className="w-3 h-3" />
                                {step.type}
                              </span>
                              {step.type === 'command' && step.launchMode && (
                                <span className="text-[9px] font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20">
                                  {step.launchMode === 'wt' ? 'WT Abas' : step.launchMode === 'cmd' ? 'CMD' : 'Background'}
                                </span>
                              )}
                            </div>

                            {/* Detalhes Contextuais por Tipo de Etapa */}
                            <div className="mt-1 space-y-0.5 text-[10px] font-mono text-muted-foreground truncate">
                              {/* 1. Comando */}
                              {step.type === 'command' && (
                                <>
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
                                </>
                              )}

                              {/* 2. Serviços Windows (Start / Stop) */}
                              {(step.type === 'service-start' || step.type === 'service-stop') && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-muted-foreground">Serviço:</span>
                                  <span className="text-foreground font-semibold bg-muted/50 px-1.5 py-0.5 rounded">
                                    {srvTarget}
                                  </span>
                                  {srvFound && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                        srvFound.state === 'RUNNING'
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {srvFound.state === 'RUNNING' ? 'Em Execução' : srvFound.state === 'STOPPED' ? 'Parado' : srvFound.state}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 3. Finalizar Processo */}
                              {step.type === 'kill-process' && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-muted-foreground">Processo alvo:</span>
                                  <span className="text-foreground font-semibold bg-muted/50 px-1.5 py-0.5 rounded">
                                    {procTarget}
                                  </span>
                                  {procFound && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                        procFound.isRunning
                                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {procFound.isRunning ? `Ativo (PID ${procFound.pid})` : 'Inativo'}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 4. Liberar Porta */}
                              {step.type === 'kill-port' && step.port && (
                                <p className="text-muted-foreground">
                                  Porta alvo para liberação imediata: <span className="text-foreground font-bold">:{step.port}</span>
                                </p>
                              )}

                              {/* 5. IDE */}
                              {step.type === 'ide' && (
                                <p className="text-muted-foreground">
                                  Inicializa o editor ou IDE configurado no Cockpit
                                </p>
                              )}

                              {/* 6. Navegador */}
                              {step.type === 'browser' && step.browserUrl && (
                                <p className="truncate text-primary">
                                  {step.browserUrl}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status da Porta / Serviço & Botões Individuais */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {step.type === 'command' && step.port ? (
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
                            {/* Botão Individual Executar / Subir / Iniciar */}
                            <button
                              type="button"
                              onClick={() => handleRunStep(step)}
                              disabled={loadingAction === 'run' || isRunningProfile}
                              className="p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title={
                                step.type === 'service-stop'
                                  ? 'Executar ação (parar serviço)'
                                  : step.type === 'service-start'
                                  ? 'Iniciar serviço'
                                  : 'Executar esta etapa'
                              }
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{step.type === 'service-stop' ? 'Executar' : 'Subir'}</span>
                            </button>

                            {/* Botão Individual Parar */}
                            <button
                              type="button"
                              onClick={() => handleStopStep(step)}
                              disabled={loadingAction === 'stop' || isRunningProfile}
                              className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Encerrar processo ou garantir serviço parado"
                            >
                              <Square className="w-3 h-3" />
                              <span>Parar</span>
                            </button>

                            {/* Botão Individual Restart */}
                            {step.type !== 'service-stop' && step.type !== 'kill-process' && (
                              <button
                                type="button"
                                onClick={() => handleRestartStep(step)}
                                disabled={loadingAction === 'restart' || isRunningProfile}
                                className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                title="Reiniciar esta etapa"
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingAction === 'restart' ? 'animate-spin' : ''}`} />
                              </button>
                            )}
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

          {/* Card de Informações de Rede (IP Local e IP WSL) */}
          {networkIps && (
            <div className="cockpit-panel rounded-2xl p-3 border border-border flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Wifi className="w-3.5 h-3.5 text-primary" />
                  <span>Endereços IP e Conectividade de Rede</span>
                </div>
                <button
                  type="button"
                  onClick={fetchNetworkIps}
                  title="Atualizar IPs de rede"
                  className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* IP Local */}
                <div className="p-2.5 bg-card/60 border border-border/70 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                      <Wifi className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">IP Local (Windows)</span>
                      <span className="font-mono text-xs font-bold text-foreground truncate">{networkIps.primaryLocalIp}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyIp(networkIps.primaryLocalIp, 'main_lan')}
                    className="p-1.5 px-2 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Copiar IP Local"
                  >
                    {copiedIp === 'main_lan' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span className="text-[10px]">{copiedIp === 'main_lan' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                {/* IP WSL */}
                <div className="p-2.5 bg-card/60 border border-border/70 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">IP WSL2 / Linux</span>
                      <span className="font-mono text-xs font-bold text-foreground truncate">
                        {networkIps.wslIp || 'Não detectado / inativo'}
                      </span>
                    </div>
                  </div>
                  {networkIps.wslIp && (
                    <button
                      type="button"
                      onClick={() => copyIp(networkIps.wslIp!, 'main_wsl')}
                      className="p-1.5 px-2 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Copiar IP WSL"
                    >
                      {copiedIp === 'main_wsl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[10px]">{copiedIp === 'main_wsl' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seção Colapsável: Diagnósticos do Sistema (Serviços e Processos do Windows) */}
          <div className="cockpit-panel rounded-2xl p-3 border border-border flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center justify-between text-[13px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${isCheckingProcesses ? 'animate-spin text-primary' : ''}`} />
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
        <div className="lg:col-span-6 min-h-[450px] lg:min-h-full flex flex-col">
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
        onDelete={(id) => handleDeleteProfile(id, true)}
        onExport={handleExportProfile}
      />
    </div>
  );
};
