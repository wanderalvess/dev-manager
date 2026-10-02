import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Trash2 } from 'lucide-react';
import type {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerStats,
  ComposeServiceStatus,
  WslDistroInfo,
  ContainerEnvironment,
  DockerContainerInspect,
  WslDumpFileInfo,
  WshPrerequisiteStatus,
  WslSnapshotFileInfo,
  InfrDockerScriptStatus
} from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { CONTAINERS_TOUR_STEPS, CONTAINERS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/containersTour';
import {
  computeStackTopology,
  filterContainers,
  getGroupContainerNames
} from '../utils/dockerContainerUtils';

// Subcomponentes modulares de Containers
import { ContainersHeader } from '../components/containers/ContainersHeader';
import { ContainerTopologyBus } from '../components/containers/topology/ContainerTopologyBus';
import { DockerComposePanel } from '../components/containers/compose/DockerComposePanel';
import { ContainerCard } from '../components/containers/cards/ContainerCard';
import { ContainerGroupsBar } from '../components/containers/groups/ContainerGroupsBar';
import { ContainerBatchBar } from '../components/containers/batch/ContainerBatchBar';

// Modais
import { ContainerLogsModal } from '../components/containers/modals/ContainerLogsModal';
import { SaveEnvironmentModal } from '../components/containers/modals/SaveEnvironmentModal';
import { ContainerRemoveConfirmModal } from '../components/containers/modals/ContainerRemoveConfirmModal';
import { EnvironmentDeleteConfirmModal } from '../components/containers/modals/EnvironmentDeleteConfirmModal';
import { OracleMaintenanceModal } from '../components/containers/modals/OracleMaintenanceModal';
import { WshUtilsModal } from '../components/containers/modals/WshUtilsModal';
import { WtaUtilsModal } from '../components/containers/modals/WtaUtilsModal';
import { WslSnapshotsModal } from '../components/containers/modals/WslSnapshotsModal';
import { InfrBootstrapModal } from '../components/containers/modals/InfrBootstrapModal';
import { ContainerSmartErrorModal, type SmartErrorInfo } from '../components/containers/modals/ContainerSmartErrorModal';
import { ContainerPruneModal } from '../components/containers/modals/ContainerPruneModal';
import { ContainerInspectModal } from '../components/containers/modals/ContainerInspectModal';

interface ContainersPageProps {
  isActive?: boolean;
  settingsVersion?: number;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ isActive, settingsVersion }) => {
  const tour = usePageTour(CONTAINERS_TOUR_STORAGE_KEY);
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
  const [envToDelete, setEnvToDelete] = useState<ContainerEnvironment | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingEnv, setEditingEnv] = useState<ContainerEnvironment | null>(null);
  const [preselectedForGroup, setPreselectedForGroup] = useState<string[]>([]);

  // Seleção Múltipla para Ações em Lote
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [batchActionType, setBatchActionType] = useState<'start' | 'stop' | 'restart' | null>(null);

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
  const [availableDumps, setAvailableDumps] = useState<WslDumpFileInfo[]>([]);
  const [isLoadingDumps, setIsLoadingDumps] = useState<boolean>(false);
  const [isOpeningDumpsFolder, setIsOpeningDumpsFolder] = useState<boolean>(false);

  // Modal de Utilitários WSH (Winthor Smart Hub)
  const [wshModalContainer, setWshModalContainer] = useState<DockerContainerInfo | null>(null);
  const [wshPrereqs, setWshPrereqs] = useState<WshPrerequisiteStatus[]>([]);
  const [isLoadingWshPrereqs, setIsLoadingWshPrereqs] = useState<boolean>(false);
  const [isOpeningOptFolder, setIsOpeningOptFolder] = useState<boolean>(false);

  // Modal de Utilitários WTA (Apache Karaf / Portal / Dev Mode)
  const [wtaModalContainer, setWtaModalContainer] = useState<DockerContainerInfo | null>(null);
  const [isOpeningKarafClient, setIsOpeningKarafClient] = useState<boolean>(false);

  // Modal de Snapshots WSL (.tar Import / Export / Unregister)
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);
  const [snapshotsList, setSnapshotsList] = useState<WslSnapshotFileInfo[]>([]);
  const [snapshotsDirInput, setSnapshotsDirInput] = useState<string>('');
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState<boolean>(false);
  const [snapshotImporting, setSnapshotImporting] = useState<boolean>(false);
  const [snapshotExporting, setSnapshotExporting] = useState<boolean>(false);
  const [snapshotUnregistering, setSnapshotUnregistering] = useState<string | null>(null);
  const [snapshotFeedback, setSnapshotFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Modal de Assistente de Bootstrap INFR-Docker
  const [isInfrModalOpen, setIsInfrModalOpen] = useState<boolean>(false);
  const [infrScripts, setInfrScripts] = useState<InfrDockerScriptStatus[]>([]);
  const [isLoadingInfrScripts, setIsLoadingInfrScripts] = useState<boolean>(false);
  const [isExecutingInfr, setIsExecutingInfr] = useState<boolean>(false);
  const [infrOutput, setInfrOutput] = useState<string>('');

  // Docker Compose
  const [composeFilePath, setComposeFilePath] = useState<string>('');
  const [composeProfile, setComposeProfile] = useState<string>('');
  const [isComposeRunning, setIsComposeRunning] = useState<'up' | 'down' | null>(null);
  const [composeOutput, setComposeOutput] = useState<string>('');
  const [composeServices, setComposeServices] = useState<ComposeServiceStatus[]>([]);
  const [isLoadingComposeStatus, setIsLoadingComposeStatus] = useState<boolean>(false);
  const composeOutputRef = useRef<HTMLPreElement>(null);
  const [composeBuild, setComposeBuild] = useState<boolean>(false);
  const [composeVolumes, setComposeVolumes] = useState<boolean>(false);
  const [isComposeRestarting, setIsComposeRestarting] = useState<boolean>(false);
  const [recentComposeFiles, setRecentComposeFiles] = useState<string[]>([]);
  const [isComposeExpanded, setIsComposeExpanded] = useState<boolean>(false);

  // Barramento de Topologia WinThor (Stack Topology Bus)
  const [showTopologyBus, setShowTopologyBus] = useState<boolean>(() => {
    try {
      return localStorage.getItem('winthor_show_topology_bus') !== 'false';
    } catch {
      return true;
    }
  });

  // WSL Distro Quick Controls & IP
  const [isTerminatingDistro, setIsTerminatingDistro] = useState<boolean>(false);
  const [isOpeningWslTerminal, setIsOpeningWslTerminal] = useState<boolean>(false);
  const { copy: copyWslIp, copiedKey: wslIpFeedback } = useCopyToClipboard();

  // Modal de Inspecionar Container
  const [inspectingContainer, setInspectingContainer] = useState<DockerContainerInspect | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState<boolean>(false);

  // Ação em Lote (Prune)
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState<boolean>(false);

  // Modal de Confirmação de Remoção de Container
  const [containerToRemove, setContainerToRemove] = useState<DockerContainerInfo | null>(null);

  // Modal de Erro Inteligente com Auto-Recuperação
  const [smartError, setSmartError] = useState<SmartErrorInfo | null>(null);
  const [isStartingDaemon, setIsStartingDaemon] = useState<boolean>(false);

  const handleShowError = useCallback(
    (
      title: string,
      errOrMsg: any,
      options?: { distroName?: string; containerName?: string; retryAction?: () => Promise<void> }
    ) => {
      const rawMsg = errOrMsg?.message || String(errOrMsg);
      const isNotInstalled = /DOCKER_NOT_INSTALLED|apt (update|install)|docker\.io/i.test(rawMsg);
      const isDaemonOffline =
        isNotInstalled ||
        /Cannot connect to the Docker daemon|docker\.sock|dockerd|daemon is not running|Is the docker daemon running/i.test(
          rawMsg
        );
      setSmartError({
        title: isNotInstalled
          ? 'Docker Não Instalado no WSL'
          : isDaemonOffline
          ? 'Docker Engine Offline no WSL'
          : title,
        message: rawMsg,
        distroName: options?.distroName || selectedDistro || daemonStatus?.wslDistro,
        containerName: options?.containerName,
        isDaemonOffline,
        isNotInstalled,
        retryAction: options?.retryAction
      });
    },
    [selectedDistro, daemonStatus]
  );

  const setErrorMessage = useCallback(
    (msg: string | null) => {
      if (!msg) {
        setSmartError(null);
        return;
      }
      handleShowError('Erro de Operação', msg);
    },
    [handleShowError]
  );

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

  // Listar Dumps em /opt/dumps da Distro WSL
  const loadAvailableDumps = useCallback(
    async (distro?: string) => {
      if (!window.electronAPI?.listWslDmpFiles) return;
      setIsLoadingDumps(true);
      try {
        const target = distro || selectedDistro || daemonStatus?.wslDistro;
        const dumps = await window.electronAPI.listWslDmpFiles(target);
        setAvailableDumps(dumps || []);
      } catch {
        setAvailableDumps([]);
      } finally {
        setIsLoadingDumps(false);
      }
    },
    [selectedDistro, daemonStatus]
  );

  // Abrir /opt/dumps no Windows Explorer
  const handleOpenDumpsFolder = async () => {
    if (!window.electronAPI?.openWslDumpsFolder) return;
    setIsOpeningDumpsFolder(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.openWslDumpsFolder(target);
      if (!res.success && res.error) {
        handleShowError('Pasta de Dumps', res.error);
      }
    } catch (err: any) {
      handleShowError('Pasta de Dumps', err?.message || err);
    } finally {
      setIsOpeningDumpsFolder(false);
    }
  };

  // Listar Pré-requisitos do WSH em /opt
  const loadWshPrereqs = useCallback(async () => {
    if (!window.electronAPI?.checkWshPrerequisites) return;
    setIsLoadingWshPrereqs(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.checkWshPrerequisites(target);
      setWshPrereqs(res || []);
    } catch {
      setWshPrereqs([]);
    } finally {
      setIsLoadingWshPrereqs(false);
    }
  }, [selectedDistro, daemonStatus]);

  // Abrir pasta /opt no Windows Explorer
  const handleOpenOptFolder = async () => {
    if (!window.electronAPI?.openWslOptFolder) return;
    setIsOpeningOptFolder(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.openWslOptFolder(target);
      if (!res.success && res.error) {
        handleShowError('Pasta /opt WSL', res.error);
      }
    } catch (err: any) {
      handleShowError('Pasta /opt WSL', err?.message || err);
    } finally {
      setIsOpeningOptFolder(false);
    }
  };

  // Abrir Console Karaf interativo no WTA
  const handleOpenKarafClient = async (containerName: string) => {
    if (!window.electronAPI?.openWtaKarafClient) return;
    setIsOpeningKarafClient(true);
    try {
      await window.electronAPI.openWtaKarafClient(containerName);
    } catch (err: any) {
      handleShowError('Console Karaf', err?.message || err);
    } finally {
      setIsOpeningKarafClient(false);
    }
  };

  // Carregar lista de snapshots WSL
  const loadSnapshots = useCallback(
    async (dir?: string) => {
      if (!window.electronAPI?.listWslSnapshots) return;
      setIsLoadingSnapshots(true);
      try {
        if (window.electronAPI.getWslSnapshotsDir && !snapshotsDirInput) {
          const savedDir = await window.electronAPI.getWslSnapshotsDir();
          if (savedDir) setSnapshotsDirInput(savedDir);
        }
        const list = await window.electronAPI.listWslSnapshots(dir || snapshotsDirInput || undefined);
        setSnapshotsList(list || []);
      } catch {
        setSnapshotsList([]);
      } finally {
        setIsLoadingSnapshots(false);
      }
    },
    [snapshotsDirInput]
  );

  // Salvar diretório de snapshots preferencial
  const handleSaveSnapshotsDir = async (dir: string) => {
    if (!dir.trim() || !window.electronAPI?.setWslSnapshotsDir) return;
    try {
      await window.electronAPI.setWslSnapshotsDir(dir.trim());
      setSnapshotsDirInput(dir.trim());
      await loadSnapshots(dir.trim());
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: `Erro ao salvar diretório: ${err?.message || err}` });
    }
  };

  // Importar Snapshot WSL
  const handleImportSnapshot = async (params: { distroName: string; installDir: string; tarPath: string }) => {
    if (!params.distroName || !params.tarPath || !window.electronAPI?.importWslSnapshot) return;
    setSnapshotImporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.importWslSnapshot({
        distroName: params.distroName,
        installDir: params.installDir || `C:\\WSL\\${params.distroName}`,
        tarPath: params.tarPath
      });
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadDockerData();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotImporting(false);
    }
  };

  // Exportar Distro WSL para .tar
  const handleExportSnapshot = async (params: { distroName: string; exportPath: string }) => {
    if (!params.distroName || !params.exportPath || !window.electronAPI?.exportWslSnapshot) return;
    setSnapshotExporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.exportWslSnapshot({
        distroName: params.distroName,
        outputPath: params.exportPath
      });
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadSnapshots();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotExporting(false);
    }
  };

  // Desregistrar Distro WSL
  const handleUnregisterDistro = async (distroName: string) => {
    if (!distroName || !window.electronAPI?.unregisterWslDistro) return;
    setSnapshotUnregistering(distroName);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.unregisterWslDistro(distroName);
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadDockerData();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotUnregistering(null);
    }
  };

  // Carregar Scripts INFR-Docker
  const loadInfrScripts = useCallback(async (customPath?: string) => {
    if (!window.electronAPI?.checkInfrDockerScripts) return;
    setIsLoadingInfrScripts(true);
    try {
      const scripts = await window.electronAPI.checkInfrDockerScripts(
        customPath || 'C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker'
      );
      setInfrScripts(scripts || []);
    } catch {
      setInfrScripts([]);
    } finally {
      setIsLoadingInfrScripts(false);
    }
  }, []);

  // Executar Script do INFR-Docker
  const handleRunInfrScript = async (
    scriptType: 'oracle' | 'wta' | 'wsh',
    options: {
      customPath: string;
      oracleContainer: string;
      oraclePort: number;
      wtaContainer: string;
      wtaPort: number;
    }
  ) => {
    if (!window.electronAPI?.runInfrSetupScript) return;
    setIsExecutingInfr(true);
    setInfrOutput('');
    try {
      const opts: any = {
        infrPath: options.customPath,
        distro: selectedDistro || daemonStatus?.wslDistro
      };
      if (scriptType === 'oracle') {
        opts.containerName = options.oracleContainer.trim() || 'oracle-winthor';
        opts.port = Number(options.oraclePort) || 1521;
      } else if (scriptType === 'wta') {
        opts.containerName = options.wtaContainer.trim() || 'linux-winthor';
        opts.port = Number(options.wtaPort) || 8080;
      }
      const res = await window.electronAPI.runInfrSetupScript(scriptType, opts);
      setInfrOutput(res.output || (res.success ? 'Script iniciado com sucesso.' : 'Falha na execução.'));
      if (res.success) {
        setTimeout(loadDockerData, 3000);
      }
    } catch (err: any) {
      setInfrOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingInfr(false);
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
        } else {
          setSelectedDistro('');
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

  useEffect(() => {
    const unsub = (window.electronAPI as any)?.onContainerStopSequenceProgress?.((step: any) => {
      setSequenceProgress((prev) => ({
        ...prev,
        running: true,
        currentName: step.currentName,
        index: step.index,
        total: step.total,
        waitingSeconds: undefined
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
      handleShowError('Grupo Inválido', `O grupo "${env.name}" não possui containers configurados.`);
      return;
    }

    if (env.wslDistro && env.wslDistro !== selectedDistro) {
      await handleSelectDistro(env.wslDistro);
    }

    setActiveGroupId(env.id);
    setSequenceProgress({ running: true, index: 1, total: slots.length, currentName: slots[0].name });
    try {
      const res = await window.electronAPI.startContainerSequence(slots);
      if (!res.success) {
        handleShowError(`Falha no grupo "${env.name}"`, res.error || 'Erro desconhecido ao subir containers', {
          distroName: env.wslDistro || selectedDistro,
          containerName: res.failed,
          retryAction: () => handleStartEnvironment(env)
        });
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Erro ao iniciar grupo "${env.name}"`, err, {
        distroName: env.wslDistro || selectedDistro,
        retryAction: () => handleStartEnvironment(env)
      });
    } finally {
      setActiveGroupId(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleStopEnvironment = async (env: ContainerEnvironment) => {
    const names = getGroupContainerNames(env);
    if (names.length === 0) {
      handleShowError('Grupo Vazio', `O grupo "${env.name}" não possui containers.`);
      return;
    }

    setActiveGroupId(env.id);
    setSequenceProgress({ running: true, index: 1, total: names.length, currentName: names[0] });
    try {
      if ((window.electronAPI as any)?.stopContainerSequence) {
        const res = await (window.electronAPI as any).stopContainerSequence(names);
        if (!res.success) {
          handleShowError(`Falha ao parar grupo "${env.name}"`, res.error || 'Erro ao parar containers');
        }
      } else {
        for (const name of names) {
          await window.electronAPI?.stopDockerContainer(name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Erro ao parar grupo "${env.name}"`, err);
    } finally {
      setActiveGroupId(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleSaveEnvironment = async (env: ContainerEnvironment) => {
    if (!env || !env.name.trim() || !window.electronAPI?.saveContainerEnvironment) return;
    try {
      await window.electronAPI.saveContainerEnvironment(env);
      setIsCreatingEnv(false);
      setEditingEnv(null);
      setPreselectedForGroup([]);
      await loadEnvironments();
    } catch (err: any) {
      setErrorMessage(`Falha ao salvar grupo: ${err?.message || err}`);
    }
  };

  // Filtro de Containers
  const filteredContainers = useMemo(() => filterContainers(containers, filter), [containers, filter]);

  // Funções de Seleção e Ações em Lote
  const handleToggleSelectContainer = useCallback((containerId: string) => {
    setSelectedContainerIds((prev) => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedContainerIds((prev) => {
      if (filteredContainers.length === 0) return new Set();
      const allSelected = filteredContainers.every((c) => prev.has(c.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(filteredContainers.map((c) => c.id));
    });
  }, [filteredContainers]);

  const handleClearSelection = useCallback(() => {
    setSelectedContainerIds(new Set());
  }, []);

  const handleBatchStart = async () => {
    const targetContainers = containers.filter((c) => selectedContainerIds.has(c.id));
    if (targetContainers.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('start');
    const slots = targetContainers.map((c) => ({
      name: c.names.replace(/^\//, '').trim()
    }));

    setSequenceProgress({ running: true, index: 1, total: slots.length, currentName: slots[0].name });
    try {
      if (window.electronAPI?.startContainerSequence) {
        const res = await window.electronAPI.startContainerSequence(slots);
        if (!res.success) {
          handleShowError('Falha ao subir containers selecionados', res.error || 'Erro ao iniciar containers');
        }
      } else {
        for (const slot of slots) {
          await window.electronAPI?.startDockerContainer(slot.name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao iniciar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleBatchStop = async () => {
    const targetContainers = containers.filter((c) => selectedContainerIds.has(c.id));
    if (targetContainers.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('stop');
    const names = targetContainers.map((c) => c.names.replace(/^\//, '').trim());

    setSequenceProgress({ running: true, index: 1, total: names.length, currentName: names[0] });
    try {
      if ((window.electronAPI as any)?.stopContainerSequence) {
        const res = await (window.electronAPI as any).stopContainerSequence(names);
        if (!res.success) {
          handleShowError('Falha ao parar containers selecionados', res.error || 'Erro ao parar containers');
        }
      } else {
        for (const name of names) {
          await window.electronAPI?.stopDockerContainer(name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao parar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleBatchRestart = async () => {
    const targetContainers = containers.filter((c) => selectedContainerIds.has(c.id));
    if (targetContainers.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('restart');
    try {
      for (const c of targetContainers) {
        await window.electronAPI?.restartDockerContainer(c.id);
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao reiniciar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
    }
  };

  const handleCreateGroupFromSelection = () => {
    const selectedNames = containers
      .filter((c) => selectedContainerIds.has(c.id))
      .map((c) => c.names.replace(/^\//, '').trim());
    setPreselectedForGroup(selectedNames);
    setEditingEnv(null);
    setIsCreatingEnv(true);
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
    if (isActive === false) return;
    loadDockerData();
    const interval = setInterval(loadDockerData, 12000);
    const statsInterval = setInterval(loadDockerStats, 6000);
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [isActive, loadDockerData, loadDockerStats]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onDockerComposeLogChunk?.((chunk) => {
      setComposeOutput((prev) => prev + chunk);
    });
    return () => unsubscribe?.();
  }, []);

  // Sincroniza configurações do compose
  useEffect(() => {
    window.electronAPI?.getSettings?.().then((settings) => {
      if (settings.dockerComposeConfig?.filePath) setComposeFilePath(settings.dockerComposeConfig.filePath);
      if (settings.dockerComposeConfig?.profile) setComposeProfile(settings.dockerComposeConfig.profile);
    });
    if (settingsVersion && settingsVersion > 0) {
      loadEnvironments();
      loadDockerData();
    }
  }, [settingsVersion, loadEnvironments, loadDockerData]);

  const persistComposeConfig = (filePath: string, profile: string) => {
    window.electronAPI?.saveSettings?.({ dockerComposeConfig: { filePath, profile: profile || undefined } });
  };

  useEffect(() => {
    composeOutputRef.current?.scrollTo({ top: composeOutputRef.current.scrollHeight });
  }, [composeOutput]);

  // Carrega lista de arquivos compose recentes do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('winthor_recent_compose_files');
      if (saved) setRecentComposeFiles(JSON.parse(saved));
    } catch {
      // localStorage indisponível
    }
  }, []);

  const addRecentComposeFile = (file: string) => {
    if (!file) return;
    setRecentComposeFiles((prev) => {
      const filtered = prev.filter((f) => f !== file);
      const updated = [file, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('winthor_recent_compose_files', JSON.stringify(updated));
      } catch {
        // localStorage indisponível
      }
      return updated;
    });
  };

  // Iniciar Docker Daemon na Distro WSL (com auto-recuperação do erro)
  const handleStartDockerDaemon = async (distro?: string) => {
    const targetDistro = distro || smartError?.distroName || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.startWslDockerDaemon) return;
    setIsStartingDaemon(true);
    try {
      const res = await window.electronAPI.startWslDockerDaemon(targetDistro);
      if (res.success) {
        const retry = smartError?.retryAction;
        setSmartError(null);
        await loadDockerData();
        if (retry) {
          await retry();
        }
      } else {
        handleShowError('Falha ao Iniciar Docker no WSL', res.message || res.error || 'Não foi possível iniciar o daemon.');
      }
    } catch (err: any) {
      handleShowError('Erro ao Iniciar Docker no WSL', err);
    } finally {
      setIsStartingDaemon(false);
    }
  };

  // Abrir Terminal WSL diretamente na Distro
  const handleOpenWslTerminal = async (distro?: string) => {
    const targetDistro = distro || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.openWslTerminal) return;
    setIsOpeningWslTerminal(true);
    try {
      await window.electronAPI.openWslTerminal(targetDistro);
    } catch (err: any) {
      handleShowError('Falha ao abrir terminal WSL', err);
    } finally {
      setIsOpeningWslTerminal(false);
    }
  };

  // Terminar Distro WSL
  const handleTerminateDistro = async (distro?: string) => {
    const targetDistro = distro || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.terminateWslDistro) return;
    setIsTerminatingDistro(true);
    try {
      await window.electronAPI.terminateWslDistro(targetDistro);
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Falha ao terminar distro WSL', err);
    } finally {
      setIsTerminatingDistro(false);
    }
  };

  // Inspecionar Container (docker inspect detalhado)
  const handleInspectContainer = async (container: DockerContainerInfo) => {
    if (!window.electronAPI?.inspectDockerContainer) return;
    setIsLoadingInspect(true);
    setInspectingContainer(null);
    try {
      const details = await window.electronAPI.inspectDockerContainer(container.id);
      if (details) {
        setInspectingContainer(details);
      } else {
        handleShowError('Inspecionar Container', 'Nenhum dado retornado pelo Docker inspect.');
      }
    } catch (err: any) {
      handleShowError('Falha ao inspecionar container', err, { containerName: container.names });
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Pausar / Despausar Container
  const handleTogglePause = async (container: DockerContainerInfo) => {
    if (!window.electronAPI) return;
    const isPaused = container.state === 'paused';
    try {
      if (isPaused) {
        if (window.electronAPI.unpauseDockerContainer) {
          await window.electronAPI.unpauseDockerContainer(container.id);
        }
      } else {
        if (window.electronAPI.pauseDockerContainer) {
          await window.electronAPI.pauseDockerContainer(container.id);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(isPaused ? 'Falha ao despausar container' : 'Falha ao pausar container', err, {
        containerName: container.names,
        retryAction: () => handleTogglePause(container)
      });
    }
  };

  // Limpar Containers Parados (Prune)
  const handlePruneContainers = async () => {
    if (!window.electronAPI?.pruneDockerContainers) return;
    setIsPruning(true);
    setShowPruneConfirm(false);
    try {
      await window.electronAPI.pruneDockerContainers();
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Falha ao limpar containers parados', err);
    } finally {
      setIsPruning(false);
    }
  };

  // Download Logs como arquivo .log
  const handleDownloadLogs = () => {
    if (!selectedContainer || !logs) return;
    const cleanName = selectedContainer.names.replace(/^\//, '');
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanName}-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Docker Compose
  const handleSelectComposeFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    const picked = await window.electronAPI.selectFile({
      filters: [{ name: 'Docker Compose', extensions: ['yml', 'yaml'] }]
    });
    if (picked) {
      setComposeFilePath(picked);
      addRecentComposeFile(picked);
    }
  };

  const handleComposeUp = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeUp) return;
    setIsComposeRunning('up');
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeUp(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        build: composeBuild
      });
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
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeDown(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        volumes: composeVolumes
      });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRunning(null);
    }
  };

  const handleComposeRestart = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeRestart) return;
    setIsComposeRestarting(true);
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeRestart(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined
      });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRestarting(false);
    }
  };

  const handleComposeLogs = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeLogs) return;
    try {
      const output = await window.electronAPI.dockerComposeLogs(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        lines: 100
      });
      setComposeOutput(output || '(Nenhum log retornado pelo Compose)');
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO AO BUSCAR LOGS] ${err?.message || err}\r\n`);
    }
  };

  const handleComposeStatus = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeStatus) return;
    setIsLoadingComposeStatus(true);
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    try {
      const services = await window.electronAPI.dockerComposeStatus(
        composeFilePath.trim(),
        composeProfile.trim() || undefined
      );
      setComposeServices(services || []);
    } finally {
      setIsLoadingComposeStatus(false);
    }
  };

  // Ações nos Containers
  const handleContainerAction = async (
    container: DockerContainerInfo,
    action: 'start' | 'stop' | 'restart' | 'remove'
  ) => {
    if (!window.electronAPI) return;

    if (action === 'remove') {
      setContainerToRemove(container);
      return;
    }

    await executeContainerAction(container, action);
  };

  const executeContainerAction = async (
    container: DockerContainerInfo,
    action: 'start' | 'stop' | 'restart' | 'remove'
  ) => {
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
      handleShowError(`Falha ao executar ${action} no container`, err, {
        containerName: container.names,
        retryAction: () => executeContainerAction(container, action)
      });
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
  const handleRefreshLogs = useCallback(
    async (showLoading = true) => {
      if (!selectedContainer || !window.electronAPI?.getDockerLogs) return;
      if (showLoading) setIsLoadingLogs(true);
      try {
        const text = await window.electronAPI.getDockerLogs(selectedContainer.id, logLines);
        setLogs(text || '(Nenhum log retornado)');
      } catch (err: any) {
        if (showLoading) setLogs(`Erro ao atualizar logs: ${err.message || err}`);
      } finally {
        if (showLoading) setIsLoadingLogs(false);
      }
    },
    [selectedContainer, logLines]
  );

  const handleCopyLogs = () => copyLogsToClipboard(logs, 'Logs copiados!');

  // Estatísticas
  const runningCount = useMemo(() => containers.filter((c) => c.state === 'running').length, [containers]);
  const stoppedCount = useMemo(() => containers.filter((c) => c.state !== 'running').length, [containers]);

  // Topologia do Ambiente WinThor (WSL2 -> Oracle -> WTA -> WSH)
  const stackTopology = useMemo(() => computeStackTopology(containers), [containers]);

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
      {/* Topo / Header da Página & Toolbar */}
      <ContainersHeader
        daemonStatus={daemonStatus}
        selectedDistro={selectedDistro}
        availableDistros={availableDistros}
        isSwitchingDistro={isSwitchingDistro}
        isOpeningWslTerminal={isOpeningWslTerminal}
        isTerminatingDistro={isTerminatingDistro}
        onSelectDistro={handleSelectDistro}
        onOpenWslTerminal={handleOpenWslTerminal}
        onTerminateDistro={handleTerminateDistro}
        onStartDockerDaemon={handleStartDockerDaemon}
        isStartingDaemon={isStartingDaemon}
        environments={environments}
        selectedEnvId={selectedEnvId}
        onSelectEnvId={setSelectedEnvId}
        onStartEnvironment={handleStartEnvironment}
        onDeleteEnvironmentClick={(env) => setEnvToDelete(env)}
        onStartWinThorSequence={() => {
          const defaultEnv = environments.find(
            (e) => e.name.toLowerCase().includes('winthor') || e.name.toLowerCase().includes('dev')
          );
          if (defaultEnv) {
            handleStartEnvironment(defaultEnv);
          } else {
            const oracle = containers.find((c) => c.names.toLowerCase().includes('oracle'));
            const wta = containers.find(
              (c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor')
            );
            const wsh = containers.find((c) => c.names.toLowerCase().includes('wsh'));
            const seq = [
              { name: oracle ? oracle.names.replace(/^\//, '') : 'oracle-winthor', delay: 45 },
              { name: wta ? wta.names.replace(/^\//, '') : 'linux-winthor', delay: 15 },
              ...(wsh ? [{ name: wsh.names.replace(/^\//, '') }] : [])
            ];
            window.electronAPI?.startContainerSequence?.(seq)?.catch((err: any) => {
              setErrorMessage(`Erro ao iniciar sequência: ${err?.message || err}`);
            });
          }
        }}
        sequenceProgress={sequenceProgress}
        containersCount={containers.length}
        onOpenSaveEnvModal={() => {
          setEditingEnv(null);
          setPreselectedForGroup([]);
          setIsCreatingEnv(true);
        }}
        onOpenSnapshotsModal={() => {
          setIsSnapshotsModalOpen(true);
          loadSnapshots();
        }}
        onOpenInfrModal={() => {
          setIsInfrModalOpen(true);
          loadInfrScripts();
        }}
        showTopologyBus={showTopologyBus}
        onToggleTopologyBus={() => {
          const next = !showTopologyBus;
          setShowTopologyBus(next);
          try {
            localStorage.setItem('winthor_show_topology_bus', String(next));
          } catch {
            // localStorage indisponível
          }
        }}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={isLoading}
        onRefreshData={loadDockerData}
        onOpenTour={tour.open}
        copyWslIp={copyWslIp}
        wslIpFeedback={wslIpFeedback}
      />

      {/* Área Principal com Rolagem Fluida Unificada */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pb-8">
        {/* Barramento de Topologia do Ambiente WinThor */}
        <ContainerTopologyBus
          showTopologyBus={showTopologyBus}
          onClose={() => {
            setShowTopologyBus(false);
            try {
              localStorage.setItem('winthor_show_topology_bus', 'false');
            } catch {
              // localStorage indisponível
            }
          }}
          stackTopology={stackTopology}
          selectedDistro={selectedDistro}
          daemonStatus={daemonStatus}
          onOpenWslTerminal={() => handleOpenWslTerminal()}
          onOpenOracleTools={(c) => {
            setOracleModalContainer(c);
            loadAvailableDumps();
          }}
          onOpenWtaTools={(c) => setWtaModalContainer(c)}
          onOpenWshTools={(c, _tab) => {
            setWshModalContainer(c || containers[0] || null);
            loadWshPrereqs();
          }}
          copyFeedback={copyFeedback}
          onCopyText={(text, key) => copyLogsToClipboard(text, key)}
          containers={containers}
        />

        {/* Docker Compose */}
        <DockerComposePanel
          composeFilePath={composeFilePath}
          setComposeFilePath={setComposeFilePath}
          composeProfile={composeProfile}
          setComposeProfile={setComposeProfile}
          composeBuild={composeBuild}
          setComposeBuild={setComposeBuild}
          composeVolumes={composeVolumes}
          setComposeVolumes={setComposeVolumes}
          isComposeRunning={isComposeRunning}
          isComposeRestarting={isComposeRestarting}
          isLoadingComposeStatus={isLoadingComposeStatus}
          composeServices={composeServices}
          composeOutput={composeOutput}
          recentComposeFiles={recentComposeFiles}
          onSelectComposeFile={handleSelectComposeFile}
          onComposeUp={handleComposeUp}
          onComposeDown={handleComposeDown}
          onComposeRestart={handleComposeRestart}
          onComposeLogs={handleComposeLogs}
          onComposeStatus={handleComposeStatus}
          isComposeExpanded={isComposeExpanded}
          setIsComposeExpanded={setIsComposeExpanded}
          composeOutputRef={composeOutputRef}
        />

        {/* Painel de Grupos de Containers */}
        <ContainerGroupsBar
          environments={environments}
          containers={containers}
          sequenceProgress={sequenceProgress}
          activeGroupId={activeGroupId}
          onStartGroup={handleStartEnvironment}
          onStopGroup={handleStopEnvironment}
          onEditGroup={(env) => {
            setEditingEnv(env);
            setIsCreatingEnv(true);
          }}
          onDeleteGroup={(env) => setEnvToDelete(env)}
          onCreateGroup={() => {
            setEditingEnv(null);
            setPreselectedForGroup([]);
            setIsCreatingEnv(true);
          }}
        />

        {/* Barra de Status & Ações Rápidas em Lote */}
        <div className="mx-4 mt-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <strong className="text-foreground font-semibold">{runningCount}</strong> rodando
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <strong className="text-foreground font-semibold">{stoppedCount}</strong> parados
            </span>
            <span className="text-[11px] text-muted-foreground/80">
              Total: <strong className="text-foreground font-semibold">{containers.length}</strong>
            </span>
          </div>

          {stoppedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowPruneConfirm(true)}
              disabled={isPruning}
              title="Remover todos os containers parados (docker container prune)"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 border border-border/80 hover:border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs active:scale-98"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar Parados ({stoppedCount})</span>
            </button>
          )}
        </div>

        {/* Barra de Ações em Lote quando há containers selecionados (Sticky no topo durante a rolagem) */}
        {selectedContainerIds.size > 0 && (
          <div className="sticky top-2 z-20">
            <ContainerBatchBar
              selectedCount={selectedContainerIds.size}
              totalFilteredCount={filteredContainers.length}
              isAllSelected={selectedContainerIds.size > 0 && selectedContainerIds.size === filteredContainers.length}
              onToggleSelectAll={handleToggleSelectAll}
              onClearSelection={handleClearSelection}
              onBatchStart={handleBatchStart}
              onBatchStop={handleBatchStop}
              onBatchRestart={handleBatchRestart}
              onCreateGroupFromSelection={handleCreateGroupFromSelection}
              isExecutingBatch={isExecutingBatch}
              batchActionType={batchActionType}
            />
          </div>
        )}

        {/* Lista de Containers */}
        <div className="px-4">
          {filteredContainers.length === 0 ? (
            <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-card/30 border border-dashed border-border/80 rounded-2xl">
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
            <div className="grid grid-cols-1 gap-3" data-tour="container-list">
              {filteredContainers.map((container) => {
                const cleanName = container.names.replace(/^\//, '');
                const stats =
                  containerStats[container.id] ||
                  containerStats[cleanName] ||
                  Object.values(containerStats).find(
                    (s) => s.id.startsWith(container.id.slice(0, 10)) || s.name === cleanName
                  );

                return (
                  <ContainerCard
                    key={container.id}
                    container={container}
                    stats={stats}
                    isLoadingAction={actionLoading[container.id]}
                    isOpeningTerminal={isOpeningTerminal[container.id]}
                    isLoadingInspect={isLoadingInspect}
                    copyFeedback={copyFeedback}
                    getStateBadge={getStateBadge}
                    onCopyText={(text, key) => copyLogsToClipboard(text, key)}
                    onOpenOracleTools={(c) => {
                      setOracleModalContainer(c);
                      loadAvailableDumps();
                    }}
                    onOpenWtaTools={(c) => setWtaModalContainer(c)}
                    onOpenWshTools={(c) => {
                      setWshModalContainer(c);
                      loadWshPrereqs();
                    }}
                    onInspectContainer={handleInspectContainer}
                    onContainerAction={handleContainerAction}
                    onTogglePause={handleTogglePause}
                    onOpenTerminal={handleOpenTerminal}
                    onOpenLogs={handleOpenLogs}
                    isSelected={selectedContainerIds.has(container.id)}
                    onToggleSelect={handleToggleSelectContainer}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modais Extraídos */}
      {selectedContainer && (
        <ContainerLogsModal
          container={selectedContainer}
          logs={logs}
          isLoadingLogs={isLoadingLogs}
          logLines={logLines}
          onSetLogLines={setLogLines}
          onRefreshLogs={handleRefreshLogs}
          onDownloadLogs={handleDownloadLogs}
          onCopyLogs={handleCopyLogs}
          copyFeedback={copyFeedback}
          onClose={() => setSelectedContainer(null)}
        />
      )}

      <SaveEnvironmentModal
        isOpen={isCreatingEnv}
        containers={containers}
        selectedDistro={selectedDistro}
        editingEnvironment={editingEnv}
        preselectedContainerNames={preselectedForGroup}
        onClose={() => {
          setIsCreatingEnv(false);
          setEditingEnv(null);
          setPreselectedForGroup([]);
        }}
        onSave={handleSaveEnvironment}
      />

      <ContainerRemoveConfirmModal
        container={containerToRemove}
        onClose={() => setContainerToRemove(null)}
        onConfirm={async (c) => {
          setContainerToRemove(null);
          await executeContainerAction(c, 'remove');
        }}
      />

      <EnvironmentDeleteConfirmModal
        environment={envToDelete}
        onClose={() => setEnvToDelete(null)}
        onConfirm={async (env) => {
          setEnvToDelete(null);
          await handleDeleteEnvironment(env.id);
        }}
      />

      <OracleMaintenanceModal
        container={oracleModalContainer}
        availableDumps={availableDumps}
        isLoadingDumps={isLoadingDumps}
        isOpeningDumpsFolder={isOpeningDumpsFolder}
        onRefreshDumps={loadAvailableDumps}
        onOpenDumpsFolder={handleOpenDumpsFolder}
        onClose={() => setOracleModalContainer(null)}
        onError={setErrorMessage}
      />

      <WshUtilsModal
        container={wshModalContainer}
        wshPrereqs={wshPrereqs}
        isLoadingWshPrereqs={isLoadingWshPrereqs}
        isOpeningOptFolder={isOpeningOptFolder}
        onLoadWshPrereqs={loadWshPrereqs}
        onOpenOptFolder={handleOpenOptFolder}
        onClose={() => setWshModalContainer(null)}
      />

      <WtaUtilsModal
        container={wtaModalContainer}
        onClose={() => setWtaModalContainer(null)}
        onOpenKarafClient={handleOpenKarafClient}
        isOpeningKarafClient={isOpeningKarafClient}
      />

      <WslSnapshotsModal
        isOpen={isSnapshotsModalOpen}
        onClose={() => setIsSnapshotsModalOpen(false)}
        snapshotsList={snapshotsList}
        snapshotsDirInput={snapshotsDirInput}
        setSnapshotsDirInput={setSnapshotsDirInput}
        isLoadingSnapshots={isLoadingSnapshots}
        availableDistros={availableDistros}
        onLoadSnapshots={loadSnapshots}
        onSaveSnapshotsDir={handleSaveSnapshotsDir}
        onImportSnapshot={handleImportSnapshot}
        onExportSnapshot={handleExportSnapshot}
        onUnregisterDistro={handleUnregisterDistro}
        snapshotImporting={snapshotImporting}
        snapshotExporting={snapshotExporting}
        snapshotUnregistering={snapshotUnregistering}
        snapshotFeedback={snapshotFeedback}
        setSnapshotFeedback={setSnapshotFeedback}
      />

      <InfrBootstrapModal
        isOpen={isInfrModalOpen}
        onClose={() => setIsInfrModalOpen(false)}
        infrScripts={infrScripts}
        isLoadingInfrScripts={isLoadingInfrScripts}
        onLoadInfrScripts={loadInfrScripts}
        onRunInfrScript={handleRunInfrScript}
        isExecutingInfr={isExecutingInfr}
        infrOutput={infrOutput}
      />

      <ContainerSmartErrorModal
        smartError={smartError}
        selectedDistro={selectedDistro}
        onClose={() => setSmartError(null)}
        onStartDaemon={handleStartDockerDaemon}
        onOpenWslTerminal={handleOpenWslTerminal}
        isStartingDaemon={isStartingDaemon}
      />

      <ContainerPruneModal
        isOpen={showPruneConfirm}
        stoppedCount={stoppedCount}
        isPruning={isPruning}
        onClose={() => setShowPruneConfirm(false)}
        onConfirm={handlePruneContainers}
      />

      <ContainerInspectModal
        inspectingContainer={inspectingContainer}
        onClose={() => setInspectingContainer(null)}
        getStateBadge={getStateBadge}
      />

      <OnboardingTour
        steps={CONTAINERS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={CONTAINERS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
