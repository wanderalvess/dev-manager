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
  Cpu,
  FolderPlus,
  FolderOpen,
  Compass,
  Check,
  Database,
  Wrench,
  FileText,
  X,
  Shield,
  Pause,
  Info,
  Download,
  WrapText,
  Eye,
  EyeOff,
  Network,
  Globe,
  Power,
  Key,
  Archive,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
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
  buildEnvironmentSlots,
  computeStackTopology,
  extractOraclePort,
  extractWtaPort,
  filterContainers,
  flattenPortBindings,
  getOracleTnsConfig,
  parsePortLinks
} from '../utils/dockerContainerUtils';

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
  const [newEnvName, setNewEnvName] = useState<string>('');
  const [newEnvColor, setNewEnvColor] = useState<string>('#0066cc');
  const [envPresetType, setEnvPresetType] = useState<'current' | 'doc' | 'infr'>('current');
  const [envToDelete, setEnvToDelete] = useState<ContainerEnvironment | null>(null);

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
  const [oracleActiveTab, setOracleActiveTab] = useState<'health' | 'sqlplus' | 'datapump' | 'tns'>('health');
  const [oracleHealthSchema, setOracleHealthSchema] = useState<string>('');
  const [oracleHealthUser, setOracleHealthUser] = useState<string>('sys');
  const [oracleHealthPass, setOracleHealthPass] = useState<string>('pcinfo');
  const [isOracleHealthRunning, setIsOracleHealthRunning] = useState<boolean>(false);
  const [oracleHealthOutput, setOracleHealthOutput] = useState<string>('');
  const [oracleHealthSuccess, setOracleHealthSuccess] = useState<boolean | null>(null);

  const [oracleSqlUser, setOracleSqlUser] = useState<string>('sys');
  const [oracleSqlPass, setOracleSqlPass] = useState<string>('pcinfo');
  const [isOracleSqlOpening, setIsOracleSqlOpening] = useState<boolean>(false);

  const [dpDumpfile, setDpDumpfile] = useState<string>('backup.dmp');
  const [dpSchemaOrig, setDpSchemaOrig] = useState<string>('LOCAL');
  const [dpSchemaDest, setDpSchemaDest] = useState<string>('');
  const [dpCodclipc, setDpCodclipc] = useState<string>('-999');
  const [dpUser, setDpUser] = useState<string>('system');
  const [dpPass, setDpPass] = useState<string>('pcinfo');
  const [isDpRunning, setIsDpRunning] = useState<boolean>(false);
  const [dpOutput, setDpOutput] = useState<string>('');
  const [dpSuccess, setDpSuccess] = useState<boolean | null>(null);
  const [availableDumps, setAvailableDumps] = useState<WslDumpFileInfo[]>([]);
  const [isLoadingDumps, setIsLoadingDumps] = useState<boolean>(false);
  const [isOpeningDumpsFolder, setIsOpeningDumpsFolder] = useState<boolean>(false);

  // Modal de Utilitários WSH (Winthor Smart Hub)
  const [wshModalContainer, setWshModalContainer] = useState<DockerContainerInfo | null>(null);
  const [wshActiveTab, setWshActiveTab] = useState<'md5' | 'files' | 'rotina2650'>('md5');
  const [wshPlainPass, setWshPlainPass] = useState<string>('pcinfo');
  const [wshMd5Upper, setWshMd5Upper] = useState<string>('');
  const [wshMd5Lower, setWshMd5Lower] = useState<string>('');
  const [wshPrereqs, setWshPrereqs] = useState<WshPrerequisiteStatus[]>([]);
  const [isLoadingWshPrereqs, setIsLoadingWshPrereqs] = useState<boolean>(false);
  const [isOpeningOptFolder, setIsOpeningOptFolder] = useState<boolean>(false);

  // Geração reativa de hash MD5 para senhas WSH
  useEffect(() => {
    if (!wshPlainPass) {
      setWshMd5Upper('');
      setWshMd5Lower('');
      return;
    }
    if (window.electronAPI?.generateMd5) {
      window.electronAPI.generateMd5(wshPlainPass).then((res) => {
        if (res) {
          setWshMd5Upper(res.upper);
          setWshMd5Lower(res.lower);
        }
      });
    }
  }, [wshPlainPass]);

  // Modal de Utilitários WTA (Apache Karaf / Portal / Dev Mode)
  const [wtaModalContainer, setWtaModalContainer] = useState<DockerContainerInfo | null>(null);
  const [wtaActiveTab, setWtaActiveTab] = useState<'access' | 'karaf' | 'dev'>('access');
  const [isOpeningKarafClient, setIsOpeningKarafClient] = useState<boolean>(false);

  // Modal de Snapshots WSL (.tar Import / Export / Unregister)
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);
  const [snapshotsList, setSnapshotsList] = useState<WslSnapshotFileInfo[]>([]);
  const [snapshotsDirInput, setSnapshotsDirInput] = useState<string>('');
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState<boolean>(false);
  const [snapshotImporting, setSnapshotImporting] = useState<boolean>(false);
  const [snapshotExporting, setSnapshotExporting] = useState<boolean>(false);
  const [snapshotUnregistering, setSnapshotUnregistering] = useState<string | null>(null);
  const [snapshotImportName, setSnapshotImportName] = useState<string>('ubuntu2604-winthor');
  const [snapshotImportTarPath, setSnapshotImportTarPath] = useState<string>('');
  const [snapshotImportInstallDir, setSnapshotImportInstallDir] = useState<string>('C:\\WSL\\ubuntu2604-winthor');
  const [snapshotExportDistro, setSnapshotExportDistro] = useState<string>('');
  const [snapshotExportPath, setSnapshotExportPath] = useState<string>('');
  const [snapshotFeedback, setSnapshotFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Modal de Assistente de Bootstrap INFR-Docker
  const [isInfrModalOpen, setIsInfrModalOpen] = useState<boolean>(false);
  const [infrActiveTab, setInfrActiveTab] = useState<'oracle' | 'wta' | 'wsh' | 'scripts'>('oracle');
  const [infrScripts, setInfrScripts] = useState<InfrDockerScriptStatus[]>([]);
  const [isLoadingInfrScripts, setIsLoadingInfrScripts] = useState<boolean>(false);
  const [infrCustomPath, setInfrCustomPath] = useState<string>('C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker');
  const [infrOracleContainer, setInfrOracleContainer] = useState<string>('oracle-winthor');
  const [infrOraclePort, setInfrOraclePort] = useState<number>(1521);
  const [infrWtaContainer, setInfrWtaContainer] = useState<string>('linux-winthor');
  const [infrWtaPort, setInfrWtaPort] = useState<number>(8080);
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
  const [inspectTab, setInspectTab] = useState<'general' | 'network' | 'mounts' | 'env'>('general');
  const [showSecretEnv, setShowSecretEnv] = useState<Record<string, boolean>>({});
  const [envSearchFilter, setEnvSearchFilter] = useState<string>('');

  // Ação em Lote (Prune)
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState<boolean>(false);

  // Logs Avançados
  const [isLogAutoRefresh, setIsLogAutoRefresh] = useState<boolean>(false);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [isLogWrap, setIsLogWrap] = useState<boolean>(true);

  // Modal de Erro Inteligente com Auto-Recuperação
  const [smartError, setSmartError] = useState<{
    title: string;
    message: string;
    distroName?: string;
    containerName?: string;
    isDaemonOffline?: boolean;
    isNotInstalled?: boolean;
    retryAction?: () => Promise<void>;
  } | null>(null);
  const [isStartingDaemon, setIsStartingDaemon] = useState<boolean>(false);
  const { copy: copyInstallCmd, copiedKey: installCmdFeedback } = useCopyToClipboard();

  const handleShowError = useCallback(
    (
      title: string,
      errOrMsg: any,
      options?: { distroName?: string; containerName?: string; retryAction?: () => Promise<void> }
    ) => {
      const rawMsg = errOrMsg?.message || String(errOrMsg);
      const isNotInstalled = /DOCKER_NOT_INSTALLED|apt (update|install)|docker\.io/i.test(rawMsg);
      const isDaemonOffline = isNotInstalled || /Cannot connect to the Docker daemon|docker\.sock|dockerd|daemon is not running|Is the docker daemon running/i.test(rawMsg);
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
  const loadAvailableDumps = useCallback(async (distro?: string) => {
    if (!window.electronAPI?.listWslDmpFiles) return;
    setIsLoadingDumps(true);
    try {
      const target = distro || selectedDistro || daemonStatus?.wslDistro;
      const dumps = await window.electronAPI.listWslDmpFiles(target);
      setAvailableDumps(dumps || []);
      if (dumps && dumps.length > 0) {
        setDpDumpfile((curr) => (!curr || curr === 'backup.dmp' ? dumps[0].name : curr));
      }
    } catch {
      setAvailableDumps([]);
    } finally {
      setIsLoadingDumps(false);
    }
  }, [selectedDistro, daemonStatus]);

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
  const loadSnapshots = useCallback(async (dir?: string) => {
    if (!window.electronAPI?.listWslSnapshots) return;
    setIsLoadingSnapshots(true);
    try {
      if (window.electronAPI.getWslSnapshotsDir && !snapshotsDirInput) {
        const savedDir = await window.electronAPI.getWslSnapshotsDir();
        if (savedDir) setSnapshotsDirInput(savedDir);
      }
      const list = await window.electronAPI.listWslSnapshots(dir || snapshotsDirInput || undefined);
      setSnapshotsList(list || []);
      if (list && list.length > 0 && !snapshotImportTarPath) {
        setSnapshotImportTarPath(list[0].path);
      }
    } catch {
      setSnapshotsList([]);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [snapshotsDirInput, snapshotImportTarPath]);

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
  const handleImportSnapshot = async () => {
    if (!snapshotImportName.trim() || !snapshotImportTarPath.trim() || !window.electronAPI?.importWslSnapshot) return;
    setSnapshotImporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.importWslSnapshot({
        distroName: snapshotImportName.trim(),
        installDir: snapshotImportInstallDir.trim() || `C:\\WSL\\${snapshotImportName.trim()}`,
        tarPath: snapshotImportTarPath.trim()
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
  const handleExportSnapshot = async () => {
    if (!snapshotExportDistro || !snapshotExportPath.trim() || !window.electronAPI?.exportWslSnapshot) return;
    setSnapshotExporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.exportWslSnapshot({
        distroName: snapshotExportDistro,
        outputPath: snapshotExportPath.trim()
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
      const scripts = await window.electronAPI.checkInfrDockerScripts(customPath || infrCustomPath);
      setInfrScripts(scripts || []);
    } catch {
      setInfrScripts([]);
    } finally {
      setIsLoadingInfrScripts(false);
    }
  }, [infrCustomPath]);

  // Executar Script do INFR-Docker
  const handleRunInfrScript = async (scriptType: 'oracle' | 'wta' | 'wsh') => {
    if (!window.electronAPI?.runInfrSetupScript) return;
    setIsExecutingInfr(true);
    setInfrOutput('');
    try {
      const options: any = {
        infrPath: infrCustomPath,
        distro: selectedDistro || daemonStatus?.wslDistro
      };
      if (scriptType === 'oracle') {
        options.containerName = infrOracleContainer.trim() || 'oracle-winthor';
        options.port = Number(infrOraclePort) || 1521;
      } else if (scriptType === 'wta') {
        options.containerName = infrWtaContainer.trim() || 'linux-winthor';
        options.port = Number(infrWtaPort) || 8080;
      }
      const res = await window.electronAPI.runInfrSetupScript(scriptType, options);
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
      handleShowError('Ambiente Inválido', `O ambiente "${env.name}" não possui containers configurados.`);
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
        handleShowError(`Falha no ambiente "${env.name}"`, res.error || 'Erro desconhecido ao subir containers', {
          distroName: env.wslDistro || selectedDistro,
          containerName: res.failed,
          retryAction: () => handleStartEnvironment(env)
        });
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Erro ao iniciar ambiente "${env.name}"`, err, {
        distroName: env.wslDistro || selectedDistro,
        retryAction: () => handleStartEnvironment(env)
      });
    } finally {
      setSequenceProgress({ running: false });
    }
  };

  const handleSaveCurrentAsEnvironment = async () => {
    if (!newEnvName.trim() || !window.electronAPI?.saveContainerEnvironment) return;

    const slots = buildEnvironmentSlots(envPresetType, containers);

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

  // Lembra o último docker-compose.yml/profile usados e sincroniza ambientes/docker ao alterar configurações
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

  // Modais de Confirmação
  const [containerToRemove, setContainerToRemove] = useState<DockerContainerInfo | null>(null);

  // Carrega lista de arquivos compose recentes do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('winthor_recent_compose_files');
      if (saved) setRecentComposeFiles(JSON.parse(saved));
    } catch {
      // localStorage indisponível ou JSON inválido: ignora e mantém a lista vazia
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
        // localStorage indisponível (ex: modo privado): segue apenas com o estado em memória
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
    setInspectTab('general');
    setEnvSearchFilter('');
    setShowSecretEnv({});
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

  // Parser para portas publicadas em container
  // Docker Compose: Selecionar arquivo
  const handleSelectComposeFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    const picked = await window.electronAPI.selectFile({ filters: [{ name: 'Docker Compose', extensions: ['yml', 'yaml'] }] });
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
    setLogSearchQuery('');
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

  // Recarregar Logs com nova quantidade de linhas (com suporte a background auto-refresh)
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

  // Auto-refresh interval para os logs quando modal estiver aberto
  useEffect(() => {
    if (!selectedContainer || !isLogAutoRefresh) return;
    const timer = setInterval(() => {
      handleRefreshLogs(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedContainer, isLogAutoRefresh, logLines, handleRefreshLogs]);

  // Copiar Logs
  const handleCopyLogs = () => copyLogsToClipboard(logs, 'Logs copiados!');

  // Filtro
  const filteredContainers = useMemo(() => filterContainers(containers, filter), [containers, filter]);

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
      {/* Topo / Header da Página */}
      <header className="px-4 py-3 bg-card/85 backdrop-blur border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0" data-tour="page-header">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0 shadow-xs">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-bold text-foreground tracking-tight">Containers & WSL</h2>
              <button
                type="button"
                onClick={tour.open}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                title="Rever o tour guiado desta página"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
              {daemonStatus && (
                daemonStatus.running ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      {daemonStatus.isWsl
                        ? `WSL • ${daemonStatus.wslDistro || 'Docker Ativo'}`
                        : daemonStatus.engine === 'podman'
                        ? 'Podman Nativo'
                        : 'Docker Host'}
                    </span>
                    {daemonStatus.wslIp && (
                      <button
                        type="button"
                        onClick={() => copyWslIp(daemonStatus.wslIp!, 'wsl-ip')}
                        title="IP do WSL no Host (Clique para copiar)"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/25 text-[10px] font-mono transition cursor-pointer"
                      >
                        <Network className="w-3 h-3 text-sky-500" />
                        <span>{daemonStatus.wslIp}</span>
                        <Copy className="w-2.5 h-2.5 opacity-70" />
                        {wslIpFeedback === 'wsl-ip' && <span className="text-[9px] font-bold text-emerald-500 ml-0.5">Copiado!</span>}
                      </button>
                    )}
                  </div>
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

              {selectedDistro && (
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border/60">
                  <button
                    type="button"
                    onClick={() => handleOpenWslTerminal()}
                    disabled={isOpeningWslTerminal}
                    title={`Abrir terminal WSL na distro ${selectedDistro}`}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <Terminal className="w-3 h-3 text-sky-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTerminateDistro()}
                    disabled={isTerminatingDistro}
                    title={`Desligar distro ${selectedDistro} (wsl --terminate)`}
                    className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Power className={`w-3 h-3 ${isTerminatingDistro ? 'animate-spin text-rose-500' : ''}`} />
                  </button>
                </div>
              )}
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
                {selectedEnvId && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = environments.find((env) => env.id === selectedEnvId);
                      if (found) setEnvToDelete(found);
                    }}
                    disabled={sequenceProgress.running}
                    title="Excluir ambiente salvo"
                    className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
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
                  window.electronAPI?.startContainerSequence?.(seq)?.catch((err: any) => {
                    setErrorMessage(`Erro ao iniciar sequência: ${err?.message || err}`);
                  });
                }
              }}
              disabled={sequenceProgress.running || containers.length === 0}
              title="Inicia sequencialmente Oracle XE -> WTA -> WSH"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-98"
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
              <FolderPlus className="w-3.5 h-3.5 text-primary" />
              <span className="hidden lg:inline">Salvar Ambiente</span>
            </button>

            {/* Snapshots WSL */}
            <button
              onClick={() => {
                setIsSnapshotsModalOpen(true);
                loadSnapshots();
              }}
              title="Gerenciamento de Snapshots .tar do WSL (Importar / Exportar / Remover)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
            >
              <Archive className="w-3.5 h-3.5 text-primary" />
              <span className="hidden lg:inline">Snapshots WSL</span>
            </button>

            {/* Assistente de Bootstrap INFR-Docker */}
            <button
              onClick={() => {
                setIsInfrModalOpen(true);
                loadInfrScripts();
              }}
              title="Assistente de Bootstrap INFR-Docker (Setup Oracle XE, WTA, WSH)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden lg:inline">Assistente INFR</span>
            </button>

            {/* Alternar Barramento de Topologia */}
            <button
              type="button"
              onClick={() => {
                const next = !showTopologyBus;
                setShowTopologyBus(next);
                try {
                  localStorage.setItem('winthor_show_topology_bus', String(next));
                } catch {
                  // localStorage indisponível: preferência não persiste, mas segue funcionando na sessão
                }
              }}
              title={showTopologyBus ? 'Ocultar barramento de topologia WinThor' : 'Exibir barramento de topologia WinThor'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95 ${
                showTopologyBus
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-card hover:bg-muted text-muted-foreground border-border/80'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{showTopologyBus ? 'Topologia ON' : 'Topologia OFF'}</span>
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

      {/* Alerta Preventivo caso Docker Engine não esteja rodando */}
      {daemonStatus && !daemonStatus.running && (
        <div className="p-3 mx-4 mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start sm:items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="leading-snug">
              <span className="font-bold block sm:inline mr-1">Docker Engine offline:</span>
              <span>
                {daemonStatus.error ||
                  `O daemon do Docker está inativo${selectedDistro ? ` na distro WSL "${selectedDistro}"` : ''}. Inicie o serviço para gerenciar containers.`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {selectedDistro && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartDockerDaemon(selectedDistro)}
                  disabled={isStartingDaemon}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
                >
                  {isStartingDaemon ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Power className="w-3 h-3" />
                  )}
                  <span>{isStartingDaemon ? 'Iniciando Docker...' : 'Iniciar Docker no WSL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWslTerminal(selectedDistro)}
                  className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Abrir Terminal WSL
                </button>
              </>
            )}
            <button
              onClick={loadDockerData}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/35 rounded-lg font-semibold transition cursor-pointer shrink-0"
            >
              Recarregar
            </button>
          </div>
        </div>
      )}

      {/* Barramento de Topologia do Ambiente WinThor (Stack Topology Bus) */}
      {showTopologyBus && (
        <div className="mx-4 mt-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <span>Topologia do Ambiente WinThor</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 font-normal">
                  WSL2 &amp; Containers
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {stackTopology.isStackComplete ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  STACK TOTALMENTE OPERACIONAL
                </span>
              ) : stackTopology.hasMissingDependency ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  ALERTA: ORACLE OFFLINE COM SERVIÇOS ATIVOS
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  STACK PARCIALMENTE ATIVA
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowTopologyBus(false);
                  try {
                    localStorage.setItem('winthor_show_topology_bus', 'false');
                  } catch {
                    // localStorage indisponível: preferência não persiste, mas segue funcionando na sessão
                  }
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                title="Ocultar Barramento de Topologia"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Nós Interconectados da Topologia */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch relative">
            {/* Nó 1: WSL2 Runtime Host */}
            <div className="bg-muted/30 dark:bg-muted/15 border border-border/80 rounded-lg p-3 flex flex-col justify-between space-y-2 relative group hover:border-sky-500/40 transition shadow-2xs">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Host Runtime
                    </div>
                    <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                      {selectedDistro || daemonStatus?.wslDistro || 'WSL2 Nativo'}
                    </div>
                  </div>
                </div>
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${
                    daemonStatus?.running ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
                  }`}
                  title={daemonStatus?.running ? 'Docker Engine Ativo' : 'Docker Engine Offline'}
                />
              </div>

              <div className="pt-1 flex items-center justify-between gap-1 text-[10px] font-mono">
                {daemonStatus?.wslIp ? (
                  <span className="text-sky-700 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    IP: {daemonStatus.wslIp}
                  </span>
                ) : (
                  <span className="text-muted-foreground">IP Local</span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenWslTerminal()}
                  className="text-[10px] text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Terminal className="w-2.5 h-2.5" /> Terminal
                </button>
              </div>
            </div>

            {/* Nó 2: Oracle XE 11g */}
            <div
              className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
                stackTopology.oracle.running
                  ? 'border-orange-500/40 hover:border-orange-500/60 shadow-xs'
                  : 'border-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
                      Oracle XE 11g
                    </div>
                    <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                      {stackTopology.oracle.name}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    stackTopology.oracle.running
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border/70'
                  }`}
                >
                  {stackTopology.oracle.running ? `:${stackTopology.oracle.port}` : 'OFF'}
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    copyLogsToClipboard(getOracleTnsConfig(stackTopology.oracle.port), 'topo-tns');
                  }}
                  className="px-1.5 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded border border-orange-500/30 font-semibold cursor-pointer transition"
                >
                  {copyFeedback === 'topo-tns' ? 'Copiado!' : 'Copiar TNS'}
                </button>
                {stackTopology.oracle.container && (
                  <button
                    type="button"
                    onClick={() => {
                      setOracleModalContainer(stackTopology.oracle.container);
                      loadAvailableDumps();
                    }}
                    className="text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:underline cursor-pointer font-medium"
                  >
                    Ferramentas
                  </button>
                )}
              </div>
            </div>

            {/* Nó 3: WTA (Apache Karaf) */}
            <div
              className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
                stackTopology.wta.running
                  ? 'border-cyan-500/40 hover:border-cyan-500/60 shadow-xs'
                  : 'border-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                      WTA (Karaf)
                    </div>
                    <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                      {stackTopology.wta.name}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    stackTopology.wta.running
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border/70'
                  }`}
                >
                  {stackTopology.wta.running ? `:${stackTopology.wta.port}` : 'OFF'}
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
                {stackTopology.wta.running ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.electronAPI?.openExternal?.(`http://localhost:${stackTopology.wta.port}/wta/`)
                    }
                    className="px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded border border-cyan-500/30 font-semibold cursor-pointer transition flex items-center gap-1"
                  >
                    <span>Abrir Portal</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <span className="text-muted-foreground text-[10px] font-mono">Porta 8080</span>
                )}
                {stackTopology.wta.container && (
                  <button
                    type="button"
                    onClick={() => setWtaModalContainer(stackTopology.wta.container)}
                    className="text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer font-medium"
                  >
                    Karaf
                  </button>
                )}
              </div>
            </div>

            {/* Nó 4: WSH (Smart Hub) */}
            <div
              className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
                stackTopology.wsh.running
                  ? 'border-violet-500/40 hover:border-violet-500/60 shadow-xs'
                  : 'border-border/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold">
                      WinThor Hub (WSH)
                    </div>
                    <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                      {stackTopology.wsh.name}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    stackTopology.wsh.running
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border/70'
                  }`}
                >
                  {stackTopology.wsh.running ? ':8080' : 'OFF'}
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setWshModalContainer(stackTopology.wsh.container || (containers[0] ?? null));
                    loadWshPrereqs();
                  }}
                  className="px-1.5 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded border border-violet-500/30 font-semibold cursor-pointer transition"
                >
                  Gerador MD5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWshModalContainer(stackTopology.wsh.container || (containers[0] ?? null));
                    setWshActiveTab('rotina2650');
                  }}
                  className="text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:underline cursor-pointer font-medium"
                >
                  Rotina 2650
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Docker Compose */}
      <div className="mx-4 mt-3 p-3 bg-card/60 backdrop-blur border border-border/70 rounded-xl shrink-0 space-y-2.5 shadow-2xs" data-tour="compose-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Docker Compose</span>
            {composeServices.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-muted border border-border/50 text-muted-foreground font-normal">
                {composeServices.length} serviços
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {recentComposeFiles.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="hidden sm:inline">Recentes:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) setComposeFilePath(e.target.value);
                  }}
                  value=""
                  className="bg-muted/70 text-foreground text-[10px] border border-border/70 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none max-w-[140px] truncate"
                >
                  <option value="">Selecionar recente...</option>
                  {recentComposeFiles.map((file, idx) => (
                    <option key={idx} value={file}>
                      {file.split(/[\\/]/).pop()} ({file})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsComposeExpanded(!isComposeExpanded)}
              className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              {isComposeExpanded ? 'Recolher Opções' : 'Configurar Compose'}
            </button>
          </div>
        </div>

        {isComposeExpanded && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
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
              className="w-32 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-muted-foreground/60"
            />

            <label className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={composeBuild}
                onChange={(e) => setComposeBuild(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <span>--build</span>
            </label>

            <label className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={composeVolumes}
                onChange={(e) => setComposeVolumes(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <span>-v (volumes)</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleComposeRestart}
            disabled={!composeFilePath.trim() || isComposeRestarting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
            title="Reiniciar serviços do Compose"
          >
            <RotateCw className={`w-3 h-3 ${isComposeRestarting ? 'animate-spin text-amber-500' : ''}`} />
            Restart
          </button>
          <button
            onClick={handleComposeLogs}
            disabled={!composeFilePath.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
            title="Buscar últimos logs do Compose"
          >
            <Terminal className="w-3 h-3" />
            Logs
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
            className="max-h-32 overflow-auto bg-muted/60 dark:bg-muted/20 text-foreground text-[10px] font-mono p-2.5 rounded-lg whitespace-pre-wrap border border-border/70 shadow-inner"
          >
            {composeOutput}
          </pre>
        )}
      </div>

      {/* Barra de Status & Ações Rápidas em Lote */}
      <div className="mx-4 mt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
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
          <div className="grid grid-cols-1 gap-3" data-tour="container-list">
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

              const isOracle = cleanName.toLowerCase().includes('oracle');
              const isWta = cleanName.toLowerCase().includes('wta') || cleanName.toLowerCase().includes('linux');
              const isWsh = cleanName.toLowerCase().includes('wsh');

              const cpuPercNumber = stats ? parseFloat(stats.cpu.replace('%', '')) || 0 : 0;
              const memPercNumber = stats ? parseFloat(stats.memPerc.replace('%', '')) || 0 : 0;

              return (
                <div
                  key={container.id}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-200 bg-card ${
                    isRunning
                      ? isOracle
                        ? 'border-orange-500/35 shadow-[0_2px_14px_rgba(234,88,12,0.06)]'
                        : isWta
                        ? 'border-cyan-500/35 shadow-[0_2px_14px_rgba(6,182,212,0.06)]'
                        : isWsh
                        ? 'border-violet-500/35 shadow-[0_2px_14px_rgba(139,92,246,0.06)]'
                        : 'border-border/80 shadow-sm hover:border-primary/40'
                      : 'border-border/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Trilho Lateral Indicador de LED */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                      isRunning
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                        : container.state === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-zinc-400 dark:bg-zinc-700'
                    }`}
                  />

                  <div className="p-3.5 pl-4.5 flex flex-col gap-2.5">
                    {/* Linha 1: Cabeçalho do Rack com Runtime Tag, Nome e Portas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Tag Temática de Runtime */}
                        {isOracle ? (
                          <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-orange-500" />
                            ORACLE XE
                          </span>
                        ) : isWta ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-cyan-500" />
                            WTA KARAF
                          </span>
                        ) : isWsh ? (
                          <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                            <Key className="w-3 h-3 text-violet-500" />
                            WSH HUB
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                            <Box className="w-3 h-3 text-slate-400" />
                            DOCKER
                          </span>
                        )}

                        <span className="font-bold text-foreground text-sm tracking-tight font-sans">
                          {cleanName}
                        </span>

                        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 select-all">
                          {container.id.slice(0, 12)}
                        </span>

                        {getStateBadge(container.state)}
                      </div>

                      {/* Portas Mapeadas com Pills Interativas */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {parsePortLinks(container.ports).length > 0 ? (
                          parsePortLinks(container.ports).map((p, idx) => (
                            <a
                              key={idx}
                              href={`http://localhost:${p.hostPort}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Abrir http://localhost:${p.hostPort} (${p.containerPort}/${p.protocol})`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition cursor-pointer"
                            >
                              <span>{p.hostPort}→{p.containerPort}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ))
                        ) : container.ports ? (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                            {container.ports}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Linha 2: Barra de Imagem e Métricas de Recursos (Micro-Gauges) */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/70 font-mono">
                      <div className="text-[11px] text-muted-foreground truncate max-w-lg flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 select-none">IMG:</span>
                        <span className="text-foreground/90 truncate">{container.image}</span>
                        <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                        <span className="text-muted-foreground/70 text-[10px] hidden sm:inline">{container.status}</span>
                      </div>

                      {/* Medidores de CPU e Memória */}
                      {isRunning && stats && (
                        <div className="flex items-center gap-4 shrink-0 flex-wrap" data-tour="container-stats">
                          {/* CPU Gauge */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-sky-400" /> CPU
                            </span>
                            <div className="w-16 bg-background/80 h-1.5 rounded-full overflow-hidden border border-border/60">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  cpuPercNumber > 80
                                    ? 'bg-rose-500'
                                    : cpuPercNumber > 50
                                    ? 'bg-amber-500'
                                    : 'bg-sky-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(4, cpuPercNumber))}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono tabular-nums text-foreground font-semibold min-w-[36px] text-right">
                              {stats.cpu}
                            </span>
                          </div>

                          {/* RAM Gauge */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Activity className="w-3 h-3 text-purple-400" /> MEM
                            </span>
                            <div className="w-16 bg-background/80 h-1.5 rounded-full overflow-hidden border border-border/60">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  memPercNumber > 85
                                    ? 'bg-rose-500'
                                    : memPercNumber > 60
                                    ? 'bg-amber-500'
                                    : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(4, memPercNumber))}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono tabular-nums text-foreground font-semibold">
                              {stats.mem}
                            </span>
                          </div>

                          {/* Net I/O */}
                          {stats.netIO && stats.netIO !== '0B' && (
                            <span className="text-[10px] text-muted-foreground/80 hidden xl:inline">
                              NET: {stats.netIO}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Linha 3: Barra de Ações Dividida (Ferramentas de Runtime + Ciclo de Vida) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60" data-tour="container-actions">
                      {/* Lado Esquerdo: Ferramentas do Runtime WinThor */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Ferramentas Oracle */}
                        {isOracle && isRunning && (
                          <button
                            onClick={() => {
                              setOracleModalContainer(container);
                              setOracleHealthOutput('');
                              setOracleHealthSuccess(null);
                              setDpOutput('');
                              setDpSuccess(null);
                              loadAvailableDumps();
                            }}
                            title="Ferramentas Especializadas Oracle (db_health, SQL*Plus, Data Pump, TNS)"
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Database className="w-3.5 h-3.5 text-orange-500" />
                            <span>Ferramentas Oracle</span>
                          </button>
                        )}

                        {/* Atalho TNS */}
                        {isOracle && (
                          <button
                            onClick={() => {
                              const port = extractOraclePort(container.ports);
                              copyLogsToClipboard(getOracleTnsConfig(port), `tns-${container.id}`);
                            }}
                            title="Copiar bloco de conexão do tnsnames.ora para este container"
                            className="flex items-center space-x-1 px-2 py-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Network className="w-3 h-3 text-orange-400" />
                            <span>{copyFeedback === `tns-${container.id}` ? 'TNS Copiado!' : 'Copiar TNS'}</span>
                          </button>
                        )}

                        {/* Utilitários WTA */}
                        {isWta && (
                          <button
                            onClick={() => setWtaModalContainer(container)}
                            title="Utilitários WTA (Portal, Instalador, Console Karaf, Modo Desenvolvedor)"
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Globe className="w-3.5 h-3.5 text-cyan-500" />
                            <span>Utilitários WTA</span>
                          </button>
                        )}

                        {/* Utilitários WSH */}
                        {isWsh && (
                          <button
                            onClick={() => {
                              setWshModalContainer(container);
                              loadWshPrereqs();
                            }}
                            title="Utilitários Especializados WSH (Gerador MD5, Checagem de /opt, Rotina 2650)"
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Key className="w-3.5 h-3.5 text-violet-500" />
                            <span>Utilitários WSH</span>
                          </button>
                        )}
                      </div>

                      {/* Lado Direito: Controles Táticos de Ciclo de Vida */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                        {/* Inspecionar */}
                        <button
                          onClick={() => handleInspectContainer(container)}
                          disabled={isLoadingInspect}
                          title="Inspecionar Detalhes (docker inspect)"
                          className="p-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg transition cursor-pointer active:scale-95"
                        >
                          <Info className="w-3.5 h-3.5 text-primary" />
                        </button>

                        {isRunning ? (
                          <>
                            <button
                              onClick={() => handleContainerAction(container, 'stop')}
                              disabled={Boolean(isLoadingAction)}
                              title="Parar Container"
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>Parar</span>
                            </button>
                            <button
                              onClick={() => handleTogglePause(container)}
                              title={container.state === 'paused' ? 'Despausar Container' : 'Pausar Container'}
                              className="p-1.5 bg-card hover:bg-muted text-amber-400 border border-amber-500/30 rounded-lg transition cursor-pointer active:scale-98"
                            >
                              {container.state === 'paused' ? (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
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

                        {/* Terminal */}
                        {isRunning && (
                          <button
                            data-tour="container-terminal"
                            onClick={() => handleOpenTerminal(container)}
                            disabled={Boolean(isOpeningTerminal[container.id])}
                            title="Abrir terminal interativo do container (bash)"
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>{isOpeningTerminal[container.id] ? 'Abrindo...' : 'Terminal'}</span>
                          </button>
                        )}

                        {/* Logs */}
                        <button
                          data-tour="container-logs"
                          onClick={() => handleOpenLogs(container)}
                          title="Inspecionar Logs"
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
                        >
                          <Terminal className="w-3.5 h-3.5 text-primary" />
                          <span>Logs</span>
                        </button>

                        {/* Remover */}
                        <button
                          onClick={() => handleContainerAction(container, 'remove')}
                          disabled={Boolean(isLoadingAction)}
                          title="Remover Container"
                          className="p-1.5 hover:text-rose-400 text-muted-foreground rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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

              <div className="flex items-center space-x-1.5 flex-wrap">
                {/* Busca / Filtro nos logs */}
                <div className="relative hidden sm:block">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Filtrar linhas..."
                    className="bg-muted/70 border border-border/80 rounded-lg pl-6 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28 md:w-36 font-mono text-[10px]"
                  />
                </div>

                {/* Auto-Refresh Live (3s) */}
                <button
                  type="button"
                  onClick={() => setIsLogAutoRefresh(!isLogAutoRefresh)}
                  title={isLogAutoRefresh ? 'Desativar auto-refresh (a cada 3s)' : 'Ativar auto-refresh a cada 3s'}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isLogAutoRefresh
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLogAutoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'}`} />
                  <span className="hidden md:inline">Live</span>
                </button>

                {/* Toggle Quebra de Linha */}
                <button
                  type="button"
                  onClick={() => setIsLogWrap(!isLogWrap)}
                  title={isLogWrap ? 'Desativar quebra de linha' : 'Ativar quebra de linha'}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isLogWrap
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
                  }`}
                >
                  <WrapText className="w-3.5 h-3.5" />
                </button>

                {/* Baixar Logs */}
                <button
                  type="button"
                  onClick={handleDownloadLogs}
                  title="Baixar logs como arquivo .log"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/70 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

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
                  onClick={() => handleRefreshLogs(true)}
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
            <div className={`flex-1 bg-[#090D14] p-4 overflow-auto font-mono text-[11px] text-zinc-200 select-text leading-relaxed [scrollbar-width:thin] ${isLogWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}>
              {isLoadingLogs ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs space-x-2">
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando logs do container...</span>
                </div>
              ) : (
                (() => {
                  if (!logSearchQuery.trim()) return logs;
                  const query = logSearchQuery.toLowerCase();
                  const filtered = logs.split('\n').filter((l) => l.toLowerCase().includes(query));
                  return filtered.length > 0 ? filtered.join('\n') : `(Nenhuma linha corresponde ao filtro "${logSearchQuery}")`;
                })()
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
              {/* Presets Rápidos de Ambiente */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Presets de Ambiente
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEnvPresetType('doc');
                      if (!newEnvName || newEnvName === 'WinThor Dev (INFR-Docker)') setNewEnvName('WinThor Local (Doc Oficial)');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      envPresetType === 'doc'
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <div className="font-semibold truncate">Doc Oficial</div>
                    <div className="text-[10px] text-muted-foreground truncate">oracle-local, wta-local</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEnvPresetType('infr');
                      if (!newEnvName || newEnvName === 'WinThor Local (Doc Oficial)') setNewEnvName('WinThor Dev (INFR-Docker)');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      envPresetType === 'infr'
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <div className="font-semibold truncate">INFR-Docker</div>
                    <div className="text-[10px] text-muted-foreground truncate">oracle-winthor, linux...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvPresetType('current')}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      envPresetType === 'current'
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <div className="font-semibold truncate">Detectados</div>
                    <div className="text-[10px] text-muted-foreground truncate">{containers.length} containers</div>
                  </button>
                </div>
              </div>

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
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Sequência de inicialização:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                    {envPresetType === 'doc' ? 'Doc Oficial (30s / 10s)' : envPresetType === 'infr' ? 'INFR-Docker (45s / 15s)' : 'Customizado'}
                  </span>
                </div>
                {envPresetType === 'doc' ? (
                  <>
                    <div>• 1. <strong className="text-foreground">oracle-local</strong> (Delay: 30s de warm-up)</div>
                    <div>• 2. <strong className="text-foreground">wta-local</strong> (Delay: 10s)</div>
                    <div>• 3. <strong className="text-foreground">wsh-local</strong></div>
                  </>
                ) : envPresetType === 'infr' ? (
                  <>
                    <div>• 1. <strong className="text-foreground">oracle-winthor</strong> (Delay: 45s de warm-up)</div>
                    <div>• 2. <strong className="text-foreground">linux-winthor</strong> (Delay: 15s)</div>
                    <div>• 3. <strong className="text-foreground">wsh-winthor</strong></div>
                  </>
                ) : (
                  <>
                    <div>• 1. Oracle ({containers.find((c) => c.names.toLowerCase().includes('oracle'))?.names.replace(/^\//, '') || 'oracle-local'}, 30s)</div>
                    <div>• 2. WTA ({containers.find((c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor'))?.names.replace(/^\//, '') || 'wta-local'}, 10s)</div>
                    {containers.some((c) => c.names.toLowerCase().includes('wsh')) && (
                      <div>• 3. WSH ({containers.find((c) => c.names.toLowerCase().includes('wsh'))?.names.replace(/^\//, '')})</div>
                    )}
                  </>
                )}
                {selectedDistro && <div className="text-sky-600 dark:text-sky-400 pt-0.5">• Vinculado à distro WSL: {selectedDistro}</div>}
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

      {/* Modal de Confirmação de Exclusão de Ambiente */}
      {envToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Excluir Ambiente</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tem certeza que deseja excluir o ambiente{' '}
                  <span className="font-semibold text-foreground">{envToDelete.name}</span>? Esta ação não pode ser
                  desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setEnvToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const target = envToDelete;
                  setEnvToDelete(null);
                  if (target) await handleDeleteEnvironment(target.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Ambiente</span>
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
                onClick={() => {
                  setOracleActiveTab('datapump');
                  loadAvailableDumps();
                }}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  oracleActiveTab === 'datapump'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Importar Dump (Data Pump)</span>
              </button>

              <button
                onClick={() => setOracleActiveTab('tns')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  oracleActiveTab === 'tns'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Conexão TNS (tnsnames.ora)</span>
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
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        <strong className="text-foreground font-semibold block mb-0.5">Automação de Importação Data Pump (impdp)</strong>
                        Importa arquivos posicionados no diretório compartilhado <code className="text-foreground font-mono">/opt/dumps</code>. Executa <code className="text-foreground font-mono">table_exists_action=REPLACE</code>, roda o script <code className="text-foreground font-mono">winthor_pos_import.sql</code> e coleta estatísticas de schema.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenDumpsFolder}
                      disabled={isOpeningDumpsFolder}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-98"
                      title="Abre a pasta \\wsl$\distro\opt\dumps no Windows Explorer para copiar dumps"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isOpeningDumpsFolder ? 'Abrindo...' : 'Abrir /opt/dumps no Explorer'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block">Arquivo Dump (.dmp)</label>
                        <button
                          type="button"
                          onClick={() => loadAvailableDumps()}
                          disabled={isLoadingDumps}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition"
                          title="Atualizar lista de dumps encontrados em /opt/dumps"
                        >
                          <RotateCw className={`w-2.5 h-2.5 ${isLoadingDumps ? 'animate-spin text-primary' : ''}`} />
                          <span>{isLoadingDumps ? 'Buscando...' : 'Atualizar Dumps'}</span>
                        </button>
                      </div>

                      {availableDumps.length > 0 && (
                        <div className="mb-1.5">
                          <select
                            value={availableDumps.some((d) => d.name === dpDumpfile) ? dpDumpfile : ''}
                            onChange={(e) => {
                              if (e.target.value) setDpDumpfile(e.target.value);
                            }}
                            className="w-full bg-muted/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="" disabled>Selecionar dump de /opt/dumps ({availableDumps.length} detectados)...</option>
                            {availableDumps.map((d) => (
                              <option key={d.name} value={d.name}>
                                {d.name} ({d.formattedSize})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <input
                        type="text"
                        value={dpDumpfile}
                        onChange={(e) => setDpDumpfile(e.target.value)}
                        placeholder="ex: backup.dmp"
                        className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Pasta WSL: <code className="font-mono text-foreground font-semibold">/opt/dumps</code> ↔ Container: <code className="font-mono text-foreground">/home/oracle/dumps</code>.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block">CODCLIPC (Cliente WinThor)</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDpCodclipc('-999')}
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono cursor-pointer transition ${
                              dpCodclipc === '-999'
                                ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                            title="Código padrão TOTVS para desenvolvimento (-999)"
                          >
                            -999 (TOTVS)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDpCodclipc('9999')}
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono cursor-pointer transition ${
                              dpCodclipc === '9999'
                                ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                            title="Código legado comum (9999)"
                          >
                            9999
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={dpCodclipc}
                        onChange={(e) => setDpCodclipc(e.target.value)}
                        placeholder="-999"
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

              {/* TAB 4: CONEXÃO TNS (tnsnames.ora) */}
              {oracleActiveTab === 'tns' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <Network className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Atalho de Conexão TNS (Oracle Database 11g XE)</strong>
                      Adicione este bloco ao seu arquivo <code className="text-foreground font-mono">tnsnames.ora</code> para conectar ferramentas de desenvolvimento (PL/SQL Developer, DBeaver, DFe, WTA, Rotinas WinThor) ao banco local via TCP nativo.
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <span>Bloco de Configuração (tnsnames.ora)</span>
                      </span>
                      <button
                        onClick={() => {
                          const port = extractOraclePort(oracleModalContainer?.ports);
                          copyLogsToClipboard(getOracleTnsConfig(port), 'oracle-tns-modal');
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copyFeedback === 'oracle-tns-modal' ? 'Copiado!' : 'Copiar Bloco TNS'}</span>
                      </button>
                    </div>

                    <pre className="bg-[#090D14] p-3.5 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
{getOracleTnsConfig(extractOraclePort(oracleModalContainer?.ports))}
                    </pre>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground">
                      <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                        <span className="font-semibold text-foreground block mb-0.5">Localização típica no Windows:</span>
                        <code className="font-mono text-[10px] break-all text-foreground/80">C:\oracle\product\...\network\admin\tnsnames.ora</code>
                      </div>
                      <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                        <span className="font-semibold text-foreground block mb-0.5">Credenciais Padrão (INFR-Docker):</span>
                        <div className="font-mono text-[10px] text-foreground/80">DBA: <span className="text-foreground font-bold">system</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
                        <div className="font-mono text-[10px] text-foreground/80">SYSDBA: <span className="text-foreground font-bold">sys</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
                      </div>
                    </div>
                  </div>
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

      {/* Modal de Utilitários Especializados WSH (Winthor Smart Hub) */}
      {wshModalContainer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span>Utilitários WSH — {wshModalContainer.names.replace(/^\//, '')}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
                      Winthor Smart Hub
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Criptografia MD5 de senha, checagem de pré-requisitos em /opt e suporte à Rotina 2650
                  </p>
                </div>
              </div>

              <button
                onClick={() => setWshModalContainer(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex items-center px-5 pt-2 border-b border-border/80 bg-muted/10 gap-2">
              <button
                onClick={() => setWshActiveTab('md5')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wshActiveTab === 'md5'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Gerador de Senha MD5</span>
              </button>

              <button
                onClick={() => {
                  setWshActiveTab('files');
                  loadWshPrereqs();
                }}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wshActiveTab === 'files'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Arquivos em /opt WSL</span>
              </button>

              <button
                onClick={() => setWshActiveTab('rotina2650')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wshActiveTab === 'rotina2650'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Guia da Rotina 2650</span>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* ABA 1: GERADOR MD5 */}
              {wshActiveTab === 'md5' && (
                <div className="space-y-4">
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Por que o MD5 é obrigatório no WSH?</strong>
                      O WSH valida a conexão com o banco comparando o hash MD5 da senha com o configurado no <code className="text-foreground font-mono">Winthor.ini</code>. No arquivo <code className="text-foreground font-mono">.env</code>, o parâmetro <code className="text-foreground font-mono">DB_PASSWORD</code> deve ser <strong>obrigatoriamente o hash MD5 em letras maiúsculas</strong>.
                    </div>
                  </div>

                  <div className="space-y-3 bg-card border border-border/80 rounded-xl p-4">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Senha em Texto Plano
                      </label>
                      <input
                        type="text"
                        value={wshPlainPass}
                        onChange={(e) => setWshPlainPass(e.target.value)}
                        placeholder="Ex: pcinfo, 123456, totvs"
                        className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* MD5 Maiúsculo */}
                      <div className="p-3 bg-muted/40 rounded-xl border border-violet-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>MD5 Maiúsculo (WSH .env)</span>
                          </span>
                          <button
                            onClick={() => copyLogsToClipboard(wshMd5Upper, 'md5-upper')}
                            disabled={!wshMd5Upper}
                            className="text-[10px] px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer disabled:opacity-50"
                          >
                            {copyFeedback === 'md5-upper' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <div className="font-mono text-xs text-foreground font-bold break-all select-all bg-background p-2 rounded-lg border border-border/60">
                          {wshMd5Upper || '—'}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Utilize para a variável <code className="text-foreground font-mono">DB_PASSWORD</code> no arquivo <code className="text-foreground font-mono">.env</code>.
                        </p>
                      </div>

                      {/* MD5 Minúsculo */}
                      <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            MD5 Minúsculo (Padrão Linux)
                          </span>
                          <button
                            onClick={() => copyLogsToClipboard(wshMd5Lower, 'md5-lower')}
                            disabled={!wshMd5Lower}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer disabled:opacity-50"
                          >
                            {copyFeedback === 'md5-lower' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <div className="font-mono text-xs text-foreground break-all select-all bg-background p-2 rounded-lg border border-border/60">
                          {wshMd5Lower || '—'}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Padrão gerado por <code className="text-foreground font-mono">echo -n "{wshPlainPass}" | md5sum</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: ARQUIVOS EM /OPT WSL */}
              {wshActiveTab === 'files' && (
                <div className="space-y-4">
                  <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        <strong className="text-foreground font-semibold block mb-0.5">Diretório Compartilhado /opt (WSL)</strong>
                        O container WSH monta o JAR e o Winthor.ini diretamente de <code className="text-foreground font-mono">/opt</code>. Se esses arquivos não estiverem lá, o container não iniciará.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenOptFolder}
                      disabled={isOpeningOptFolder}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-98"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isOpeningOptFolder ? 'Abrindo...' : 'Abrir /opt no Explorer'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
                      <span>Status dos Arquivos Necessários</span>
                      <button
                        onClick={loadWshPrereqs}
                        disabled={isLoadingWshPrereqs}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className={`w-3 h-3 ${isLoadingWshPrereqs ? 'animate-spin text-primary' : ''}`} />
                        <span>Reverificar</span>
                      </button>
                    </div>

                    {wshPrereqs.map((prereq) => (
                      <div
                        key={prereq.file}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                          prereq.exists
                            ? 'bg-emerald-500/5 border-emerald-500/25 text-foreground'
                            : prereq.required
                            ? 'bg-rose-500/5 border-rose-500/30 text-foreground'
                            : 'bg-muted/40 border-border/80 text-muted-foreground'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs font-mono">{prereq.file}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                                prereq.exists
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : prereq.required
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {prereq.exists ? 'Presente' : prereq.required ? 'Obrigatório Ausente' : 'Opcional Ausente'}
                            </span>
                            {prereq.size && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ({prereq.formattedSize})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {prereq.description}
                          </p>
                        </div>

                        {!prereq.exists && (
                          <button
                            onClick={handleOpenOptFolder}
                            className="px-2.5 py-1 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
                          >
                            Copiar para cá
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 3: ROTINA 2650 */}
              {wshActiveTab === 'rotina2650' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">Configuração da Rotina 2650 no WinThor</strong>
                      A Rotina 2650 cadastra o endereço do WinThor Server Hub (WSH) no ERP para permitir a emissão de notas fiscais, sincronização com mobile e integrações REST.
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>Valores Recomendados para Ambiente Local/Dev:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">URL de Conexão WSH</span>
                        <div className="font-mono text-xs font-bold text-foreground flex items-center justify-between">
                          <span>http://localhost:8080/</span>
                          <button
                            onClick={() => copyLogsToClipboard('http://localhost:8080/', 'wsh-url')}
                            className="text-[10px] text-primary hover:underline cursor-pointer"
                          >
                            {copyFeedback === 'wsh-url' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">Nome do Serviço</span>
                        <div className="font-mono text-xs font-bold text-foreground">
                          WSH LOCAL DOCKER
                        </div>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">Porta Padrão</span>
                        <div className="font-mono text-xs font-bold text-foreground">
                          8080 (mapeada no host)
                        </div>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">Validação de Conexão</span>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Clique em "Testar Conexão" na rotina
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 rounded-lg border border-border/40 text-[11px] text-muted-foreground space-y-1">
                      <strong className="text-foreground block mb-0.5">Dica Importante:</strong>
                      Se a rotina relatar falha de comunicação, verifique se o container <code className="text-foreground font-mono">wsh-winthor</code> (ou <code className="text-foreground font-mono">wsh-local</code>) está com status <strong>running</strong> e se a porta 8080 não está ocupada por outra aplicação.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                Interoperabilidade WSH WinThor ERP
              </span>

              <button
                onClick={() => setWshModalContainer(null)}
                className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Utilitários Especializados WTA (Apache Karaf / Portal / Dev Mode) - Parte 6 */}
      {wtaModalContainer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span>Utilitários WTA — {wtaModalContainer.names.replace(/^\//, '')}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      Apache Karaf
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Portal Web, Instalador, Console Karaf (/opt/pcsist) e Modo Desenvolvedor
                  </p>
                </div>
              </div>

              <button
                onClick={() => setWtaModalContainer(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
              <button
                onClick={() => setWtaActiveTab('access')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wtaActiveTab === 'access'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Portais & Acesso Rápido</span>
              </button>

              <button
                onClick={() => setWtaActiveTab('karaf')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wtaActiveTab === 'karaf'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console Karaf & Portas</span>
              </button>

              <button
                onClick={() => setWtaActiveTab('dev')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  wtaActiveTab === 'dev'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Modo Desenvolvedor (~/.m2)</span>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
              {/* ABA 1: PORTAIS E ACESSO RÁPIDO */}
              {wtaActiveTab === 'access' && (
                <div className="space-y-4">
                  {/* Banner Explicativo */}
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">
                        Acesso Web ao WinThor Anywhere (WTA)
                      </strong>
                      Após a subida do container, o Apache Karaf inicia os bundles OSGi e publica os portais web na porta configurada (padrão <code className="text-foreground font-mono">8080</code>).
                    </div>
                  </div>

                  {/* Links dos Portais */}
                  {(() => {
                    const port = extractWtaPort(wtaModalContainer.ports);
                    const portalUrl = `http://localhost:${port}/wta/`;
                    const installerUrl = `http://localhost:${port}/instalador`;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-cyan-500" />
                              <span>Portal WTA</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              Porta {port}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-background p-2 rounded-lg border border-border/60 break-all select-all">
                            {portalUrl}
                          </div>
                          <button
                            type="button"
                            onClick={() => window.electronAPI?.openExternal?.(portalUrl)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir Portal no Navegador</span>
                          </button>
                        </div>

                        <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-amber-500" />
                              <span>Instalador WTA</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              /instalador
                            </span>
                          </div>
                          <div className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-background p-2 rounded-lg border border-border/60 break-all select-all">
                            {installerUrl}
                          </div>
                          <button
                            type="button"
                            onClick={() => window.electronAPI?.openExternal?.(installerUrl)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir Instalador no Navegador</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Credenciais Padrão */}
                  <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        <span>Credenciais Padrão do WTA</span>
                      </span>
                      <button
                        onClick={() => copyLogsToClipboard('PCADMIN\t1', 'wta-creds')}
                        className="text-[10px] px-2 py-0.5 rounded bg-card hover:bg-muted text-foreground border border-border/80 font-medium transition cursor-pointer"
                      >
                        {copyFeedback === 'wta-creds' ? 'Copiado!' : 'Copiar Credenciais'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-background rounded-lg border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Usuário</span>
                        <div className="font-mono text-xs font-bold text-foreground">PCADMIN</div>
                      </div>
                      <div className="p-2.5 bg-background rounded-lg border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Senha</span>
                        <div className="font-mono text-xs font-bold text-foreground">1</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CONSOLE KARAF & PORTAS */}
              {wtaActiveTab === 'karaf' && (
                <div className="space-y-4">
                  {/* Botão de Disparo do Console Karaf */}
                  <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-cyan-500" />
                          <span>Console Interativo Karaf Client</span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Abre terminal interativo executando <code className="text-foreground font-mono">/opt/pcsist/apache-karaf/bin/client</code> dentro do container
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenKarafClient(wtaModalContainer.names)}
                        disabled={isOpeningKarafClient}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{isOpeningKarafClient ? 'Abrindo Console...' : 'Abrir Console Karaf'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Portas do WTA */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-foreground px-1 block">
                      Mapeamento das Portas Padrão do Apache Karaf
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">HTTP Web</span>
                        <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">8080</div>
                        <p className="text-[10px] text-muted-foreground">Portal & APIs</p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">SSH Karaf</span>
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">8101</div>
                        <p className="text-[10px] text-muted-foreground">user/pass: karaf</p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">JMX RMI</span>
                        <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">1099</div>
                        <p className="text-[10px] text-muted-foreground">Monitoramento</p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Artemis JMS</span>
                        <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">61616</div>
                        <p className="text-[10px] text-muted-foreground">Broker de Filas</p>
                      </div>
                    </div>
                  </div>

                  {/* Comandos Úteis */}
                  <div className="p-3.5 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 space-y-1">
                    <div className="text-muted-foreground text-[10px] font-sans font-semibold mb-1">
                      Comandos frequentes no console Karaf:
                    </div>
                    <div>bundle:list | grep -i winthor <span className="text-muted-foreground font-sans text-[10px]"># Lista bundles WinThor</span></div>
                    <div>bundle:diag &lt;id&gt; <span className="text-muted-foreground font-sans text-[10px]"># Diagnóstico de falha de resolução</span></div>
                    <div>log:tail <span className="text-muted-foreground font-sans text-[10px]"># Acompanha logs do Karaf em tempo real</span></div>
                  </div>
                </div>
              )}

              {/* ABA 3: MODO DESENVOLVEDOR */}
              {wtaActiveTab === 'dev' && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">
                        Modo Desenvolvedor: Montagem do Cache ~/.m2
                      </strong>
                      O container WTA monta o diretório de dependências Maven do host (<code className="text-foreground font-mono">~/.m2/repository</code>) diretamente em <code className="text-foreground font-mono">/root/.m2/repository</code>. Assim, qualquer JAR gerado via <code className="text-foreground font-mono">mvn install</code> no host fica imediatamente acessível pelo Karaf.
                    </div>
                  </div>

                  <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Variáveis do arquivo wta.env (Modelo Oficial)</span>
                      <button
                        onClick={() =>
                          copyLogsToClipboard(
                            'DB_HOST=172.17.0.1\nDB_PORT=1521\nDB_SERVICE=XE\nDB_USER=LOCAL\nDB_PASSWORD=pcinfo\n',
                            'wta-env-sample'
                          )
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer"
                      >
                        {copyFeedback === 'wta-env-sample' ? 'Copiado!' : 'Copiar Modelo wta.env'}
                      </button>
                    </div>

                    <pre className="bg-[#090D14] p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
DB_HOST=172.17.0.1
DB_PORT=1521
DB_SERVICE=XE
DB_USER=LOCAL
DB_PASSWORD=pcinfo
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                Interoperabilidade WTA INFR-Docker
              </span>

              <button
                onClick={() => setWtaModalContainer(null)}
                className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Snapshots WSL (.tar) - Parte 7 */}
      {isSnapshotsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span>Snapshots WSL (.tar)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      WSL2 Backup & Restore
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Importação de distros a partir de snapshots .tar (ex: ubuntu2604-winthor-26-07-22.tar) e exportação de backups
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSnapshotsModalOpen(false);
                  setSnapshotFeedback(null);
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Alert */}
            {snapshotFeedback && (
              <div
                className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  snapshotFeedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {snapshotFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{snapshotFeedback.message}</span>
                </div>
                <button
                  onClick={() => setSnapshotFeedback(null)}
                  className="p-1 hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto p-5 space-y-5 [scrollbar-width:thin]">
              {/* Barra de Configuração de Diretório de Busca */}
              <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Diretório de Snapshots (.tar)</span>
                  </span>
                  <button
                    onClick={() => loadSnapshots()}
                    disabled={isLoadingSnapshots}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSnapshots ? 'animate-spin text-primary' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={snapshotsDirInput}
                    onChange={(e) => setSnapshotsDirInput(e.target.value)}
                    placeholder="Ex: C:\Users\wanderson.alves\projetosTOTV ou C:\Docker"
                    className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleSaveSnapshotsDir(snapshotsDirInput)}
                    className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 shrink-0"
                  >
                    Salvar Pasta
                  </button>
                </div>
              </div>

              {/* Lista de Snapshots Encontrados */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-foreground">
                    Snapshots .tar Disponíveis ({snapshotsList.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Arquivos .tar encontrados nos diretórios do sistema
                  </span>
                </div>

                {isLoadingSnapshots ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Buscando arquivos de snapshot...</span>
                  </div>
                ) : snapshotsList.length === 0 ? (
                  <div className="p-4 bg-muted/20 border border-dashed border-border/80 rounded-xl text-center text-xs text-muted-foreground">
                    Nenhum arquivo .tar encontrado nos diretórios configurados.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshotsList.map((snap) => (
                      <div
                        key={snap.path}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                          snapshotImportTarPath === snap.path
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-card border-border/80 hover:border-border'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Archive className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-bold text-xs font-mono text-foreground truncate" title={snap.name}>
                              {snap.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                              {snap.formattedSize}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate" title={snap.path}>
                            {snap.path}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSnapshotImportTarPath(snap.path);
                            // Sugere nome da distro baseado no nome do arquivo
                            const cleanDistro = snap.name
                              .replace(/\.tar$/i, '')
                              .replace(/-\d{2}-\d{2}-\d{2}$/, '');
                            setSnapshotImportName(cleanDistro || 'ubuntu2604-winthor');
                            setSnapshotImportInstallDir(`C:\\WSL\\${cleanDistro || 'ubuntu2604-winthor'}`);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer shrink-0 ${
                            snapshotImportTarPath === snap.path
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card hover:bg-muted text-foreground border-border/80'
                          }`}
                        >
                          {snapshotImportTarPath === snap.path ? 'Selecionado' : 'Selecionar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel de Importação Rápida (wsl --import) */}
              <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                  <span>Importar Snapshot Selecionado (wsl --import)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Nome da Distro a Criar
                    </label>
                    <input
                      type="text"
                      value={snapshotImportName}
                      onChange={(e) => setSnapshotImportName(e.target.value)}
                      placeholder="Ex: ubuntu2604-winthor"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Diretório de Instalação (VHDX)
                    </label>
                    <input
                      type="text"
                      value={snapshotImportInstallDir}
                      onChange={(e) => setSnapshotImportInstallDir(e.target.value)}
                      placeholder="Ex: C:\WSL\ubuntu2604-winthor"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Caminho do Arquivo .tar
                  </label>
                  <input
                    type="text"
                    value={snapshotImportTarPath}
                    onChange={(e) => setSnapshotImportTarPath(e.target.value)}
                    placeholder="Selecione na lista acima ou informe o caminho completo"
                    className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Executa <code className="text-foreground font-mono">wsl --shutdown</code> e em seguida <code className="text-foreground font-mono">wsl --import</code>
                  </span>

                  <button
                    onClick={handleImportSnapshot}
                    disabled={snapshotImporting || !snapshotImportTarPath.trim() || !snapshotImportName.trim()}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {snapshotImporting ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{snapshotImporting ? 'Importando Snapshot (Aguarde)...' : 'Importar Distro WSL'}</span>
                  </button>
                </div>
              </div>

              {/* Painel de Exportação e Remoção de Distros WSL */}
              <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Exportar Backup ou Desregistrar Distro Existente</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Distro de Origem
                    </label>
                    <select
                      value={snapshotExportDistro}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSnapshotExportDistro(val);
                        if (val) {
                          setSnapshotExportPath(`C:\\WSL\\snapshots\\${val}-backup.tar`);
                        }
                      }}
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Selecione a distro WSL...</option>
                      {availableDistros.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} ({d.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Caminho do .tar de Destino
                    </label>
                    <input
                      type="text"
                      value={snapshotExportPath}
                      onChange={(e) => setSnapshotExportPath(e.target.value)}
                      placeholder="Ex: C:\WSL\snapshots\backup.tar"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Desregistrar */}
                  {snapshotExportDistro && (
                    <button
                      onClick={() => handleUnregisterDistro(snapshotExportDistro)}
                      disabled={snapshotUnregistering === snapshotExportDistro}
                      title="Exclui definitivamente esta distro e seu disco virtual"
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{snapshotUnregistering === snapshotExportDistro ? 'Removendo...' : `Desregistrar "${snapshotExportDistro}"`}</span>
                    </button>
                  )}

                  {/* Exportar */}
                  <button
                    onClick={handleExportSnapshot}
                    disabled={snapshotExporting || !snapshotExportDistro || !snapshotExportPath.trim()}
                    className="ml-auto flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {snapshotExporting ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{snapshotExporting ? 'Exportando Backup...' : 'Exportar Snapshot (.tar)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Compatível com Container Manager & WSL2 Nativo
              </span>

              <button
                onClick={() => {
                  setIsSnapshotsModalOpen(false);
                  setSnapshotFeedback(null);
                }}
                className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assistente de Bootstrap INFR-Docker - Parte 8 */}
      {isInfrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span>Assistente de Bootstrap INFR-Docker</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      Scripts Oficiais
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Automação guiada de criação e setup dos containers Oracle XE 11g, WTA e WSH
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsInfrModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
              <button
                onClick={() => setInfrActiveTab('oracle')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  infrActiveTab === 'oracle'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>1. Setup Oracle XE</span>
              </button>

              <button
                onClick={() => setInfrActiveTab('wta')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  infrActiveTab === 'wta'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>2. Setup WTA</span>
              </button>

              <button
                onClick={() => setInfrActiveTab('wsh')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  infrActiveTab === 'wsh'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>3. Setup WSH</span>
              </button>

              <button
                onClick={() => {
                  setInfrActiveTab('scripts');
                  loadInfrScripts();
                }}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  infrActiveTab === 'scripts'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Status dos Scripts</span>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
              {/* ABA 1: SETUP ORACLE XE */}
              {infrActiveTab === 'oracle' && (
                <div className="space-y-4">
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">
                        Setup Automatizado do Oracle XE 11g
                      </strong>
                      Executa <code className="text-foreground font-mono">oracle_setup.sh</code> na pasta <code className="text-foreground font-mono">oracle-winthor</code>. Cria o container, monta volumes de persistência e inicia o listener na porta especificada.
                    </div>
                  </div>

                  <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Nome do Container Oracle
                        </label>
                        <input
                          type="text"
                          value={infrOracleContainer}
                          onChange={(e) => setInfrOracleContainer(e.target.value)}
                          placeholder="oracle-winthor"
                          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Porta Externa do Host
                        </label>
                        <input
                          type="number"
                          value={infrOraclePort}
                          onChange={(e) => setInfrOraclePort(parseInt(e.target.value, 10) || 1521)}
                          placeholder="1521"
                          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                      ./oracle_setup.sh --container {infrOracleContainer || 'oracle-winthor'} --port {infrOraclePort || 1521}
                    </div>

                    <button
                      onClick={() => handleRunInfrScript('oracle')}
                      disabled={isExecutingInfr}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isExecutingInfr ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup Oracle XE'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 2: SETUP WTA */}
              {infrActiveTab === 'wta' && (
                <div className="space-y-4">
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">
                        Setup Automatizado do WinThor Anywhere (WTA)
                      </strong>
                      Executa <code className="text-foreground font-mono">wta_setup.sh</code> na pasta <code className="text-foreground font-mono">linux-winthor/scripts</code>. Cria o container do WTA, mapeia a porta HTTP (8080) e as portas do Karaf (8101, 1099, 61616).
                    </div>
                  </div>

                  <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Nome do Container WTA
                        </label>
                        <input
                          type="text"
                          value={infrWtaContainer}
                          onChange={(e) => setInfrWtaContainer(e.target.value)}
                          placeholder="linux-winthor"
                          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Porta Web Externa
                        </label>
                        <input
                          type="number"
                          value={infrWtaPort}
                          onChange={(e) => setInfrWtaPort(parseInt(e.target.value, 10) || 8080)}
                          placeholder="8080"
                          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                      ./wta_setup.sh --container {infrWtaContainer || 'linux-winthor'} --port {infrWtaPort || 8080}
                    </div>

                    <button
                      onClick={() => handleRunInfrScript('wta')}
                      disabled={isExecutingInfr}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isExecutingInfr ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup WTA'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 3: SETUP WSH */}
              {infrActiveTab === 'wsh' && (
                <div className="space-y-4">
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground font-semibold block mb-0.5">
                        Setup Automatizado do Winthor Smart Hub (WSH)
                      </strong>
                      Executa <code className="text-foreground font-mono">wsh_setup.sh</code> na pasta <code className="text-foreground font-mono">wsh-winthor</code>. Cria o container WSH configurado com o <code className="text-foreground font-mono">Winthor.ini</code> e variáveis do <code className="text-foreground font-mono">.env</code>.
                    </div>
                  </div>

                  <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                    <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                      ./wsh_setup.sh
                    </div>

                    <button
                      onClick={() => handleRunInfrScript('wsh')}
                      disabled={isExecutingInfr}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isExecutingInfr ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup WSH'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 4: STATUS DOS SCRIPTS */}
              {infrActiveTab === 'scripts' && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground block">
                      Caminho do repositório INFR-Docker
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={infrCustomPath}
                        onChange={(e) => setInfrCustomPath(e.target.value)}
                        placeholder="C:\Users\wanderson.alves\projetosTOTV\INFR-Docker"
                        className="flex-1 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        onClick={() => loadInfrScripts(infrCustomPath)}
                        disabled={isLoadingInfrScripts}
                        className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Verificar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {infrScripts.map((s) => (
                      <div
                        key={s.script}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          s.exists ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-foreground">{s.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                                s.exists
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {s.exists ? 'Disponível' : 'Não Encontrado'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{s.description}</p>
                          <div className="text-[10px] font-mono text-muted-foreground/80 truncate">{s.path}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saída da Execução */}
              {infrOutput && (
                <div className="p-3 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 select-text whitespace-pre-wrap">
                  {infrOutput}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                Scripts INFR-Docker integrados
              </span>

              <button
                onClick={() => setIsInfrModalOpen(false)}
                className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro Inteligente com Auto-Recuperação */}
      {smartError && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  smartError.isNotInstalled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : smartError.isDaemonOffline
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}
              >
                {smartError.isNotInstalled ? (
                  <Download className="w-5 h-5" />
                ) : smartError.isDaemonOffline ? (
                  <Power className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{smartError.title}</span>
                  {smartError.distroName && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground font-normal">
                      WSL: {smartError.distroName}
                    </span>
                  )}
                </h3>
                {smartError.isNotInstalled ? (
                  <div className="space-y-1.5 mt-1.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O binário do Docker Engine (<code className="text-foreground font-mono">dockerd</code>) não está instalado na distro <strong className="text-foreground">{smartError.distroName || selectedDistro}</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Para utilizá-la com containers, instale o pacote oficial via terminal WSL:
                    </p>
                    <div className="flex items-center justify-between p-2 bg-[#090D14] rounded-lg border border-border/70 font-mono text-[11px] text-amber-400">
                      <span className="select-all">sudo apt update && sudo apt install -y docker.io</span>
                      <button
                        type="button"
                        onClick={() => copyInstallCmd('sudo apt update && sudo apt install -y docker.io', 'install-box')}
                        className="ml-2 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 text-[10px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        {installCmdFeedback === 'install-box' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : smartError.isDaemonOffline ? (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    O Docker Engine não está rodando na distro <strong className="text-foreground">{smartError.distroName || selectedDistro}</strong>.
                    Você pode iniciá-lo automaticamente agora com 1 clique.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ocorreu uma falha durante a execução do comando no container engine.
                  </p>
                )}
              </div>
            </div>

            {/* Detalhes Técnicos do Erro */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detalhes técnicos:</span>
              <pre className="max-h-36 overflow-auto bg-[#090D14] p-3 text-[11px] font-mono text-rose-400/90 rounded-xl border border-border/50 whitespace-pre-wrap select-text leading-relaxed [scrollbar-width:thin]">
                {smartError.message}
              </pre>
            </div>

            {/* Ações de Recuperação */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
              {smartError.isNotInstalled ? (
                <>
                  <button
                    type="button"
                    onClick={() => copyInstallCmd('sudo apt update && sudo apt install -y docker.io', 'install-btn')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
                  >
                    {installCmdFeedback === 'install-btn' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Comando Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Copiar Comando</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenWslTerminal(smartError.distroName)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Abrir Terminal WSL</span>
                  </button>
                </>
              ) : smartError.isDaemonOffline ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenWslTerminal(smartError.distroName)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
                  >
                    Abrir Terminal WSL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartDockerDaemon(smartError.distroName)}
                    disabled={isStartingDaemon}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isStartingDaemon ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    <span>{isStartingDaemon ? 'Iniciando Docker no WSL...' : 'Iniciar Docker no WSL'}</span>
                  </button>
                </>
              ) : null}

              {smartError.retryAction && !smartError.isDaemonOffline && !smartError.isNotInstalled && (
                <button
                  type="button"
                  onClick={async () => {
                    const retry = smartError.retryAction;
                    setSmartError(null);
                    if (retry) await retry();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Tentar Novamente
                </button>
              )}

              <button
                onClick={() => setSmartError(null)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Limpeza de Containers Parados (Prune) */}
      {showPruneConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Limpar Containers Parados</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tem certeza que deseja remover todos os <strong className="text-foreground">{stoppedCount}</strong> containers parados? Containers em execução não serão afetados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowPruneConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePruneContainers}
                disabled={isPruning}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isPruning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isPruning ? 'Limpando...' : 'Confirmar Limpeza'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inspeção Detalhada do Container (docker inspect) */}
      {inspectingContainer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[84vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header do Modal */}
            <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-card/60 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-2xs">
                  <Info className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{inspectingContainer.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground font-normal">
                      {inspectingContainer.id.slice(0, 12)}
                    </span>
                    {getStateBadge(inspectingContainer.state.status)}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-lg font-mono">
                    {inspectingContainer.image}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingContainer(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2 shrink-0">
              <button
                onClick={() => setInspectTab('general')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'general'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Visão Geral</span>
              </button>
              <button
                onClick={() => setInspectTab('network')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'network'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Rede & Portas</span>
              </button>
              <button
                onClick={() => setInspectTab('mounts')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'mounts'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Volumes ({inspectingContainer.mounts.length})</span>
              </button>
              <button
                onClick={() => setInspectTab('env')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'env'
                    ? 'border-primary text-primary bg-card shadow-2xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Variáveis ({inspectingContainer.env.length})</span>
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
              {/* TAB 1: GERAL */}
              {inspectTab === 'general' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">ID Completo</span>
                      <div className="text-xs font-mono select-all text-foreground break-all">{inspectingContainer.id}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Criado em</span>
                      <div className="text-xs text-foreground font-mono">{inspectingContainer.created || 'N/D'}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Iniciado em</span>
                      <div className="text-xs text-foreground font-mono">{inspectingContainer.state.startedAt || 'N/D'}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Plataforma</span>
                      <div className="text-xs text-foreground font-mono">{inspectingContainer.platform || 'linux/amd64'}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Política de Reinício</span>
                      <div className="text-xs text-foreground font-mono">{inspectingContainer.restartPolicy?.name || 'no'}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Diretório de Trabalho</span>
                      <div className="text-xs text-foreground font-mono">{inspectingContainer.workingDir || '/'}</div>
                    </div>
                  </div>

                  {inspectingContainer.entrypoint && inspectingContainer.entrypoint.length > 0 && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Entrypoint</span>
                      <div className="text-xs font-mono text-foreground">{inspectingContainer.entrypoint.join(' ')}</div>
                    </div>
                  )}

                  {inspectingContainer.cmd && inspectingContainer.cmd.length > 0 && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Comando (Cmd)</span>
                      <div className="text-xs font-mono text-foreground">{inspectingContainer.cmd.join(' ')}</div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REDE */}
              {inspectTab === 'network' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Endereço IP</span>
                      <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 select-all">
                        {inspectingContainer.networkSettings.ipAddress || 'Host Mode / Nenhum'}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Gateway</span>
                      <div className="text-xs font-mono text-foreground select-all">
                        {inspectingContainer.networkSettings.gateway || 'N/D'}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Endereço MAC</span>
                      <div className="text-xs font-mono text-foreground select-all">
                        {inspectingContainer.networkSettings.macAddress || 'N/D'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mapeamento de Portas</span>
                    {(() => {
                      const portEntries = flattenPortBindings(inspectingContainer.networkSettings.ports);
                      return portEntries.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Nenhuma porta mapeada para o host.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {portEntries.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/60 text-xs font-mono">
                              <span className="text-muted-foreground">Container: {p.containerPort}/{p.protocol}</span>
                              <span className="text-sky-600 dark:text-sky-400 font-semibold">Host: {p.hostIp || '0.0.0.0'}:{p.hostPort}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: VOLUMES */}
              {inspectTab === 'mounts' && (
                <div className="space-y-2">
                  {inspectingContainer.mounts.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-4 text-center">Nenhum volume ou bind mount configurado.</div>
                  ) : (
                    inspectingContainer.mounts.map((m, idx) => (
                      <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase">
                            {m.type} {m.rw ? '(rw)' : '(ro)'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{m.mode || 'default'}</span>
                        </div>
                        <div className="font-mono text-[11px] space-y-1 select-all">
                          <div><span className="text-muted-foreground font-sans">Host:</span> <span className="text-foreground">{m.source}</span></div>
                          <div><span className="text-muted-foreground font-sans">Destino:</span> <span className="text-sky-600 dark:text-sky-400">{m.destination}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: VARIÁVEIS DE AMBIENTE */}
              {inspectTab === 'env' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={envSearchFilter}
                      onChange={(e) => setEnvSearchFilter(e.target.value)}
                      placeholder="Filtrar variáveis de ambiente..."
                      className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-auto [scrollbar-width:thin]">
                    {inspectingContainer.env
                      .filter((e) => e.toLowerCase().includes(envSearchFilter.toLowerCase()))
                      .map((envStr, idx) => {
                        const eqIdx = envStr.indexOf('=');
                        const key = eqIdx > -1 ? envStr.slice(0, eqIdx) : envStr;
                        const val = eqIdx > -1 ? envStr.slice(eqIdx + 1) : '';
                        const isSecret = /pass|secret|key|token|auth|pwd/i.test(key);
                        const show = showSecretEnv[key];

                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-muted/40 hover:bg-muted/60 rounded-lg border border-border/60 text-xs font-mono">
                            <span className="font-bold text-foreground truncate max-w-xs">{key}</span>
                            <div className="flex items-center gap-2 truncate flex-1 justify-end">
                              <span className="text-muted-foreground truncate select-all">
                                {isSecret && !show ? '••••••••' : val}
                              </span>
                              {isSecret && (
                                <button
                                  type="button"
                                  onClick={() => setShowSecretEnv((prev) => ({ ...prev, [key]: !prev[key] }))}
                                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title={show ? 'Ocultar segredo' : 'Exibir segredo'}
                                >
                                  {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-end bg-muted/10 shrink-0">
              <button
                onClick={() => setInspectingContainer(null)}
                className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardingTour
        steps={CONTAINERS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={CONTAINERS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
