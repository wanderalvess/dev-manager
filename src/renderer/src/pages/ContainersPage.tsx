import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  Activity,
  HardDrive,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Cpu,
  FolderPlus,
  Sparkles,
  Check,
  Database,
  Wrench,
  FileText,
  X,
  Shield,
  CheckCircle,
  Flame
} from 'lucide-react';
import { DockerContainerInfo, DockerDaemonStatus, DockerContainerStats, ComposeServiceStatus, WslDistroInfo, ContainerEnvironment } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DockerDaemonStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<Record<string, 'start' | 'stop' | 'restart' | 'remove'>>({});
  const [containerStats, setContainerStats] = useState<Record<string, DockerContainerStats>>({});
  const [isOpeningTerminal, setIsOpeningTerminal] = useState<Record<string, boolean>>({});

  // WSL Distros & Contexto
  const [availableDistros, setAvailableDistros] = useState<WslDistroInfo[]>([]);
  const [selectedDistro, setSelectedDistro] = useState<string>('');
  const [isSwitchingDistro, setIsSwitchingDistro] = useState<boolean>(false);

  // Ambientes do container-manager (~/.container-manager/environments.json)
  const [environments, setEnvironments] = useState<ContainerEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [isCreatingEnv, setIsCreatingEnv] = useState<boolean>(false);
  const [newEnvName, setNewEnvName] = useState<string>('');
  const [newEnvColor, setNewEnvColor] = useState<string>('#0066cc');

  // Sequência de Startup WinThor / Ambiente
  const [sequenceProgress, setSequenceProgress] = useState<{
    running: boolean;
    currentName?: string;
    index?: number;
    total?: number;
    waitingSeconds?: number;
    error?: string;
  }>({ running: false });

  // Modal de Logs
  const [selectedContainer, setSelectedContainer] = useState<DockerContainerInfo | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logLines, setLogLines] = useState<number>(200);
  const { copy: copyLogsToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  // Modal de Manutenção Especializada Oracle (INFR-Docker)
  const [oracleModalContainer, setOracleModalContainer] = useState<DockerContainerInfo | null>(null);
  const [oracleActiveTab, setOracleActiveTab] = useState<'health' | 'sqlplus' | 'datapump'>('health');
  const [oracleHealthSchema, setOracleHealthSchema] = useState<string>('');
  const [oracleHealthUser, setOracleHealthUser] = useState<string>('sys');
  const [oracleHealthPass, setOracleHealthPass] = useState<string>('password');
  const [isOracleHealthRunning, setIsOracleHealthRunning] = useState<boolean>(false);
  const [oracleHealthOutput, setOracleHealthOutput] = useState<string>('');
  const [oracleHealthSuccess, setOracleHealthSuccess] = useState<boolean | null>(null);

  const [oracleSqlUser, setOracleSqlUser] = useState<string>('sys');
  const [oracleSqlPass, setOracleSqlPass] = useState<string>('password');
  const [isOracleSqlOpening, setIsOracleSqlOpening] = useState<boolean>(false);

  const [dpDumpfile, setDpDumpfile] = useState<string>('backup.dmp');
  const [dpSchemaOrig, setDpSchemaOrig] = useState<string>('LOCAL');
  const [dpSchemaDest, setDpSchemaDest] = useState<string>('');
  const [dpCodclipc, setDpCodclipc] = useState<string>('9999');
  const [dpUser, setDpUser] = useState<string>('system');
  const [dpPass, setDpPass] = useState<string>('password');
  const [isDpRunning, setIsDpRunning] = useState<boolean>(false);
  const [dpOutput, setDpOutput] = useState<string>('');
  const [dpSuccess, setDpSuccess] = useState<boolean | null>(null);

  // Docker Compose
  const [composeFilePath, setComposeFilePath] = useState<string>('');
  const [composeProfile, setComposeProfile] = useState<string>('');
  const [isComposeRunning, setIsComposeRunning] = useState<'up' | 'down' | null>(null);
  const [composeOutput, setComposeOutput] = useState<string>('');
  const [composeServices, setComposeServices] = useState<ComposeServiceStatus[]>([]);
  const [isLoadingComposeStatus, setIsLoadingComposeStatus] = useState<boolean>(false);
  const composeOutputRef = useRef<HTMLPreElement>(null);

  // Carregar Métricas de Recursos (docker stats)
  const loadDockerStats = useCallback(async () => {
    if (!window.electronAPI?.getDockerContainerStats) return;
    try {
      const statsList = await window.electronAPI.getDockerContainerStats();
      if (Array.isArray(statsList)) {
        const map: Record<string, DockerContainerStats> = {};
        for (const s of statsList) {
          map[s.id] = s;
          if (s.name) map[s.name] = s;
        }
        setContainerStats(map);
      }
    } catch {
      // Falha silenciosa caso o daemon esteja oscilando
    }
  }, []);

  // Abrir Terminal Interativo no Container
  const handleOpenTerminal = async (container: DockerContainerInfo) => {
    if (!window.electronAPI?.openDockerContainerTerminal) return;
    setIsOpeningTerminal((prev) => ({ ...prev, [container.id]: true }));
    try {
      await window.electronAPI.openDockerContainerTerminal(container.id);
    } catch (err: any) {
      setErrorMessage(`Falha ao abrir terminal do container: ${err?.message || err}`);
    } finally {
      setIsOpeningTerminal((prev) => ({ ...prev, [container.id]: false }));
    }
  };

  // Carregar Status do Docker e Containers
  const isLoadingDockerRef = useRef(false);
  const loadDockerData = useCallback(async () => {
    if (isLoadingDockerRef.current) return;
    isLoadingDockerRef.current = true;
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const status = window.electronAPI.getDockerStatus
          ? await window.electronAPI.getDockerStatus()
          : { installed: true, running: true };
        setDaemonStatus(status);

        if (status.availableDistros) {
          setAvailableDistros(status.availableDistros);
        }
        if (status.isWsl && status.wslDistro) {
          setSelectedDistro(status.wslDistro);
        }

        if (status.installed && status.running) {
          const list = window.electronAPI.listDockerContainers
            ? await window.electronAPI.listDockerContainers()
            : [];
          setContainers(list || []);
          loadDockerStats();
        } else {
          setContainers([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar informações do Docker:', err);
    } finally {
      setIsLoading(false);
      isLoadingDockerRef.current = false;
    }
  }, [loadDockerStats]);

  // Listener para progresso da sequência de startup de containers
  useEffect(() => {
    const unsub = window.electronAPI?.onContainerSequenceProgress?.((step) => {
      setSequenceProgress((prev) => ({
        ...prev,
        running: true,
        currentName: step.currentName,
        index: step.index,
        total: step.total,
        waitingSeconds: step.waitingSeconds
      }));
    });
    return () => unsub?.();
  }, []);

  const handleSelectDistro = async (newDistro: string) => {
    setIsSwitchingDistro(true);
    setSelectedDistro(newDistro);
    try {
      if (window.electronAPI?.setDockerTargetWslDistro) {
        const res = await window.electronAPI.setDockerTargetWslDistro(newDistro || null);
        setDaemonStatus(res);
      }
      await loadDockerData();
    } catch (err: any) {
      setErrorMessage(`Falha ao alterar contexto WSL: ${err?.message || err}`);
    } finally {
      setIsSwitchingDistro(false);
    }
  };

  const loadEnvironments = useCallback(async () => {
    if (!window.electronAPI?.getContainerEnvironments) return;
    try {
      const data = await window.electronAPI.getContainerEnvironments();
      if (Array.isArray(data?.environments)) {
        setEnvironments(data.environments);
      }
    } catch (err) {
      console.warn('Erro ao carregar ambientes do container-manager:', err);
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  const handleStartEnvironment = async (env: ContainerEnvironment) => {
    if (!window.electronAPI?.startContainerSequence) return;
    const slots: { name: string; delay?: number }[] = [];

    for (const c of env.containers) {
      if (typeof c === 'string') {
        const delay = env.delays?.[c];
        slots.push({ name: c, ...(delay ? { delay } : {}) });
      } else if (c && typeof c === 'object') {
        slots.push({ name: c.name, ...(c.delay ? { delay: c.delay } : {}) });
      }
    }

    if (slots.length === 0) {
      setErrorMessage(`O ambiente "${env.name}" não possui containers configurados.`);
      return;
    }

    // Se o ambiente estiver vinculado a uma distro WSL específica e for diferente da atual
    if (env.wslDistro && env.wslDistro !== selectedDistro) {
      await handleSelectDistro(env.wslDistro);
    }

    setSequenceProgress({ running: true, index: 1, total: slots.length, currentName: slots[0].name });
    try {
      const res = await window.electronAPI.startContainerSequence(slots);
      if (!res.success) {
        setErrorMessage(`Falha no ambiente "${env.name}" ao subir "${res.failed}": ${res.error}`);
      }
      await loadDockerData();
    } catch (err: any) {
      setErrorMessage(`Erro ao iniciar ambiente: ${err?.message || err}`);
    } finally {
      setSequenceProgress({ running: false });
    }
  };

  const handleSaveCurrentAsEnvironment = async () => {
    if (!newEnvName.trim() || !window.electronAPI?.saveContainerEnvironment) return;

    // Monta ambiente baseado nos containers atuais
    const oracleContainer = containers.find((c) => c.names.toLowerCase().includes('oracle'));
    const wtaContainer = containers.find((c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor'));
    const wshContainer = containers.find((c) => c.names.toLowerCase().includes('wsh'));

    const slots = [
      { id: '1', name: oracleContainer ? oracleContainer.names.replace(/^\//, '') : 'oracle-winthor', delay: 45 },
      { id: '2', name: wtaContainer ? wtaContainer.names.replace(/^\//, '') : 'linux-winthor', delay: 15 },
      ...(wshContainer ? [{ id: '3', name: wshContainer.names.replace(/^\//, '') }] : [])
    ];

    const newEnv: ContainerEnvironment = {
      id: String(Date.now()),
      name: newEnvName.trim(),
      color: newEnvColor,
      wslDistro: selectedDistro || undefined,
      containers: slots
    };

    try {
      await window.electronAPI.saveContainerEnvironment(newEnv);
      setNewEnvName('');
      setIsCreatingEnv(false);
      await loadEnvironments();
    } catch (err: any) {
      setErrorMessage(`Falha ao salvar ambiente: ${err?.message || err}`);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    if (!window.electronAPI?.deleteContainerEnvironment) return;
    try {
      await window.electronAPI.deleteContainerEnvironment(id);
      if (selectedEnvId === id) setSelectedEnvId('');
      await loadEnvironments();
    } catch (err: any) {
      setErrorMessage(`Falha ao remover ambiente: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    loadDockerData();
    const interval = setInterval(loadDockerData, 12000);
    const statsInterval = setInterval(loadDockerStats, 6000);
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [loadDockerData, loadDockerStats]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onDockerComposeLogChunk?.((chunk) => {
      setComposeOutput((prev) => prev + chunk);
    });
    return () => unsubscribe?.();
  }, []);

  // Lembra o último docker-compose.yml/profile usados, entre reinícios do app
  useEffect(() => {
    window.electronAPI?.getSettings?.().then((settings) => {
      if (settings.dockerComposeConfig?.filePath) setComposeFilePath(settings.dockerComposeConfig.filePath);
      if (settings.dockerComposeConfig?.profile) setComposeProfile(settings.dockerComposeConfig.profile);
    });
  }, []);

  const persistComposeConfig = (filePath: string, profile: string) => {
    window.electronAPI?.saveSettings?.({ dockerComposeConfig: { filePath, profile: profile || undefined } });
  };

  useEffect(() => {
    composeOutputRef.current?.scrollTo({ top: composeOutputRef.current.scrollHeight });
  }, [composeOutput]);

  // Modais de Confirmação e Erro
  const [containerToRemove, setContainerToRemove] = useState<DockerContainerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Docker Compose: sobe/derruba/consulta os serviços do arquivo compose informado
  const handleSelectComposeFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    const picked = await window.electronAPI.selectFile({ filters: [{ name: 'Docker Compose', extensions: ['yml', 'yaml'] }] });
    if (picked) setComposeFilePath(picked);
  };

  const handleComposeUp = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeUp) return;
    setIsComposeRunning('up');
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    try {
      await window.electronAPI.dockerComposeUp(composeFilePath.trim(), { profile: composeProfile.trim() || undefined });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRunning(null);
    }
  };

  const handleComposeDown = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeDown) return;
    setIsComposeRunning('down');
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    try {
      await window.electronAPI.dockerComposeDown(composeFilePath.trim(), { profile: composeProfile.trim() || undefined });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRunning(null);
    }
  };

  const handleComposeStatus = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeStatus) return;
    setIsLoadingComposeStatus(true);
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    try {
      const services = await window.electronAPI.dockerComposeStatus(composeFilePath.trim(), composeProfile.trim() || undefined);
      setComposeServices(services || []);
    } finally {
      setIsLoadingComposeStatus(false);
    }
  };

  // Ações nos Containers
  const handleContainerAction = async (container: DockerContainerInfo, action: 'start' | 'stop' | 'restart' | 'remove') => {
    if (!window.electronAPI) return;

    if (action === 'remove') {
      setContainerToRemove(container);
      return;
    }

    await executeContainerAction(container, action);
  };

  const executeContainerAction = async (container: DockerContainerInfo, action: 'start' | 'stop' | 'restart' | 'remove') => {
    if (!window.electronAPI) return;
    setActionLoading((prev) => ({ ...prev, [container.id]: action }));
    try {
      if (action === 'start') {
        await window.electronAPI.startDockerContainer(container.id);
      } else if (action === 'stop') {
        await window.electronAPI.stopDockerContainer(container.id);
      } else if (action === 'restart') {
        await window.electronAPI.restartDockerContainer(container.id);
      } else if (action === 'remove') {
        await window.electronAPI.removeDockerContainer(container.id);
      }
      await loadDockerData();
    } catch (err: any) {
      setErrorMessage(`Falha ao executar ação no container: ${err?.message || err}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[container.id];
        return next;
      });
    }
  };

  // Abrir Logs
  const handleOpenLogs = async (container: DockerContainerInfo) => {
    setSelectedContainer(container);
    setIsLoadingLogs(true);
    try {
      if (window.electronAPI?.getDockerLogs) {
        const text = await window.electronAPI.getDockerLogs(container.id, logLines);
        setLogs(text || '(Nenhum log retornado)');
      }
    } catch (err: any) {
      setLogs(`Erro ao buscar logs: ${err.message || err}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Recarregar Logs com nova quantidade de linhas
  const handleRefreshLogs = async () => {
    if (!selectedContainer || !window.electronAPI?.getDockerLogs) return;
    setIsLoadingLogs(true);
    try {
      const text = await window.electronAPI.getDockerLogs(selectedContainer.id, logLines);
      setLogs(text || '(Nenhum log retornado)');
    } catch (err: any) {
      setLogs(`Erro ao atualizar logs: ${err.message || err}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Copiar Logs
  const handleCopyLogs = () => copyLogsToClipboard(logs, 'Logs copiados!');

  // Filtro
  const filteredContainers = useMemo(() => {
    if (!filter) return containers;
    const lower = filter.toLowerCase();
    return containers.filter(
      (c) =>
        c.names.toLowerCase().includes(lower) ||
        c.image.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower) ||
        c.ports.toLowerCase().includes(lower)
    );
  }, [containers, filter]);

  // Estatísticas
  const runningCount = useMemo(() => containers.filter((c) => c.state === 'running').length, [containers]);
  const stoppedCount = useMemo(() => containers.filter((c) => c.state !== 'running').length, [containers]);

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'running':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>RODANDO</span>
          </span>
        );
      case 'exited':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span>PARADO</span>
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <span>PAUSADO</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
            <span>{state.toUpperCase()}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      {/* Topo / Header da Página */}
      <header className="px-4 py-3 bg-card/85 backdrop-blur border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-brand-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 shadow-xs">
            <Box className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Containers & WSL</h2>
              {daemonStatus && (
                daemonStatus.running ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    {daemonStatus.isWsl
                      ? `WSL • ${daemonStatus.wslDistro || 'Docker Ativo'}`
                      : daemonStatus.engine === 'podman'
                      ? 'Podman Nativo'
                      : 'Docker Host'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Offline
                  </span>
                )
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Orquestração de microsserviços, distros WSL2 e isolamento de runtime
            </p>
          </div>
        </div>

        {/* Controles Agrupados Semanticamente */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Grupo 1: Contexto de Execução (Runtime WSL & Ambiente) */}
          <div className="flex items-center bg-muted/50 border border-border/80 rounded-xl p-1 gap-1.5 shadow-2xs">
            {/* Seletor WSL */}
            <div className="flex items-center px-2 py-0.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
                Runtime
              </span>
              <select
                value={selectedDistro}
                onChange={(e) => handleSelectDistro(e.target.value)}
                disabled={isSwitchingDistro}
                className="bg-transparent text-foreground font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-card text-foreground">
                  Windows Host (Nativo)
                </option>
                {availableDistros.map((d) => (
                  <option key={d.name} value={d.name} className="bg-card text-foreground">
                    WSL: {d.name} {d.state === 'Running' ? '●' : '○'}
                  </option>
                ))}
              </select>
              {isSwitchingDistro && <RotateCw className="w-3 h-3 animate-spin text-primary ml-1" />}
            </div>

            {/* Separador vertical sutil */}
            {environments.length > 0 && <div className="h-4 w-[1px] bg-border/80" />}

            {/* Seletor de Ambientes */}
            {environments.length > 0 && (
              <div className="flex items-center px-2 py-0.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
                  Ambiente
                </span>
                <select
                  value={selectedEnvId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedEnvId(id);
                    const found = environments.find((env) => env.id === id);
                    if (found) handleStartEnvironment(found);
                  }}
                  disabled={sequenceProgress.running}
                  className="bg-transparent text-foreground font-semibold text-xs focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" className="bg-card text-foreground">
                    Escolher...
                  </option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id} className="bg-card text-foreground">
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Grupo 2: Ações de Execução & Utilitários */}
          <div className="flex items-center gap-2">
            {/* Botão de Orquestração WinThor */}
            <button
              onClick={() => {
                const defaultEnv = environments.find((e) => e.name.toLowerCase().includes('winthor') || e.name.toLowerCase().includes('dev'));
                if (defaultEnv) {
                  handleStartEnvironment(defaultEnv);
                } else {
                  const oracle = containers.find((c) => c.names.toLowerCase().includes('oracle'));
                  const wta = containers.find((c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor'));
                  const wsh = containers.find((c) => c.names.toLowerCase().includes('wsh'));
                  const seq = [
                    { name: oracle ? oracle.names.replace(/^\//, '') : 'oracle-winthor', delay: 45 },
                    { name: wta ? wta.names.replace(/^\//, '') : 'linux-winthor', delay: 15 },
                    ...(wsh ? [{ name: wsh.names.replace(/^\//, '') }] : [])
                  ];
                  window.electronAPI?.startContainerSequence?.(seq);
                }
              }}
              disabled={sequenceProgress.running || containers.length === 0}
              title="Inicia sequencialmente Oracle XE -> WTA -> WSH"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {sequenceProgress.running ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Subir WinThor</span>
            </button>

            {/* Salvar como Ambiente */}
            <button
              onClick={() => setIsCreatingEnv(true)}
              disabled={containers.length === 0}
              title="Salvar containers atuais como ambiente"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
            >
              <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden lg:inline">Salvar Ambiente</span>
            </button>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar..."
                className="bg-card border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 transition"
              />
            </div>

            {/* Botão Atualizar */}
            <button
              onClick={loadDockerData}
              disabled={isLoading}
              title="Atualizar lista de containers"
              className="p-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-lg text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Progresso da Sequência WinThor */}
      {sequenceProgress.running && (
        <div className="p-3.5 mx-4 mt-3 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <RotateCw className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Orquestrando Ambiente WinThor</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 font-mono">
                  Etapa {sequenceProgress.index} de {sequenceProgress.total}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Iniciando <strong className="font-mono text-foreground">{sequenceProgress.currentName}</strong>
                {sequenceProgress.waitingSeconds !== undefined && sequenceProgress.waitingSeconds > 0 && (
                  <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                    — aguardando warm-up ({sequenceProgress.waitingSeconds}s restantes)...
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta caso Docker/Podman não esteja rodando */}
      {daemonStatus && !daemonStatus.running && (
        <div className="p-3 mx-4 mt-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="leading-snug">
              {daemonStatus.error || 'O serviço de containers não está respondendo. Verifique se o Docker Engine está ativo no WSL ou host.'}
            </span>
          </div>
          <button
            onClick={loadDockerData}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/35 rounded-lg font-semibold transition cursor-pointer shrink-0 ml-3"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Docker Compose */}
      <div className="mx-4 mt-3 p-3 bg-card/60 backdrop-blur border border-border/70 rounded-xl shrink-0 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Docker Compose</span>
            {composeServices.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-muted border border-border/50 text-muted-foreground font-normal">
                {composeServices.length} serviços
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={composeFilePath}
            onChange={(e) => setComposeFilePath(e.target.value)}
            placeholder="Caminho do docker-compose.yml"
            className="flex-1 min-w-[220px] bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-muted-foreground/60"
          />
          <button
            onClick={handleSelectComposeFile}
            className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
          >
            Selecionar
          </button>
          <input
            type="text"
            value={composeProfile}
            onChange={(e) => setComposeProfile(e.target.value)}
            placeholder="Profile (opcional)"
            className="w-36 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-muted-foreground/60"
          />
          <button
            onClick={handleComposeUp}
            disabled={!composeFilePath.trim() || isComposeRunning !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
          >
            {isComposeRunning === 'up' ? <RotateCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            Up
          </button>
          <button
            onClick={handleComposeDown}
            disabled={!composeFilePath.trim() || isComposeRunning !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
          >
            {isComposeRunning === 'down' ? <RotateCw className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 fill-current" />}
            Down
          </button>
          <button
            onClick={handleComposeStatus}
            disabled={!composeFilePath.trim() || isLoadingComposeStatus}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingComposeStatus ? 'animate-spin text-primary' : ''}`} />
            Status
          </button>
        </div>

        {composeServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {composeServices.map((s) => (
              <span
                key={s.name}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                  s.state.toLowerCase().includes('running')
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted/80 border-border text-muted-foreground'
                }`}
              >
                {s.name}: {s.state}
              </span>
            ))}
          </div>
        )}

        {composeOutput && (
          <pre
            ref={composeOutputRef}
            className="max-h-32 overflow-auto bg-[#0B0F17] text-emerald-400 text-[10px] font-mono p-2.5 rounded-lg whitespace-pre-wrap border border-border/40 shadow-inner"
          >
            {composeOutput}
          </pre>
        )}
      </div>

      {/* Lista de Containers */}
      <div className="flex-1 overflow-auto p-4">
        {filteredContainers.length === 0 ? (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-card/30 border border-dashed border-border/80 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
              <Box className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-bold text-foreground">Nenhum container localizado</p>
            <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
              {containers.length === 0
                ? 'Certifique-se de que a distro WSL selecionada possui o Docker Engine em execução ou inicie seus containers do WinThor.'
                : 'Nenhum container corresponde ao critério de busca informado.'}
            </p>
            {containers.length === 0 && selectedDistro && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={loadDockerData}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
                >
                  Recarregar status da distro
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredContainers.map((container) => {
              const isLoadingAction = actionLoading[container.id];
              const isRunning = container.state === 'running';
              const cleanName = container.names.replace(/^\//, '');
              const stats =
                containerStats[container.id] ||
                containerStats[cleanName] ||
                Object.values(containerStats).find(
                  (s) => s.id.startsWith(container.id.slice(0, 10)) || s.name === cleanName
                );

              return (
                <div
                  key={container.id}
                  className="bg-card border border-border/80 hover:border-border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 shadow-2xs"
                >
                  {/* Informações do Container */}
                  <div className="flex items-start space-x-3.5 truncate flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isRunning
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                          : 'bg-muted/70 border-border/80 text-muted-foreground'
                      }`}
                    >
                      <Box className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex flex-col truncate min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground text-xs truncate tracking-tight">
                          {cleanName}
                        </span>
                        {getStateBadge(container.state)}
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.2 rounded border border-border/50">
                          {container.id.slice(0, 12)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-muted-foreground mt-1 truncate">
                        <span className="truncate font-mono">
                          <span className="text-foreground/70 font-sans font-medium">Imagem:</span> {container.image}
                        </span>
                        {container.ports && (
                          <span className="truncate font-mono text-sky-600 dark:text-sky-400 hidden md:inline">
                            <span className="text-muted-foreground font-sans font-medium">Portas:</span> {container.ports}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/70 hidden lg:inline">
                          {container.status}
                        </span>
                      </div>

                      {/* Métricas de Recursos em Tempo Real */}
                      {isRunning && stats && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 font-semibold"
                            title={`Uso de CPU: ${stats.cpu}`}
                          >
                            <Cpu className="w-3 h-3 text-sky-500" />
                            <span>{stats.cpu}</span>
                          </span>
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 font-semibold"
                            title={`Uso de Memória: ${stats.mem} (${stats.memPerc})`}
                          >
                            <Activity className="w-3 h-3 text-purple-500" />
                            <span>{stats.mem} ({stats.memPerc})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => handleContainerAction(container, 'stop')}
                          disabled={Boolean(isLoadingAction)}
                          title="Parar Container"
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Parar</span>
                        </button>
                        <button
                          onClick={() => handleContainerAction(container, 'restart')}
                          disabled={Boolean(isLoadingAction)}
                          title="Reiniciar Container"
                          className="p-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg transition disabled:opacity-50 cursor-pointer active:scale-98"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isLoadingAction === 'restart' ? 'animate-spin text-primary' : ''}`} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleContainerAction(container, 'start')}
                        disabled={Boolean(isLoadingAction)}
                        title="Iniciar Container"
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer active:scale-98"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Iniciar</span>
                      </button>
                    )}

                    {/* Terminal Interativo */}
                    {isRunning && (
                      <button
                        onClick={() => handleOpenTerminal(container)}
                        disabled={Boolean(isOpeningTerminal[container.id])}
                        title="Abrir terminal interativo do container (bash)"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{isOpeningTerminal[container.id] ? 'Abrindo...' : 'Terminal'}</span>
                      </button>
                    )}

                    {/* Ferramentas Especializadas Oracle (INFR-Docker) */}
                    {cleanName.toLowerCase().includes('oracle') && isRunning && (
                      <button
                        onClick={() => {
                          setOracleModalContainer(container);
                          setOracleHealthOutput('');
                          setOracleHealthSuccess(null);
                          setDpOutput('');
                          setDpSuccess(null);
                        }}
                        title="Ferramentas Especializadas Oracle (db_health, SQL*Plus, Data Pump)"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 shadow-2xs"
                      >
                        <Database className="w-3.5 h-3.5 text-orange-500" />
                        <span>Ferramentas Oracle</span>
                      </button>
                    )}

                    {/* Ver Logs */}
                    <button
                      onClick={() => handleOpenLogs(container)}
                      title="Inspecionar Logs"
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
                    >
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      <span>Logs</span>
                    </button>

                    {/* Remover Container */}
                    <button
                      onClick={() => handleContainerAction(container, 'remove')}
                      disabled={Boolean(isLoadingAction)}
                      title="Remover Container"
                      className="p-1.5 hover:text-rose-600 dark:hover:text-rose-400 text-muted-foreground rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Logs do Container */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[82vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header do Modal */}
            <div className="px-4 py-3 bg-card border-b border-border/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-foreground">
                  Logs:{' '}
                  <span className="font-mono text-primary">{selectedContainer.names.replace(/^\//, '')}</span>
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.2 rounded border border-border/50">
                  {selectedContainer.id.slice(0, 12)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Quantidade de Linhas */}
                <select
                  value={logLines}
                  onChange={(e) => setLogLines(Number(e.target.value))}
                  className="bg-muted/70 border border-border/80 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none font-medium cursor-pointer"
                >
                  <option value={100}>100 linhas</option>
                  <option value={200}>200 linhas</option>
                  <option value={500}>500 linhas</option>
                  <option value={1000}>1000 linhas</option>
                </select>

                <button
                  onClick={handleRefreshLogs}
                  disabled={isLoadingLogs}
                  title="Atualizar Logs"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/70 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-primary' : ''}`} />
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-muted/80 hover:bg-muted text-foreground border border-border/70 rounded-lg font-semibold transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copyFeedback || 'Copiar'}</span>
                </button>

                <button
                  onClick={() => setSelectedContainer(null)}
                  className="text-muted-foreground hover:text-foreground font-bold px-2 py-1 text-xs rounded-lg hover:bg-muted cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo dos Logs */}
            <div className="flex-1 bg-[#090D14] p-4 overflow-auto font-mono text-[11px] text-zinc-200 select-text whitespace-pre-wrap leading-relaxed [scrollbar-width:thin]">
              {isLoadingLogs ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs space-x-2">
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando logs do container...</span>
                </div>
              ) : (
                logs
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Ambiente */}
      {isCreatingEnv && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Salvar Ambiente</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Agrupe os containers detectados em um ambiente com sequência e delay para reutilização rápida.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Nome do Ambiente</label>
                <input
                  type="text"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  placeholder="Ex: WinThor Dev, QA, Homologação"
                  className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  {['#0066cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewEnvColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newEnvColor === color ? 'scale-125 ring-2 ring-foreground/40 ring-offset-2 ring-offset-card' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/60 rounded-xl border border-border/50 text-[11px] space-y-1 text-muted-foreground">
                <div className="font-semibold text-foreground">Configuração da sequência:</div>
                <div>• Oracle Database (Delay: 45s de warm-up)</div>
                <div>• WinThor Anywhere (WTA) (Delay: 15s)</div>
                <div>• Winthor Smart Hub (WSH)</div>
                {selectedDistro && <div className="text-sky-600 dark:text-sky-400">• Vinculado à distro WSL: {selectedDistro}</div>}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setIsCreatingEnv(false)}
                className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCurrentAsEnvironment}
                disabled={!newEnvName.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                Salvar no Container Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção */}
      {containerToRemove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Remover Container</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tem certeza que deseja remover o container{' '}
                  <span className="font-semibold text-foreground font-mono">
                    {containerToRemove.names.replace(/^\//, '')}
                  </span>
                  ? Esta ação não pode ser desfeita.
                </p>
                <div className="mt-2 text-[11px] text-muted-foreground font-mono bg-muted p-2 rounded border border-border/50">
                  ID: {containerToRemove.id.slice(0, 12)} | Imagem: {containerToRemove.image}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setContainerToRemove(null)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const target = containerToRemove;
                  setContainerToRemove(null);
                  await executeContainerAction(target, 'remove');
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Container</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Manutenção Especializada Oracle (INFR-Docker) */}
      {oracleModalContainer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[84vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-card/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-2xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    Manutenção Oracle WinThor
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                      {oracleModalContainer.names.replace(/^\//, '')}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Utilitários integrados de <code className="text-[11px]">INFR-Docker</code> (/home/oracle/tools)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOracleModalContainer(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas com acabamento de precisão */}
            <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
              <button
                onClick={() => setOracleActiveTab('health')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  oracleActiveTab === 'health'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Saúde & Cura (db_health)</span>
              </button>

              <button
                onClick={() => setOracleActiveTab('sqlplus')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  oracleActiveTab === 'sqlplus'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SQL*Plus Assistido</span>
              </button>

              <button
                onClick={() => setOracleActiveTab('datapump')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  oracleActiveTab === 'datapump'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Importar Dump (Data Pump)</span>
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* TAB 1: SAÚDE (db_health.sh) */}
              {oracleActiveTab === 'health' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Diagnóstico e Cura Pós-Import</strong>
                      Detecta objetos quebrados em <code className="text-foreground font-mono">dba_objects</code>, remove automaticamente types fantasmas <code className="text-foreground font-mono">SYS_PLSQL_*</code> e recompila packages em paralelo via <code className="text-foreground font-mono">UTL_RECOMP</code>.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Filtro de Schema (opcional)</label>
                      <input
                        type="text"
                        value={oracleHealthSchema}
                        onChange={(e) => setOracleHealthSchema(e.target.value)}
                        placeholder="Ex: LOCAL (vazio = todos)"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
                      <input
                        type="text"
                        value={oracleHealthUser}
                        onChange={(e) => setOracleHealthUser(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha DBA</label>
                      <input
                        type="password"
                        value={oracleHealthPass}
                        onChange={(e) => setOracleHealthPass(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Botões de Ação com Hierarquia Clara */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      onClick={async () => {
                        if (!window.electronAPI?.execOracleHealth) return;
                        setIsOracleHealthRunning(true);
                        setOracleHealthSuccess(null);
                        setOracleHealthOutput('>>> Executando db_health.sh (DIAGNÓSTICO)...\nAguarde a varredura de dba_objects...');
                        try {
                          const res = await window.electronAPI.execOracleHealth(
                            oracleModalContainer.names.replace(/^\//, ''),
                            oracleHealthSchema || undefined,
                            false,
                            oracleHealthUser,
                            oracleHealthPass
                          );
                          setOracleHealthSuccess(res.success);
                          setOracleHealthOutput(res.output || res.error || '(Sem saída)');
                        } catch (err: any) {
                          setOracleHealthSuccess(false);
                          setOracleHealthOutput(`Erro: ${err?.message || err}`);
                        } finally {
                          setIsOracleHealthRunning(false);
                        }
                      }}
                      disabled={isOracleHealthRunning}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98 shadow-2xs"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isOracleHealthRunning ? 'animate-spin text-primary' : 'text-primary'}`} />
                      <span>Diagnosticar Apenas</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (!window.electronAPI?.execOracleHealth) return;
                        setIsOracleHealthRunning(true);
                        setOracleHealthSuccess(null);
                        setOracleHealthOutput('>>> Executando db_health.sh (--fix)...\nDropando SYS_PLSQL_* fantasmas e executando UTL_RECOMP...');
                        try {
                          const res = await window.electronAPI.execOracleHealth(
                            oracleModalContainer.names.replace(/^\//, ''),
                            oracleHealthSchema || undefined,
                            true,
                            oracleHealthUser,
                            oracleHealthPass
                          );
                          setOracleHealthSuccess(res.success);
                          setOracleHealthOutput(res.output || res.error || '(Sem saída)');
                        } catch (err: any) {
                          setOracleHealthSuccess(false);
                          setOracleHealthOutput(`Erro: ${err?.message || err}`);
                        } finally {
                          setIsOracleHealthRunning(false);
                        }
                      }}
                      disabled={isOracleHealthRunning}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Diagnosticar e Corrigir (--fix)</span>
                    </button>

                    {oracleHealthOutput && (
                      <button
                        onClick={() => copyLogsToClipboard(oracleHealthOutput, 'oracle-health-out')}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 cursor-pointer transition"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback === 'oracle-health-out' ? 'Copiado!' : 'Copiar Saída'}</span>
                      </button>
                    )}
                  </div>

                  {/* Terminal de Saída Industrial */}
                  {oracleHealthOutput && (
                    <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
                      <div className="bg-[#090D14] px-3.5 py-2 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">db_health output</span>
                        </div>
                        {oracleHealthSuccess !== null && (
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                              oracleHealthSuccess
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {oracleHealthSuccess ? 'SUCESSO' : 'ATENÇÃO'}
                          </span>
                        )}
                      </div>
                      <pre className="bg-[#090D14] p-4 text-[11px] font-mono text-emerald-400 overflow-auto max-h-72 whitespace-pre-wrap leading-relaxed select-text [scrollbar-width:thin]">
                        {oracleHealthOutput}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SQL*PLUS */}
              {oracleActiveTab === 'sqlplus' && (
                <div className="space-y-4">
                  <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Terminal Interativo SQL*Plus</strong>
                      Abre instantaneamente o Windows Terminal ou CMD executando <code className="text-foreground font-mono">sqlplus_conn.sh</code> com conexão TCP nativa <code className="text-foreground font-mono">//localhost:1521/XE</code>.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário de Acesso</label>
                      <input
                        type="text"
                        value={oracleSqlUser}
                        onChange={(e) => setOracleSqlUser(e.target.value)}
                        placeholder="sys ou system"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Conexão como <span className="font-mono text-foreground font-semibold">sys</span> eleva automaticamente para AS SYSDBA.</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
                      <input
                        type="password"
                        value={oracleSqlPass}
                        onChange={(e) => setOracleSqlPass(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        if (!window.electronAPI?.openOracleSqlPlus) return;
                        setIsOracleSqlOpening(true);
                        try {
                          await window.electronAPI.openOracleSqlPlus(
                            oracleModalContainer.names.replace(/^\//, ''),
                            oracleSqlUser,
                            oracleSqlPass
                          );
                        } catch (err: any) {
                          setErrorMessage(`Falha ao abrir SQL*Plus: ${err?.message || err}`);
                        } finally {
                          setIsOracleSqlOpening(false);
                        }
                      }}
                      disabled={isOracleSqlOpening}
                      className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>{isOracleSqlOpening ? 'Abrindo Terminal...' : 'Abrir Sessão SQL*Plus no Terminal'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DATA PUMP */}
              {oracleActiveTab === 'datapump' && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Automação de Importação Data Pump (impdp)</strong>
                      Importa arquivos posicionados no diretório mapeado <code className="text-foreground font-mono">/home/oracle/dumps</code>. Executa <code className="text-foreground font-mono">table_exists_action=REPLACE</code>, roda o script <code className="text-foreground font-mono">winthor_pos_import.sql</code> e coleta estatísticas de schema.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Arquivo Dump (.dmp)</label>
                      <input
                        type="text"
                        value={dpDumpfile}
                        onChange={(e) => setDpDumpfile(e.target.value)}
                        placeholder="ex: backup.dmp"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">CODCLIPC (Cliente WinThor)</label>
                      <input
                        type="text"
                        value={dpCodclipc}
                        onChange={(e) => setDpCodclipc(e.target.value)}
                        placeholder="9999"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Origem</label>
                      <input
                        type="text"
                        value={dpSchemaOrig}
                        onChange={(e) => setDpSchemaOrig(e.target.value)}
                        placeholder="LOCAL"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Destino (opcional - Remap)</label>
                      <input
                        type="text"
                        value={dpSchemaDest}
                        onChange={(e) => setDpSchemaDest(e.target.value)}
                        placeholder="Vazio = substitui schema de origem"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
                      <input
                        type="text"
                        value={dpUser}
                        onChange={(e) => setDpUser(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
                      <input
                        type="password"
                        value={dpPass}
                        onChange={(e) => setDpPass(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (!window.electronAPI?.execOracleDataPump) return;
                        setIsDpRunning(true);
                        setDpSuccess(null);
                        setDpOutput(`>>> Iniciando import_dump.sh (${dpDumpfile})...\nAguarde a execução de impdp e winthor_pos_import.sql...`);
                        try {
                          const res = await window.electronAPI.execOracleDataPump({
                            containerName: oracleModalContainer.names.replace(/^\//, ''),
                            user: dpUser,
                            password: dpPass,
                            dumpfile: dpDumpfile,
                            schemaOrig: dpSchemaOrig,
                            schemaDest: dpSchemaDest || undefined,
                            codclipc: dpCodclipc
                          });
                          setDpSuccess(res.success);
                          setDpOutput(res.output || res.error || '(Sem saída)');
                        } catch (err: any) {
                          setDpSuccess(false);
                          setDpOutput(`Erro: ${err?.message || err}`);
                        } finally {
                          setIsDpRunning(false);
                        }
                      }}
                      disabled={isDpRunning || !dpDumpfile || !dpSchemaOrig}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isDpRunning ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isDpRunning ? 'Importando Dump...' : 'Iniciar Importação Data Pump'}</span>
                    </button>

                    {dpOutput && (
                      <button
                        onClick={() => copyLogsToClipboard(dpOutput, 'oracle-dp-out')}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 cursor-pointer transition"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback === 'oracle-dp-out' ? 'Copiado!' : 'Copiar Saída'}</span>
                      </button>
                    )}
                  </div>

                  {/* Terminal de Saída Data Pump Industrial */}
                  {dpOutput && (
                    <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
                      <div className="bg-[#090D14] px-3.5 py-2 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">import_dump output</span>
                        </div>
                        {dpSuccess !== null && (
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                              dpSuccess
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {dpSuccess ? 'IMPORT CONCLUÍDO' : 'FALHA NO IMPORT'}
                          </span>
                        )}
                      </div>
                      <pre className="bg-[#090D14] p-4 text-[11px] font-mono text-emerald-400 overflow-auto max-h-72 whitespace-pre-wrap leading-relaxed select-text [scrollbar-width:thin]">
                        {dpOutput}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Comandos executados nativamente via container engine
              </span>

              <button
                onClick={() => setOracleModalContainer(null)}
                className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Erro de Operação</h3>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
