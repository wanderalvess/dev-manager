import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ListTree,
  Package,
  RotateCw,
  RotateCcw,
  Play,
  Square,
  Trash2,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Search,
  FolderOpen,
  UploadCloud,
  Sparkles,
  ShieldAlert,
  Camera,
  GitCompare,
  GitFork,
  ArrowRight,
  Wrench,
  Terminal,
  History,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Layers,
  Activity,
  Cpu,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Download,
  Hammer,
  FileSpreadsheet,
  FileCode,
  SlidersHorizontal
} from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import {
  GitProjectInfo,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  BundleSnapshot,
  BundleSnapshotDiff,
  KarafDeployHistoryEntry,
  KarafFeatureInfo
} from '../../../shared/types';
import {
  computeBundleStats,
  computeScopeCounts,
  computeSnapshotDiff,
  filterBundles,
  getMatchedProject as getMatchedProjectUtil,
  isWorkspaceBundle as isWorkspaceBundleUtil
} from '../utils/karafBundleUtils';

interface KarafBundleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: GitProjectInfo[];
}

export const KarafBundleManagerModal: React.FC<KarafBundleManagerModalProps> = ({
  isOpen,
  onClose,
  projects = []
}) => {
  const [bundles, setBundles] = useState<KarafBundleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Resolved' | 'Installed'>('ALL');
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filtro de Escopo / Domínio
  type ScopeFilter = 'ALL' | 'TOTVS' | 'WORKSPACE' | 'ISSUES' | 'SYSTEM';
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');

  // Seleção múltipla para ações em lote
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [isBatchActionLoading, setIsBatchActionLoading] = useState(false);

  // Ação rápida de recompilar e atualizar
  const [rebuildingBundleId, setRebuildingBundleId] = useState<string | null>(null);

  // Diagnóstico rápido inline (bundle:diag)
  const [inlineDiagBundle, setInlineDiagBundle] = useState<{ id: string; name: string; diag: string } | null>(null);
  const [isLoadingInlineDiag, setIsLoadingInlineDiag] = useState(false);

  // Menu de exportação
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sub-modal: Desinstalação
  const [uninstallTarget, setUninstallTarget] = useState<KarafBundleInfo | null>(null);
  const [uninstallDepCheck, setUninstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingUninstallDeps, setIsCheckingUninstallDeps] = useState(false);
  const [confirmUninstallChecked, setConfirmUninstallChecked] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallLog, setUninstallLog] = useState<string | null>(null);
  const [uninstallMode, setUninstallMode] = useState<'feature' | 'bundle'>('feature');
  const [uninstallFeatureName, setUninstallFeatureName] = useState('');
  const [uninstallFeatureVersion, setUninstallFeatureVersion] = useState('');
  const [installedFeaturesList, setInstalledFeaturesList] = useState<KarafFeatureInfo[]>([]);

  // Sub-modal: Gerenciador de Features Karaf
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [featuresList, setFeaturesList] = useState<KarafFeatureInfo[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [featuresSearch, setFeaturesSearch] = useState('');
  const [featuresFilter, setFeaturesFilter] = useState<'ALL' | 'WINTHOR' | 'SYSTEM'>('ALL');
  const [featureActionLoading, setFeatureActionLoading] = useState<string | null>(null);
  const [featureLog, setFeatureLog] = useState<string | null>(null);
  const [isFeatureInstallOpen, setIsFeatureInstallOpen] = useState(false);
  const [newFeatureInstallName, setNewFeatureInstallName] = useState('');
  const [newFeatureInstallVersion, setNewFeatureInstallVersion] = useState('');

  // Sub-modal: Instalação / Nova Versão
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installSourceType, setInstallSourceType] = useState<'project' | 'mvn' | 'file'>('project');
  const [selectedProjectPath, setSelectedProjectPath] = useState('');
  const [mvnCoordinate, setMvnCoordinate] = useState('');
  const [filePath, setFilePath] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [installStartImmediately, setInstallStartImmediately] = useState(true);
  const [installDepCheck, setInstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingInstallDeps, setIsCheckingInstallDeps] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string | null>(null);
  const [updatingTargetBundle, setUpdatingTargetBundle] = useState<KarafBundleInfo | null>(null);

  // Sub-modal: Reinstalação
  const [reinstallTarget, setReinstallTarget] = useState<KarafBundleInfo | null>(null);
  const [reinstallDepCheck, setReinstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingReinstallDeps, setIsCheckingReinstallDeps] = useState(false);
  const [rebuildBeforeReinstall, setRebuildBeforeReinstall] = useState(false);
  const [reinstallProjectPath, setReinstallProjectPath] = useState('');
  const [isReinstalling, setIsReinstalling] = useState(false);
  const [reinstallLog, setReinstallLog] = useState<string | null>(null);

  // Sub-modal: Detalhes do Bundle
  const [detailsTarget, setDetailsTarget] = useState<KarafBundleInfo | null>(null);
  const [bundleDetails, setBundleDetails] = useState<KarafBundleDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'dependents' | 'tree' | 'exports' | 'imports' | 'headers' | 'diag'>('dependents');

  // Sub-modal: Snapshots de Bundles
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<BundleSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('devManager:bundleSnapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<BundleSnapshot | null>(null);

  // Sub-modal: Histórico de Deploys & Telemetria
  const [isDeployHistoryModalOpen, setIsDeployHistoryModalOpen] = useState(false);
  const [deployHistory, setDeployHistory] = useState<KarafDeployHistoryEntry[]>([]);
  const [isLoadingDeployHistory, setIsLoadingDeployHistory] = useState(false);
  const [deployHistorySearch, setDeployHistorySearch] = useState('');
  const [deployHistoryFilter, setDeployHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE' | 'MCP' | 'UI'>('ALL');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const { copy: copyDeployCoord, copiedKey: copiedDeployCoordKey } = useCopyToClipboard(2000);

  const handleOpenDeployHistory = async () => {
    setIsDeployHistoryModalOpen(true);
    setDeployHistorySearch('');
    setDeployHistoryFilter('ALL');
    setExpandedErrorId(null);
    if (!window.electronAPI?.getKarafDeployHistory) return;
    setIsLoadingDeployHistory(true);
    try {
      setDeployHistory(await window.electronAPI.getKarafDeployHistory());
    } catch {
      setDeployHistory([]);
    } finally {
      setIsLoadingDeployHistory(false);
    }
  };

  const deployStats = useMemo(() => {
    const total = deployHistory.length;
    const successes = deployHistory.filter((d) => d.success).length;
    const failures = total - successes;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
    const totalDuration = deployHistory.reduce((acc, d) => acc + (d.durationMs || 0), 0);
    const avgDuration = total > 0 ? (totalDuration / total / 1000).toFixed(1) : '0.0';
    const mcpCount = deployHistory.filter((d) => d.trigger === 'mcp').length;
    const uiCount = total - mcpCount;

    return {
      total,
      successes,
      failures,
      successRate,
      avgDuration,
      mcpCount,
      uiCount
    };
  }, [deployHistory]);

  const filteredDeployHistory = useMemo(() => {
    return deployHistory.filter((entry) => {
      // Filtro por status / trigger
      if (deployHistoryFilter === 'SUCCESS' && !entry.success) return false;
      if (deployHistoryFilter === 'FAILURE' && entry.success) return false;
      if (deployHistoryFilter === 'MCP' && entry.trigger !== 'mcp') return false;
      if (deployHistoryFilter === 'UI' && entry.trigger !== 'ui') return false;

      // Filtro textual
      if (deployHistorySearch.trim()) {
        const query = deployHistorySearch.toLowerCase().trim();
        const art = (entry.artifactId || '').toLowerCase();
        const proj = (entry.projectName || '').toLowerCase();
        const feat = (entry.featureInstall || '').toLowerCase();
        const ver = (entry.version || '').toLowerCase();
        const msg = (entry.message || '').toLowerCase();
        const repo = (entry.repoUrl || '').toLowerCase();
        return (
          art.includes(query) ||
          proj.includes(query) ||
          feat.includes(query) ||
          ver.includes(query) ||
          msg.includes(query) ||
          repo.includes(query)
        );
      }
      return true;
    });
  }, [deployHistory, deployHistoryFilter, deployHistorySearch]);

  // Sub-modal: Log do Karaf (log:display — log interno real, não o stdout do console embedded)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [karafLog, setKarafLog] = useState('');
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [logLines, setLogLines] = useState(200);
  const [logSearch, setLogSearch] = useState('');

  const handleOpenLog = async () => {
    setIsLogModalOpen(true);
    await handleRefreshLog();
  };

  const handleRefreshLog = async () => {
    if (!window.electronAPI?.getKarafLog) return;
    setIsLoadingLog(true);
    try {
      const res = await window.electronAPI.getKarafLog(logLines);
      setKarafLog(res?.output || '');
    } catch (err: any) {
      setKarafLog(`[ERRO] Falha ao ler log do Karaf: ${err?.message || err}`);
    } finally {
      setIsLoadingLog(false);
    }
  };

  const filteredKarafLog = useMemo(() => {
    if (!logSearch.trim()) return karafLog;
    const needle = logSearch.trim().toLowerCase();
    return karafLog
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes(needle))
      .join('\n');
  }, [karafLog, logSearch]);

  const handleCreateSnapshot = () => {
    if (bundles.length === 0) return;
    const snap: BundleSnapshot = {
      id: `snap_${Date.now()}`,
      label: newSnapshotLabel.trim() || `Snapshot #${snapshots.length + 1} (${new Date().toLocaleTimeString('pt-BR')})`,
      createdAt: new Date().toLocaleString('pt-BR'),
      bundleCount: bundles.length,
      bundles: bundles.map((b) => ({
        id: b.id,
        name: b.name,
        version: b.version,
        state: b.state,
        symbolicName: b.symbolicName,
        location: b.location
      }))
    };
    const updated = [snap, ...snapshots];
    setSnapshots(updated);
    try {
      localStorage.setItem('devManager:bundleSnapshots', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
    setNewSnapshotLabel('');
    setSelectedSnapshot(snap);
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    if (selectedSnapshot?.id === id) setSelectedSnapshot(null);
    try {
      localStorage.setItem('devManager:bundleSnapshots', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const snapshotDiff = useMemo<BundleSnapshotDiff | null>(
    () => computeSnapshotDiff(bundles, selectedSnapshot),
    [selectedSnapshot, bundles]
  );

  const fetchBundles = useCallback(async () => {
    if (!window.electronAPI) return;
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const list = await window.electronAPI.listKarafBundles();
      setBundles(list || []);
    } catch (err: any) {
      setErrorBanner(`Falha ao listar bundles do Karaf: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBundles();
    }
  }, [isOpen, fetchBundles]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Identificação inteligente de escopo e projetos locais
  const getMatchedProject = useCallback(
    (b: KarafBundleInfo): GitProjectInfo | undefined => getMatchedProjectUtil(b, projects),
    [projects]
  );

  const isWorkspaceBundle = useCallback((b: KarafBundleInfo) => isWorkspaceBundleUtil(b, projects), [projects]);

  // Contadores
  const stats = useMemo(() => computeBundleStats(bundles), [bundles]);

  const scopeCounts = useMemo(() => computeScopeCounts(bundles, projects), [bundles, projects]);

  // Filtros combinados (escopo, status e busca textual)
  const filteredBundles = useMemo(
    () => filterBundles(bundles, { search, statusFilter, scopeFilter }, projects),
    [bundles, search, statusFilter, scopeFilter, projects]
  );

  // Seleção múltipla
  const handleToggleSelectBundle = (id: string) => {
    setSelectedBundleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (filteredBundles.length > 0 && selectedBundleIds.size === filteredBundles.length) {
      setSelectedBundleIds(new Set());
    } else {
      setSelectedBundleIds(new Set(filteredBundles.map((b) => b.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedBundleIds(new Set());
  };

  // Ações em lote
  const handleBatchAction = async (action: 'start' | 'stop' | 'restart' | 'refresh' | 'uninstall') => {
    if (selectedBundleIds.size === 0 || !window.electronAPI) return;
    const ids = Array.from(selectedBundleIds);

    if (action === 'uninstall') {
      const confirmed = window.confirm(
        `Atenção: Desinstalar ${ids.length} bundle(s) selecionado(s) pode quebrar módulos dependentes no runtime OSGi. Deseja continuar?`
      );
      if (!confirmed) return;
    }

    setIsBatchActionLoading(true);
    setErrorBanner(null);

    try {
      if (window.electronAPI.manageKarafBundlesBatch) {
        const res = await window.electronAPI.manageKarafBundlesBatch(action, ids);
        if (!res.success) {
          setErrorBanner(`Ação em lote "${action}" retornou: ${res.output}`);
        }
      } else {
        for (const id of ids) {
          await window.electronAPI.manageKarafBundle(action, id);
        }
      }
      await fetchBundles();
      setSelectedBundleIds(new Set());
    } catch (err: any) {
      setErrorBanner(`Falha ao executar ação em lote "${action}": ${err?.message || err}`);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  // Recompilar Maven e atualizar bundle em 1 clique
  const handleOneClickRebuild = async (bundle: KarafBundleInfo) => {
    const proj = getMatchedProject(bundle);
    if (!proj || !window.electronAPI) return;

    setRebuildingBundleId(bundle.id);
    setErrorBanner(null);

    try {
      // 1. Maven build
      if (window.electronAPI.runMavenBuild) {
        const buildRes = await window.electronAPI.runMavenBuild(proj.path, true);
        if (buildRes.code !== 0) {
          setErrorBanner(`Falha no build Maven de "${proj.name}": ${buildRes.stderr || buildRes.stdout}`);
          return;
        }
      }
      // 2. Reinstall / update
      if (window.electronAPI.reinstallKarafBundle) {
        const res = await window.electronAPI.reinstallKarafBundle({
          bundleId: bundle.id,
          projectPath: proj.path,
          rebuild: false
        });
        if (!res.success) {
          setErrorBanner(`Falha ao atualizar bundle [${bundle.id}]: ${res.output}`);
        }
      }
      await fetchBundles();
    } catch (err: any) {
      setErrorBanner(`Erro na recompilação do bundle [${bundle.id}]: ${err?.message || err}`);
    } finally {
      setRebuildingBundleId(null);
    }
  };

  // Diagnóstico rápido inline (bundle:diag)
  const handleOpenInlineDiag = async (bundle: KarafBundleInfo) => {
    if (!window.electronAPI?.getKarafBundleDetails) return;
    setIsLoadingInlineDiag(true);
    setInlineDiagBundle({ id: bundle.id, name: bundle.name, diag: 'Consultando bundle:diag...' });
    try {
      const details = await window.electronAPI.getKarafBundleDetails(bundle.id);
      setInlineDiagBundle({
        id: bundle.id,
        name: bundle.name,
        diag: details?.diag || 'Nenhuma restrição ou erro retornado pelo comando bundle:diag do Karaf.'
      });
    } catch (err: any) {
      setInlineDiagBundle({
        id: bundle.id,
        name: bundle.name,
        diag: `Falha ao obter diagnóstico: ${err?.message || err}`
      });
    } finally {
      setIsLoadingInlineDiag(false);
    }
  };

  // Exportação de inventário
  const handleExportBundles = (format: 'json' | 'csv') => {
    setIsExportMenuOpen(false);
    if (filteredBundles.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `karaf-bundles-${scopeFilter.toLowerCase()}-${dateStr}.${format}`;

    let content = '';
    let mime = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(filteredBundles, null, 2);
      mime = 'application/json';
    } else {
      mime = 'text/csv;charset=utf-8;';
      const headers = ['ID', 'Estado', 'Nome', 'SymbolicName', 'Versao', 'Nivel', 'Blueprint'];
      const rows = filteredBundles.map((b) => [
        b.id,
        b.state,
        `"${(b.name || '').replace(/"/g, '""')}"`,
        `"${(b.symbolicName || '').replace(/"/g, '""')}"`,
        `"${(b.version || '').replace(/"/g, '""')}"`,
        b.level || '',
        b.blueprint || ''
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Ações básicas (start, stop, restart, refresh)
  const handleBasicAction = async (action: 'start' | 'stop' | 'restart' | 'refresh' | 'resolve', bundleId: string) => {
    if (!window.electronAPI) return;
    setActionLoading((prev) => ({ ...prev, [bundleId]: action }));
    try {
      const res = await window.electronAPI.manageKarafBundle(action, bundleId);
      if (!res.success) {
        alert(`Erro na ação ${action}: ${res.output}`);
      }
      await fetchBundles();
    } catch (err: any) {
      alert(`Falha: ${err?.message || err}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[bundleId];
        return next;
      });
    }
  };

  // --- Fluxo de Desinstalação com Verificação de Dependências e Features ---
  const handleOpenUninstall = async (bundle: KarafBundleInfo) => {
    setUninstallTarget(bundle);
    setUninstallDepCheck(null);
    setConfirmUninstallChecked(false);
    setUninstallLog(null);
    setUninstallMode('feature');

    // Tentar inferir nome provável da feature a partir do bundle
    const rawName = bundle.symbolicName || bundle.name || '';
    const cleanCandidate = rawName
      .replace(/^(com\.br\.com\.pcsist\.winthor\.|br\.com\.totvs\.|com\.pcsist\.)/, '')
      .replace(/-service$|-impl$|-core$|-api$/, '');
    setUninstallFeatureName(cleanCandidate);
    setUninstallFeatureVersion(bundle.version || '');

    setIsCheckingUninstallDeps(true);

    // Carregar features instaladas para dar match inteligente e preencher o datalist
    if (window.electronAPI?.listKarafFeatures) {
      window.electronAPI.listKarafFeatures().then((res) => {
        const list: KarafFeatureInfo[] = Array.isArray(res) ? res : ((res as any)?.features || []);
        if (list.length > 0) {
          setInstalledFeaturesList(list);
          const needle = cleanCandidate.toLowerCase();
          const matched = list.find(
            (f: KarafFeatureInfo) =>
              f.name.toLowerCase() === needle ||
              needle.includes(f.name.toLowerCase()) ||
              f.name.toLowerCase().includes(needle)
          );
          if (matched) {
            setUninstallFeatureName(matched.name);
            if (matched.version) setUninstallFeatureVersion(matched.version);
          }
        }
      }).catch((err) => console.error('Erro ao listar features no modal de uninstall:', err));
    }

    if (window.electronAPI?.checkKarafBundleDeps) {
      try {
        const check = await window.electronAPI.checkKarafBundleDeps(bundle.id);
        setUninstallDepCheck(check);
      } catch (err: any) {
        console.error('Erro ao checar dependências para desinstalação:', err);
      } finally {
        setIsCheckingUninstallDeps(false);
      }
    } else {
      setIsCheckingUninstallDeps(false);
    }
  };

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    setIsUninstalling(true);
    setUninstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setUninstallLog((prev) => (prev || '') + chunk);
    });
    try {
      if (uninstallMode === 'feature') {
        if (!uninstallFeatureName.trim()) {
          alert('Informe o nome da feature para desinstalar.');
          setIsUninstalling(false);
          return;
        }
        if (!window.electronAPI?.uninstallKarafFeature) {
          alert('API de desinstalação de feature não disponível.');
          setIsUninstalling(false);
          return;
        }
        const res = await window.electronAPI.uninstallKarafFeature(
          uninstallFeatureName.trim(),
          uninstallFeatureVersion.trim() || undefined
        );
        if (!res.success) {
          alert(`Falha na desinstalação da Feature: ${res.output}`);
        } else {
          setUninstallTarget(null);
          await fetchBundles();
        }
      } else {
        if (!window.electronAPI?.uninstallKarafBundle) return;
        const res = await window.electronAPI.uninstallKarafBundle(uninstallTarget.id);
        if (!res.success) {
          alert(`Falha na desinstalação do Bundle: ${res.output}`);
        } else {
          setUninstallTarget(null);
          await fetchBundles();
        }
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsUninstalling(false);
    }
  };

  // --- Gerenciador de Features Karaf ---
  const handleOpenFeaturesModal = async () => {
    setIsFeaturesModalOpen(true);
    setFeatureLog(null);
    await handleRefreshFeatures();
  };

  const handleRefreshFeatures = async () => {
    if (!window.electronAPI?.listKarafFeatures) return;
    setIsLoadingFeatures(true);
    try {
      const res = await window.electronAPI.listKarafFeatures();
      const list = Array.isArray(res) ? res : ((res as any)?.features || []);
      setFeaturesList(list);
    } catch (err: any) {
      console.error('Erro ao listar features:', err);
      setFeaturesList([]);
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  const handleUninstallFeatureDirect = async (feat: KarafFeatureInfo) => {
    const featIdent = `${feat.name}${feat.version ? `/${feat.version}` : ''}`;
    if (!confirm(`Deseja realmente desinstalar permanentemente a feature "${featIdent}"?\n\nIsso executará "feature:uninstall -r" e removerá a feature do Karaf e seus bundles.`)) {
      return;
    }
    setFeatureActionLoading(feat.name);
    setFeatureLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setFeatureLog((prev) => (prev || '') + chunk);
    });
    try {
      const res = await window.electronAPI.uninstallKarafFeature(feat.name, feat.version);
      if (!res.success) {
        alert(`Erro ao desinstalar feature: ${res.output}`);
      } else {
        await handleRefreshFeatures();
        await fetchBundles();
      }
    } catch (err: any) {
      alert(`Falha: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setFeatureActionLoading(null);
    }
  };

  const handleInstallFeatureDirect = async () => {
    if (!newFeatureInstallName.trim()) {
      alert('Informe o nome da feature.');
      return;
    }
    setFeatureActionLoading('installing_new');
    setFeatureLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setFeatureLog((prev) => (prev || '') + chunk);
    });
    try {
      const res = await window.electronAPI.installKarafFeature(
        newFeatureInstallName.trim(),
        newFeatureInstallVersion.trim() || undefined
      );
      if (!res.success) {
        alert(`Erro ao instalar feature: ${res.output}`);
      } else {
        setIsFeatureInstallOpen(false);
        setNewFeatureInstallName('');
        setNewFeatureInstallVersion('');
        await handleRefreshFeatures();
        await fetchBundles();
      }
    } catch (err: any) {
      alert(`Falha: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setFeatureActionLoading(null);
    }
  };

  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      if (featuresFilter === 'WINTHOR' && !f.isWinthor) return false;
      if (featuresFilter === 'SYSTEM' && f.isWinthor) return false;
      if (featuresSearch.trim()) {
        const q = featuresSearch.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.version.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.repository && f.repository.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [featuresList, featuresFilter, featuresSearch]);


  // --- Fluxo de Instalação / Nova Versão ---
  const updateFromSelectedProject = (proj: GitProjectInfo) => {
    if (proj.pomInfo) {
      const { groupId, artifactId, version, modules } = proj.pomInfo;
      const serviceModule = modules?.find((m) => m.includes('service')) || modules?.[0] || artifactId;
      setMvnCoordinate(`mvn:${groupId}/${serviceModule}/${version}`);
      setTargetVersion(version);
    } else {
      setMvnCoordinate(`mvn:com.suaempresa/${proj.name}/1.0.0-SNAPSHOT`);
      setTargetVersion('1.0.0-SNAPSHOT');
    }
  };

  const handleOpenInstall = (existingBundle?: KarafBundleInfo) => {
    setIsInstallModalOpen(true);
    setInstallDepCheck(null);
    setInstallLog(null);
    setUpdatingTargetBundle(existingBundle || null);

    if (existingBundle) {
      // Pré-preenche para atualização de versão
      setInstallSourceType('mvn');
      setMvnCoordinate(`mvn:${existingBundle.symbolicName || existingBundle.name}/${existingBundle.version}`);
      setTargetVersion(existingBundle.version);
    } else {
      setInstallSourceType('project');
      if (projects.length > 0) {
        setSelectedProjectPath(projects[0].path);
        updateFromSelectedProject(projects[0]);
      }
    }
  };

  const handleSelectFile = async () => {
    if (window.electronAPI?.selectFile) {
      const picked = await window.electronAPI.selectFile({
        filters: [{ name: 'Arquivos JAR OSGi', extensions: ['jar'] }]
      });
      if (picked) {
        setFilePath(picked);
      }
    }
  };

  const getComputedLocation = (): string => {
    if (installSourceType === 'mvn') return mvnCoordinate.trim();
    if (installSourceType === 'file') return filePath.trim();
    if (installSourceType === 'project') {
      const proj = projects.find((p) => p.path === selectedProjectPath);
      if (proj?.pomInfo) {
        const { groupId, artifactId, modules } = proj.pomInfo;
        const v = targetVersion.trim() || proj.pomInfo.version || '1.0.0-SNAPSHOT';
        const serviceModule = modules?.find((m) => m.includes('service')) || modules?.[0] || artifactId;
        return `mvn:${groupId}/${serviceModule}/${v}`;
      }
      return mvnCoordinate.trim();
    }
    return '';
  };

  const handleCheckInstallImpact = async () => {
    const loc = getComputedLocation();
    if (!loc) {
      alert('Informe a localização ou coordenada Maven do bundle.');
      return;
    }
    setIsCheckingInstallDeps(true);
    setInstallDepCheck(null);
    try {
      if (window.electronAPI?.checkKarafInstallDeps) {
        const check = await window.electronAPI.checkKarafInstallDeps({
          location: loc,
          version: targetVersion.trim()
        });
        setInstallDepCheck(check);
      }
    } catch (err: any) {
      console.error('Erro na checagem de instalação:', err);
    } finally {
      setIsCheckingInstallDeps(false);
    }
  };

  const handleConfirmInstall = async () => {
    const loc = getComputedLocation();
    if (!loc) {
      alert('Informe a coordenada ou arquivo do bundle.');
      return;
    }

    setIsInstalling(true);
    setInstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setInstallLog((prev) => (prev || '') + chunk);
    });
    try {
      if (updatingTargetBundle && window.electronAPI?.updateKarafBundleVersion) {
        const res = await window.electronAPI.updateKarafBundleVersion({
          bundleId: updatingTargetBundle.id,
          newVersionOrLocation: loc
        });
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao atualizar versão do bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle [${updatingTargetBundle.id}] atualizado com sucesso!`);
          await fetchBundles();
        }
      } else {
        const req: InstallBundleRequest = {
          location: loc,
          version: targetVersion.trim() || undefined,
          startImmediately: installStartImmediately
        };

        const res = await window.electronAPI?.installKarafBundle(req);
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao instalar bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle instalado com ID: ${res.bundleId || 'concluído'}`);
          await fetchBundles();
        }
      }
    } catch (err: any) {
      setInstallLog((prev) => `${prev || ''}\r\n[ERRO FATAL] ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsInstalling(false);
    }
  };

  // --- Fluxo de Reinstalação ---
  const handleOpenReinstall = async (bundle: KarafBundleInfo) => {
    setReinstallTarget(bundle);
    setReinstallDepCheck(null);
    setIsCheckingReinstallDeps(true);
    setRebuildBeforeReinstall(false);

    // Tentar mapear para um projeto do workspace pelo nome
    const matchedProject = projects.find((p) => {
      const pName = p.name.toLowerCase();
      const bName = (bundle.symbolicName || bundle.name).toLowerCase();
      return bName.includes(pName) || pName.includes(bName);
    });
    setReinstallProjectPath(matchedProject?.path || '');
    setReinstallLog(null);

    if (window.electronAPI?.checkKarafBundleDeps) {
      try {
        const check = await window.electronAPI.checkKarafBundleDeps(bundle.id);
        setReinstallDepCheck(check);
      } catch (err: any) {
        console.error('Erro ao checar dependências para reinstalação:', err);
      } finally {
        setIsCheckingReinstallDeps(false);
      }
    } else {
      setIsCheckingReinstallDeps(false);
    }
  };

  const handleConfirmReinstall = async () => {
    if (!reinstallTarget || !window.electronAPI?.reinstallKarafBundle) return;
    setIsReinstalling(true);
    setReinstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setReinstallLog((prev) => (prev || '') + chunk);
    });
    try {
      const req: ReinstallBundleRequest = {
        bundleId: reinstallTarget.id,
        projectPath: rebuildBeforeReinstall && reinstallProjectPath ? reinstallProjectPath : undefined,
        rebuild: rebuildBeforeReinstall && Boolean(reinstallProjectPath)
      };

      const res = await window.electronAPI.reinstallKarafBundle(req);
      if (!res.success) {
        alert(`Falha na reinstalação: ${res.output}`);
      } else {
        setReinstallTarget(null);
        await fetchBundles();
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsReinstalling(false);
    }
  };

  // --- Fluxo de Detalhes do Bundle ---
  const handleOpenDetails = async (bundle: KarafBundleInfo) => {
    setDetailsTarget(bundle);
    setBundleDetails(null);
    setIsLoadingDetails(true);
    setDetailsTab('dependents');

    if (window.electronAPI?.getKarafBundleDetails) {
      try {
        const details = await window.electronAPI.getKarafBundleDetails(bundle.id);
        setBundleDetails(details);
        if (details?.diag) {
          setDetailsTab('diag');
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes do bundle:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    } else {
      setIsLoadingDetails(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[97vw] 2xl:max-w-[1720px] h-[94vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Cabeçalho */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between bg-muted/40 shrink-0 gap-3">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <ListTree className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-foreground tracking-tight">Gerenciador de Bundles OSGi</h3>
                <span className="text-[11px] bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {stats.total} bundles
                </span>
                <span className="text-[11px] bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {stats.active} ativos
                </span>
                {stats.resolved > 0 && (
                  <span className="text-[11px] bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {stats.resolved} resolvidos
                  </span>
                )}
                {stats.installed > 0 && (
                  <span className="text-[11px] bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {stats.installed} instalados
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspecione dependências, reinstale, desinstale ou publique novas versões com confirmação de impacto em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Exportar Inventário */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-xs"
                title="Exportar inventário de bundles OSGi filtrados"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl z-40 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleExportBundles('json')}
                      className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer font-mono"
                    >
                      <FileCode className="w-3.5 h-3.5 text-sky-400" />
                      <span>Exportar como JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportBundles('csv')}
                      className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer font-mono"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar como CSV</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenLog}
              className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-xs"
              title="Ver log interno do Karaf (log:display)"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Log do Karaf</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-xs"
              title="Comparar estado atual de bundles com snapshot salvo"
            >
              <Camera className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Snapshots / Diff</span>
              {snapshots.length > 0 && (
                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {snapshots.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenFeaturesModal}
              className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-xs"
              title="Gerenciar Features instaladas do Karaf (feature:list -i, feature:uninstall -r, feature:install)"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Features Karaf</span>
            </button>

            <button
              type="button"
              onClick={handleOpenDeployHistory}
              className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-xs"
              title="Ver histórico de deploys/builds Karaf já executados"
            >
              <History className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Histórico de Deploys</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInstall()}
              className="px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
              title="Instalar novo bundle ou outra versão"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Instalar / Nova Versão</span>
            </button>

            <button
              type="button"
              onClick={fetchBundles}
              disabled={isLoading}
              className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer shadow-xs"
              title="Atualizar lista de bundles"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Erro de conexão / aviso */}
        {errorBanner && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-3 px-6 text-xs text-rose-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="hover:underline font-bold">
              Fechar
            </button>
          </div>
        )}

        {/* Barra de Escopos Inteligentes (Smart Scope Tabs) */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-border/70 bg-muted/20 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-2 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Escopo:
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {[
              { id: 'ALL', label: 'Todos os Módulos', count: scopeCounts.all },
              { id: 'TOTVS', label: 'TOTVS / WinThor', count: scopeCounts.totvs },
              { id: 'WORKSPACE', label: 'Workspace Local', count: scopeCounts.workspace },
              { id: 'ISSUES', label: 'Com Alertas / Diag', count: scopeCounts.issues },
              { id: 'SYSTEM', label: 'Framework & Sistema', count: scopeCounts.system }
            ].map((tab) => {
              const isActive = scopeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                      : 'bg-card hover:bg-muted text-muted-foreground border border-border/60 hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-black/25 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-3 sm:px-6 border-b border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por ID, nome do bundle, versão ou symbolic name... (Atalho: /)"
              className="w-full bg-background border border-border rounded-xl pl-10 pr-14 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono transition"
            />
            <div className="absolute right-3 top-2.5 text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 pointer-events-none">
              /
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedBundleIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition cursor-pointer mr-1"
                title="Desmarcar todos os bundles"
              >
                Limpar seleção ({selectedBundleIds.size})
              </button>
            )}
            {(['ALL', 'Active', 'Resolved', 'Installed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st}
              </button>
            ))}
            <span className="text-xs text-muted-foreground font-mono ml-2 font-semibold">
              {filteredBundles.length} de {bundles.length}
            </span>
          </div>
        </div>

        {/* Tabela de Bundles */}
        <div className="flex-1 overflow-auto relative">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2 p-6">
              <RotateCw className="w-6 h-6 animate-spin text-primary" />
              <span>Consultando bundles no runtime Karaf via client.bat...</span>
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground p-6">
              <Package className="w-8 h-8 opacity-30 mb-2" />
              <p>Nenhum bundle encontrado para os filtros aplicados.</p>
            </div>
          ) : (
            <div className="min-w-full relative pb-28">
              <table className="min-w-full text-xs font-mono border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 shadow-xs">
                  <tr className="bg-muted">
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left w-12 border-b border-border select-none">
                      <input
                        type="checkbox"
                        checked={filteredBundles.length > 0 && selectedBundleIds.size === filteredBundles.length}
                        onChange={handleSelectAllVisible}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        title={
                          selectedBundleIds.size === filteredBundles.length
                            ? 'Desmarcar todos'
                            : 'Selecionar todos os bundles visíveis'
                        }
                      />
                    </th>
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-20 border-b border-border select-none text-[11px]">ID</th>
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Estado</th>
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider min-w-[340px] border-b border-border select-none text-[11px]">Nome do Bundle / SymbolicName</th>
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Versão</th>
                    <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-right text-muted-foreground uppercase font-bold tracking-wider w-72 border-b border-border select-none text-[11px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBundles.map((b) => {
                    const isRowLoading = Boolean(actionLoading[b.id]);
                    const isSelected = selectedBundleIds.has(b.id);
                    const isWs = isWorkspaceBundle(b);
                    const isRebuilding = rebuildingBundleId === b.id;

                    return (
                      <tr
                        key={b.id}
                        className={`transition ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                        }`}
                      >
                        <td className="px-4 py-3 border-b border-border/40">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectBundle(b.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-border/40 text-primary font-bold text-sm tabular-nums">{b.id}</td>
                        <td className="px-4 py-3 border-b border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                                b.state === 'Active'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                  : b.state === 'Resolved'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : b.state === 'Installed'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                b.state === 'Active' ? 'bg-emerald-500' : b.state === 'Resolved' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              {b.state}
                            </span>
                            {b.state !== 'Active' && (
                              <button
                                type="button"
                                onClick={() => handleOpenInlineDiag(b)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 transition cursor-pointer"
                                title="Ver diagnóstico do Karaf para este bundle (bundle:diag)"
                              >
                                Diag
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b border-border/40 text-foreground font-medium" title={b.name}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-foreground font-bold text-xs">{b.name}</span>
                              {isWs && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                                  <Sparkles className="w-3 h-3" /> Workspace
                                </span>
                              )}
                            </div>
                            {b.symbolicName && b.symbolicName !== b.name && (
                              <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-xl">
                                {b.symbolicName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b border-border/40 text-muted-foreground font-mono text-xs tabular-nums font-semibold">{b.version || '-'}</td>
                        <td className="px-4 py-3 border-b border-border/40 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Recompilar Maven & Atualizar (1 clique para projetos do workspace) */}
                            {isWs && (
                              <button
                                type="button"
                                onClick={() => handleOneClickRebuild(b)}
                                disabled={isRebuilding || isRowLoading}
                                title="Recompilar projeto Maven (clean install) e atualizar bundle no Karaf em 1 clique"
                                className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                <Hammer className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                              </button>
                            )}

                            {/* Atualizar Fiações (bundle:refresh) */}
                            <button
                              type="button"
                              onClick={() => handleBasicAction('refresh', b.id)}
                              disabled={isRowLoading}
                              title="Atualizar fiações OSGi do bundle (bundle:refresh)"
                              className="p-2 rounded-xl bg-card hover:bg-sky-500/15 border border-border hover:border-sky-500/40 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>

                            {/* Reinstalar */}
                            <button
                              type="button"
                              onClick={() => handleOpenReinstall(b)}
                              disabled={isRowLoading}
                              title="Reinstalar bundle (update + refresh)"
                              className="p-2 rounded-xl bg-card hover:bg-primary/15 border border-border hover:border-primary/40 text-primary hover:text-primary transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            {/* Instalar Outra Versão / Atualizar */}
                            <button
                              type="button"
                              onClick={() => handleOpenInstall(b)}
                              disabled={isRowLoading}
                              title="Instalar outra versão ou atualizar"
                              className="p-2 rounded-xl bg-card hover:bg-sky-500/15 border border-border hover:border-sky-500/40 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>

                            {/* Detalhes & Dependências */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(b)}
                              disabled={isRowLoading}
                              title="Inspecionar dependências e manifesto"
                              className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <Info className="w-4 h-4" />
                            </button>

                            {/* Resolver Dependências (bundle:resolve) */}
                            {b.state === 'Installed' && (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('resolve', b.id)}
                                disabled={isRowLoading}
                                title="Forçar resolução de dependências OSGi (bundle:resolve)"
                                className="p-2 rounded-xl bg-card hover:bg-amber-500/20 border border-border text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}

                            {/* Iniciar / Parar */}
                            {b.state === 'Active' ? (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('stop', b.id)}
                                disabled={isRowLoading}
                                title="Parar bundle"
                                className="p-2 rounded-xl bg-card hover:bg-amber-500/15 border border-border hover:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                <Square className="w-4 h-4 fill-current" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('start', b.id)}
                                disabled={isRowLoading}
                                title="Iniciar bundle"
                                className="p-2 rounded-xl bg-card hover:bg-emerald-500/15 border border-border hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )}

                            {/* Desinstalar */}
                            <button
                              type="button"
                              onClick={() => handleOpenUninstall(b)}
                              disabled={isRowLoading}
                              title="Desinstalar bundle com verificação de dependências"
                              className="p-2 rounded-xl bg-card hover:bg-rose-500/20 border border-border hover:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Barra Flutuante de Ações em Lote */}
              {selectedBundleIds.size > 0 && (
                <div className="sticky bottom-3 mx-4 z-20 bg-card/95 backdrop-blur-md border border-primary/40 shadow-2xl rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs mt-2">
                  <div className="flex items-center gap-2 font-bold text-foreground pr-3">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span>{selectedBundleIds.size} bundle(s) selecionado(s)</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleBatchAction('restart')}
                      disabled={isBatchActionLoading}
                      className="px-3 py-1.5 rounded-xl font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      title="Reiniciar todos os bundles selecionados"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isBatchActionLoading ? 'animate-spin' : ''}`} />
                      <span>Reiniciar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchAction('start')}
                      disabled={isBatchActionLoading}
                      className="px-3 py-1.5 rounded-xl font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      title="Iniciar todos os bundles selecionados"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchAction('stop')}
                      disabled={isBatchActionLoading}
                      className="px-3 py-1.5 rounded-xl font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      title="Parar todos os bundles selecionados"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Parar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchAction('refresh')}
                      disabled={isBatchActionLoading}
                      className="px-3 py-1.5 rounded-xl font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      title="Atualizar fiações OSGi dos bundles selecionados"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchAction('uninstall')}
                      disabled={isBatchActionLoading}
                      className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      title="Desinstalar todos os bundles selecionados"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Desinstalar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-muted-foreground hover:text-foreground text-xs underline pl-2 cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL: CONFIRMAÇÃO DE DESINSTALAÇÃO COM VERIFICAÇÃO DE DEPENDÊNCIAS */}
      {/* ========================================================================= */}
      {uninstallTarget && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Confirmar Desinstalação do Bundle</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Verificação prévia de impacto e fiação de dependências OSGi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUninstallTarget(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Informações do Bundle */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">{uninstallTarget.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ID: {uninstallTarget.id} · Versão: {uninstallTarget.version}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 font-mono ${
                    uninstallTarget.state === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : uninstallTarget.state === 'Resolved'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : uninstallTarget.state === 'Installed'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    uninstallTarget.state === 'Active' ? 'bg-emerald-500' : uninstallTarget.state === 'Resolved' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  {uninstallTarget.state}
                </span>
              </div>

              {/* Modo de Desinstalação */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tipo de Desinstalação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUninstallMode('feature')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      uninstallMode === 'feature'
                        ? 'border-rose-500/60 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30'
                        : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-rose-500" />
                        Desinstalação Permanente
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Executa <code className="text-rose-400 font-mono">feature:uninstall -r</code>. Não volta ao reiniciar o Karaf.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUninstallMode('bundle')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      uninstallMode === 'bundle'
                        ? 'border-rose-500/60 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30'
                        : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        Apenas Bundle (Memória)
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        OSGi
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Executa <code className="text-amber-400 font-mono">bundle:uninstall</code>. Pode retornar se Karaf reiniciar.
                    </p>
                  </button>
                </div>
              </div>

              {/* Se for modo feature: inputs de nome e versão da feature */}
              {uninstallMode === 'feature' && (
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Parâmetros da Feature Karaf
                    </span>
                    {installedFeaturesList.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {installedFeaturesList.length} features instaladas detectadas
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Nome da Feature
                      </label>
                      <input
                        type="text"
                        list="karaf-installed-features-datalist"
                        value={uninstallFeatureName}
                        onChange={(e) => setUninstallFeatureName(e.target.value)}
                        placeholder="Ex: winthor-integracao-varejo"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      />
                      <datalist id="karaf-installed-features-datalist">
                        {installedFeaturesList.map((f) => (
                          <option key={`${f.name}-${f.version}`} value={f.name}>
                            {f.name} {f.version ? `(${f.version})` : ''}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Versão (Opcional)
                      </label>
                      <input
                        type="text"
                        value={uninstallFeatureVersion}
                        onChange={(e) => setUninstallFeatureVersion(e.target.value)}
                        placeholder="Ex: 0.0.1-SNAPSHOT"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/50">
                    Comando Karaf que será executado:
                    <div className="text-rose-400 font-bold mt-0.5">
                      feature:uninstall -r {uninstallFeatureName || '<nome-feature>'}{uninstallFeatureVersion ? `/${uninstallFeatureVersion}` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Status da checagem de dependências */}
              {isCheckingUninstallDeps ? (
                <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Inspecionando fiação de dependências OSGi via Karaf...</span>
                </div>
              ) : uninstallDepCheck ? (
                <div className="space-y-3">
                  {/* Nível de Risco */}
                  {uninstallDepCheck.riskLevel === 'HIGH' ? (
                    <div className="p-3.5 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-800/50 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>RISCO ALTO: Bundles dependentes ativos detectados!</span>
                      </div>
                      <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                        Existem {uninstallDepCheck.dependentBundles.length} bundle(s) que dependem diretamente deste módulo.
                        Ao desinstalar, esses módulos deixarão de funcionar no Karaf.
                      </p>

                      {/* Lista de dependentes */}
                      <div className="mt-2 bg-card/80 border border-rose-500/30 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                        {uninstallDepCheck.dependentBundles.map((dep) => (
                          <div key={dep.id} className="text-[10px] font-mono text-foreground flex items-center justify-between">
                            <span>
                              [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold text-[9px]">{dep.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : uninstallDepCheck.riskLevel === 'MEDIUM' ? (
                    <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-800/50 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>ATENÇÃO: Pacotes exportados podem estar em uso</span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Este bundle exporta {uninstallDepCheck.exportedPackages.length} pacotes OSGi. Nenhum bundle cliente foi
                        detectado com fiação direta no momento, mas dependências dinâmicas podem ser afetadas.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/50 rounded-xl text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Risco Baixo: Nenhuma dependência ativa encontrada. Seguro para desinstalar.</span>
                    </div>
                  )}

                  {/* Confirmação explícita de risco se alto */}
                  {uninstallDepCheck.riskLevel === 'HIGH' && (
                    <label className="flex items-start gap-2.5 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={confirmUninstallChecked}
                        onChange={(e) => setConfirmUninstallChecked(e.target.checked)}
                        className="mt-0.5 rounded border-border text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-foreground font-medium text-[11px]">
                        Estou ciente do impacto e confirmo que desejo desinstalar este bundle mesmo com bundles dependentes.
                      </span>
                    </label>
                  )}
                </div>
              ) : null}

              {/* Log ao vivo do bundle:uninstall + bundle:refresh */}
              {uninstallLog && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
                  {uninstallLog}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setUninstallTarget(null)}
                disabled={isUninstalling}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                disabled={
                  isUninstalling ||
                  isCheckingUninstallDeps ||
                  (uninstallDepCheck?.riskLevel === 'HIGH' && !confirmUninstallChecked)
                }
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-75 disabled:cursor-wait rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isUninstalling ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Desinstalando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Desinstalação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: INSTALAÇÃO / ATUALIZAÇÃO PARA OUTRA VERSÃO */}
      {/* ========================================================================= */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {updatingTargetBundle
                      ? `Atualizar Versão: [${updatingTargetBundle.id}] ${updatingTargetBundle.name}`
                      : 'Instalar Bundle / Outra Versão'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {updatingTargetBundle
                      ? `Atualização in-place no Karaf (bundle:update) preservando ID e reconectando fiações`
                      : 'Implantação de componentes OSGi com verificação prévia de colisão e dependências'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Seletor de Origem */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Origem do Bundle</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInstallSourceType('project')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      installSourceType === 'project'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Projeto do Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallSourceType('mvn')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      installSourceType === 'mvn'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Coordenada Maven
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallSourceType('file')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      installSourceType === 'file'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Arquivo .JAR Local
                  </button>
                </div>
              </div>

              {/* Campos específicos por origem */}
              {installSourceType === 'project' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Projeto Git do Workspace
                    </label>
                    <select
                      value={selectedProjectPath}
                      onChange={(e) => {
                        setSelectedProjectPath(e.target.value);
                        const proj = projects.find((p) => p.path === e.target.value);
                        if (proj) updateFromSelectedProject(proj);
                      }}
                      className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    >
                      {projects.map((p) => (
                        <option key={p.path} value={p.path}>
                          {p.name} {p.pomInfo?.version ? `[v.${p.pomInfo.version}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Versão Alvo a Instalar
                    </label>
                    <input
                      type="text"
                      value={targetVersion}
                      onChange={(e) => setTargetVersion(e.target.value)}
                      placeholder="Ex: 1.0.0-SNAPSHOT, 2.0.1"
                      className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg truncate">
                    URL Calculada: <span className="text-foreground">{getComputedLocation()}</span>
                  </div>
                </div>
              )}

              {installSourceType === 'mvn' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Coordenada Maven (mvn:groupId/artifactId/version)
                    </label>
                    <input
                      type="text"
                      value={mvnCoordinate}
                      onChange={(e) => setMvnCoordinate(e.target.value)}
                      placeholder="mvn:com.suaempresa/meu-servico/1.5.0"
                      className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Versão Alvo (opcional para filtro)
                    </label>
                    <input
                      type="text"
                      value={targetVersion}
                      onChange={(e) => setTargetVersion(e.target.value)}
                      placeholder="Ex: 1.5.0"
                      className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>
              )}

              {installSourceType === 'file' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Caminho do Arquivo JAR
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectFile}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3" /> Selecionar Arquivo .JAR
                    </button>
                  </div>
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="C:\caminho\para\meu-bundle.jar"
                    className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              )}

              {/* Opções de Instalação */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={installStartImmediately}
                    onChange={(e) => setInstallStartImmediately(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>
                    Iniciar bundle após instalação (<code className="font-mono text-primary">-s</code>)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleCheckInstallImpact}
                  disabled={isCheckingInstallDeps || !getComputedLocation()}
                  className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isCheckingInstallDeps ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Verificar Dependências</span>
                </button>
              </div>

              {/* Relatório da Verificação de Instalação */}
              {installDepCheck && (
                <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                  <div className="font-bold flex items-center gap-2">
                    {installDepCheck.alreadyInstalled ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-foreground">
                      {installDepCheck.alreadyInstalled ? 'Substituição de Versão Detectada' : 'Novo Bundle no Container'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{installDepCheck.warningMessage}</p>

                  {installDepCheck.dependentBundles.length > 0 && (
                    <div className="mt-2 bg-background/50 border border-border rounded-lg p-2 max-h-28 overflow-y-auto space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Bundles clientes afetados na reconexão:
                      </span>
                      {installDepCheck.dependentBundles.map((dep) => (
                        <div key={dep.id} className="text-[10px] font-mono text-foreground">
                          [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Log do comando */}
              {installLog && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
                  {installLog}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                disabled={isInstalling}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInstall}
                disabled={isInstalling || !getComputedLocation()}
                className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isInstalling ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{updatingTargetBundle ? 'Atualizando Versão...' : 'Instalando...'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{updatingTargetBundle ? 'Confirmar Atualização de Versão' : 'Confirmar Instalação'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: REINSTALAÇÃO DE BUNDLE */}
      {/* ========================================================================= */}
      {reinstallTarget && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Confirmar Reinstalação do Bundle</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Recarrega a compilação local, atualiza fiações e reinicia o componente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReinstallTarget(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-muted/30 border border-border rounded-xl">
                <div className="text-xs font-bold text-foreground">{reinstallTarget.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  ID: {reinstallTarget.id} · Versão: {reinstallTarget.version}
                </div>
              </div>

              {/* Checagem de dependentes que serão reconectados */}
              {isCheckingReinstallDeps ? (
                <div className="p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Verificando fiação de dependências para reconexão...</span>
                </div>
              ) : reinstallDepCheck ? (
                <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground block">
                    {reinstallDepCheck.dependentBundles.length > 0
                      ? `${reinstallDepCheck.dependentBundles.length} bundle(s) clientes serão temporariamente reconectados.`
                      : 'Nenhum bundle cliente ativo dependente no momento.'}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    O Karaf executará <code className="font-mono text-foreground">bundle:update</code> seguido de{' '}
                    <code className="font-mono text-foreground">bundle:refresh</code> e{' '}
                    <code className="font-mono text-foreground">bundle:start</code>.
                  </p>
                </div>
              ) : null}

              {/* Opção de Rebuild Maven */}
              {reinstallProjectPath && (
                <label className="flex items-start gap-2.5 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={rebuildBeforeReinstall}
                    onChange={(e) => setRebuildBeforeReinstall(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-foreground font-medium block">
                      Executar compilação Maven (<code className="font-mono text-primary">mvn clean install -DskipTests</code>) antes de reinstalar
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block mt-0.5 truncate">
                      Pasta: {reinstallProjectPath}
                    </span>
                  </div>
                </label>
              )}

              {/* Log ao vivo do bundle:update + bundle:refresh + bundle:start */}
              {reinstallLog && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
                  {reinstallLog}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setReinstallTarget(null)}
                disabled={isReinstalling}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReinstall}
                disabled={isReinstalling}
                className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isReinstalling ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reinstalando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirmar Reinstalação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: DETALHES & ÁRVORE DE DEPENDÊNCIAS DO BUNDLE */}
      {/* ========================================================================= */}
      {detailsTarget && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[86vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    [{detailsTarget.id}] {detailsTarget.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Versão: {detailsTarget.version} · Estado: {detailsTarget.state}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas de detalhe */}
            <div className="flex border-b border-border bg-card/60 px-4 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDetailsTab('dependents')}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition ${
                  detailsTab === 'dependents'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Dependentes Wired ({bundleDetails?.dependentBundles.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('tree')}
                className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
                  detailsTab === 'tree'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                Árvore Hierárquica
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('exports')}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition ${
                  detailsTab === 'exports'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Export-Package ({bundleDetails?.exportedPackages.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('imports')}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition ${
                  detailsTab === 'imports'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Import-Package ({bundleDetails?.importedPackages.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('headers')}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition ${
                  detailsTab === 'headers'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Headers Manifest
              </button>
              {bundleDetails?.diag && (
                <button
                  type="button"
                  onClick={() => setDetailsTab('diag')}
                  className={`py-2 px-3 text-xs font-semibold border-b-2 transition ${
                    detailsTab === 'diag'
                      ? 'border-rose-500 text-rose-500 font-bold'
                      : 'border-transparent text-rose-400 hover:text-rose-300'
                  }`}
                >
                  Diagnóstico Diag
                </button>
              )}
            </div>

            {/* Conteúdo da aba selecionada */}
            <div className="flex-1 overflow-auto p-4">
              {isLoadingDetails ? (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                  <RotateCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Consultando cabeçalhos e fiações no Karaf...</span>
                </div>
              ) : !bundleDetails ? (
                <p className="text-xs text-muted-foreground text-center py-8">Detalhes indisponíveis para este bundle.</p>
              ) : (
                <>
                  {detailsTab === 'dependents' && (
                    <div className="space-y-2">
                      {bundleDetails.dependentBundles.length === 0 ? (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                          <p>Nenhum bundle dependente com fiação direta ativa detectado no container.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {bundleDetails.dependentBundles.map((dep) => (
                            <div
                              key={dep.id}
                              className="p-2.5 rounded-xl border border-border bg-card/60 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-foreground font-mono">[{dep.id}] </span>
                                <span className="text-foreground">{dep.name}</span>
                                {dep.version && (
                                  <span className="text-muted-foreground text-[10px] ml-1.5">({dep.version})</span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {dep.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailsTab === 'tree' && (
                    <div className="space-y-4 py-2">
                      {/* Upstream Dependent Bundles */}
                      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                            Bundles Dependentes (Consumidores)
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {bundleDetails.dependentBundles.length} dependente(s)
                          </span>
                        </div>
                        {bundleDetails.dependentBundles.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-3.5">
                            Nenhum bundle no container consome pacotes deste bundle.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3.5 border-l-2 border-blue-500/40 ml-1">
                            {bundleDetails.dependentBundles.map((dep) => (
                              <div
                                key={dep.id}
                                className="p-2 rounded-lg bg-card border border-border/70 text-xs flex flex-col gap-0.5"
                              >
                                <div className="font-semibold text-foreground truncate">
                                  <span className="text-primary font-mono font-bold">[{dep.id}]</span> {dep.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate font-mono">
                                  Fiação: {dep.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Current Bundle (Center) */}
                      <div className="p-3.5 bg-primary/10 border-2 border-primary/40 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground flex items-center gap-2">
                              <span>[{detailsTarget.id}] {detailsTarget.name}</span>
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                                {detailsTarget.state}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Versão: {detailsTarget.version} · {detailsTarget.symbolicName || 'Sem Symbolic-Name'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-muted-foreground font-mono">
                          <div>Exports: {bundleDetails.exportedPackages.length}</div>
                          <div>Imports: {bundleDetails.importedPackages.length}</div>
                        </div>
                      </div>

                      {/* Downstream Requirements */}
                      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                            Pacotes Requeridos (Importados)
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {bundleDetails.importedPackages.length} pacote(s)
                          </span>
                        </div>
                        {bundleDetails.importedPackages.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-3.5">
                            Este bundle não declara imports de pacotes externos.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-3.5 border-l-2 border-amber-500/40 ml-1 max-h-48 overflow-y-auto">
                            {bundleDetails.importedPackages.map((pkg, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 px-2 rounded bg-card/60 border border-border/60 text-[11px] font-mono text-muted-foreground truncate"
                                title={pkg}
                              >
                                {pkg}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailsTab === 'exports' && (
                    <div className="space-y-1 max-h-full font-mono text-[11px]">
                      {bundleDetails.exportedPackages.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">Nenhum pacote exportado.</p>
                      ) : (
                        bundleDetails.exportedPackages.map((pkg, idx) => (
                          <div key={idx} className="p-1.5 px-2 rounded bg-muted/20 border border-border/40 text-foreground truncate">
                            {pkg}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailsTab === 'imports' && (
                    <div className="space-y-1 max-h-full font-mono text-[11px]">
                      {bundleDetails.importedPackages.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">Nenhum pacote importado.</p>
                      ) : (
                        bundleDetails.importedPackages.map((pkg, idx) => (
                          <div key={idx} className="p-1.5 px-2 rounded bg-muted/20 border border-border/40 text-muted-foreground truncate">
                            {pkg}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailsTab === 'headers' && (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {Object.entries(bundleDetails.rawHeaders || {}).map(([key, value]) => (
                        <div key={key} className="p-2 rounded-lg bg-muted/20 border border-border/50">
                          <span className="font-bold text-primary block">{key}:</span>
                          <span className="text-foreground text-[10px] break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailsTab === 'diag' && (
                    <div className="p-3 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-800/50 rounded-xl font-mono text-xs text-rose-800 dark:text-rose-200 whitespace-pre-wrap leading-relaxed">
                      {bundleDetails.diag}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* SUB-MODAL: SNAPSHOTS E COMPARATIVO (DIFF) */}
      {/* ========================================================================= */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Snapshots & Comparativo de Estado (Diff)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Grave fotos do estado dos bundles e visualize mudanças de versão, novos componentes ou alterações de estado pós-deploy.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar de criação */}
            <div className="p-3 border-b border-border bg-card/60 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newSnapshotLabel}
                onChange={(e) => setNewSnapshotLabel(e.target.value)}
                placeholder="Rótulo do snapshot (ex: Pré-deploy v1.4.2)..."
                className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSnapshot();
                }}
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={bundles.length === 0}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Salvar Snapshot Agora ({bundles.length})</span>
              </button>
            </div>

            {/* Conteúdo: Lista à esquerda + Comparativo à direita */}
            <div className="flex-1 flex overflow-hidden">
              {/* Coluna de snapshots salvos */}
              <div className="w-72 border-r border-border bg-card/40 flex flex-col shrink-0 overflow-y-auto p-2.5 space-y-1.5">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Snapshots Salvos ({snapshots.length})
                </div>
                {snapshots.length === 0 ? (
                  <div className="text-center py-10 px-3 text-xs text-muted-foreground">
                    <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p>Nenhum snapshot criado.</p>
                    <p className="text-[11px] mt-1 text-muted-foreground/70">
                      Clique no botão acima para salvar a foto atual dos bundles.
                    </p>
                  </div>
                ) : (
                  snapshots.map((snap) => {
                    const isSelected = selectedSnapshot?.id === snap.id;
                    return (
                      <div
                        key={snap.id}
                        onClick={() => setSelectedSnapshot(snap)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start justify-between group ${
                          isSelected
                            ? 'border-purple-500/50 bg-purple-500/10'
                            : 'border-border/60 hover:bg-muted/50'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className={`text-xs font-bold truncate ${isSelected ? 'text-purple-400' : 'text-foreground'}`}>
                            {snap.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {snap.createdAt} · {snap.bundleCount} bundles
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                          className="text-muted-foreground/50 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1 rounded transition"
                          title="Excluir snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Coluna de comparação Diff */}
              <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
                {!selectedSnapshot ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                    <GitCompare className="w-10 h-10 text-muted-foreground/30" />
                    <p>Selecione um snapshot à esquerda para comparar com o estado em execução no Karaf.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <span className="text-xs font-bold text-foreground">Comparando com: </span>
                        <span className="text-xs font-mono text-purple-400 font-bold">{selectedSnapshot.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">({selectedSnapshot.createdAt})</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Snapshot: {selectedSnapshot.bundleCount} | Atual: {bundles.length}
                      </span>
                    </div>

                    {/* Resumo com badges */}
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        {snapshotDiff?.unchanged.length || 0} inalterados
                      </span>
                      {(snapshotDiff?.versionChanged.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold">
                          {snapshotDiff?.versionChanged.length} versões alteradas
                        </span>
                      )}
                      {(snapshotDiff?.stateChanged.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold">
                          {snapshotDiff?.stateChanged.length} estados alterados
                        </span>
                      )}
                      {(snapshotDiff?.added.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                          +{snapshotDiff?.added.length} novos
                        </span>
                      )}
                      {(snapshotDiff?.removed.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold">
                          -{snapshotDiff?.removed.length} ausentes
                        </span>
                      )}
                    </div>

                    {/* Se nenhuma diferença */}
                    {snapshotDiff &&
                      snapshotDiff.versionChanged.length === 0 &&
                      snapshotDiff.stateChanged.length === 0 &&
                      snapshotDiff.added.length === 0 &&
                      snapshotDiff.removed.length === 0 && (
                        <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                          <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
                          Todos os bundles estão idênticos ao snapshot em versão e estado!
                        </div>
                      )}

                    {/* Versões alteradas */}
                    {snapshotDiff && snapshotDiff.versionChanged.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5" />
                          Versões Atualizadas ({snapshotDiff.versionChanged.length})
                        </div>
                        <div className="space-y-1.5">
                          {snapshotDiff.versionChanged.map(({ snapshot, current }) => (
                            <div
                              key={current.id}
                              className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-foreground">[{current.id}] </span>
                                <span className="text-foreground font-medium">{current.name}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-muted-foreground line-through">{snapshot.version}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-700 dark:text-amber-400 font-bold">{current.version}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estados alterados */}
                    {snapshotDiff && snapshotDiff.stateChanged.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5" />
                          Estados Alterados ({snapshotDiff.stateChanged.length})
                        </div>
                        <div className="space-y-1.5">
                          {snapshotDiff.stateChanged.map(({ snapshot, current }) => (
                            <div
                              key={current.id}
                              className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-foreground">[{current.id}] </span>
                                <span className="text-foreground font-medium">{current.name}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-muted-foreground">{snapshot.state}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-700 dark:text-blue-400 font-bold">{current.state}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Novos bundles adicionados */}
                    {snapshotDiff && snapshotDiff.added.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <UploadCloud className="w-3.5 h-3.5" />
                          Novos Bundles Instalados (+{snapshotDiff.added.length})
                        </div>
                        <div className="space-y-1.5">
                          {snapshotDiff.added.map((b) => (
                            <div
                              key={b.id}
                              className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs"
                            >
                              <div className="truncate pr-2">
                                <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                                <span className="text-foreground">{b.name}</span>
                              </div>
                              <div className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                v{b.version} · {b.state}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bundles removidos */}
                    {snapshotDiff && snapshotDiff.removed.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                          Bundles Removidos / Ausentes (-{snapshotDiff.removed.length})
                        </div>
                        <div className="space-y-1.5">
                          {snapshotDiff.removed.map((b) => (
                            <div
                              key={b.id}
                              className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between text-xs"
                            >
                              <div className="truncate pr-2">
                                <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                                <span className="text-muted-foreground line-through">{b.name}</span>
                              </div>
                              <div className="font-mono text-[10px] text-rose-700 dark:text-rose-400 font-bold shrink-0">
                                v{b.version} (era {b.state})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: HISTÓRICO E TELEMETRIA DE DEPLOYS KARAF (settings.karafDeployHistory) */}
      {/* ========================================================================= */}
      {isDeployHistoryModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1017] border border-slate-800 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in text-slate-100 font-sans">
            {/* Header com Telemetria e Ações */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/10">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100 tracking-tight">Histórico & Telemetria de Deploys</h3>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                      OSGi Audit Rail
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Auditoria de compilações Maven, hot-deploys e ativações em tempo real (UI & MCP Agent).
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenDeployHistory}
                  disabled={isLoadingDeployHistory}
                  className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
                  title="Recarregar histórico de deploys"
                >
                  <RotateCw className={`w-4 h-4 ${isLoadingDeployHistory ? 'animate-spin text-sky-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeployHistoryModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                  title="Fechar histórico"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Faixa de Indicadores de Telemetria (Cockpit KPI Strip) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 px-4 border-b border-slate-800/80 bg-slate-950/40 text-xs shrink-0">
              {/* Total */}
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total Deploys</div>
                  <div className="text-sm font-bold font-mono text-slate-100">{deployStats.total}</div>
                </div>
              </div>

              {/* Taxa de Sucesso */}
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
                <div className={`p-1.5 rounded-lg ${deployStats.failures === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Taxa de Sucesso</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono text-slate-100">{deployStats.successRate}%</span>
                    <span className={`w-2 h-2 rounded-full ${deployStats.failures === 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]'}`} />
                  </div>
                </div>
              </div>

              {/* Duração Média */}
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Duração Média</div>
                  <div className="text-sm font-bold font-mono text-slate-100">{deployStats.avgDuration}s</div>
                </div>
              </div>

              {/* Origem */}
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Origem (MCP / UI)</div>
                  <div className="text-xs font-bold font-mono text-slate-100">
                    <span className="text-purple-400">{deployStats.mcpCount}</span> MCP · <span className="text-amber-400">{deployStats.uiCount}</span> UI
                  </div>
                </div>
              </div>
            </div>

            {/* Toolbar: Busca e Filtros */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={deployHistorySearch}
                  onChange={(e) => setDeployHistorySearch(e.target.value)}
                  placeholder="Pesquisar por artefato, versão, feature, erro..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500/60 font-mono placeholder:text-slate-500 placeholder:font-sans transition"
                />
                {deployHistorySearch && (
                  <button
                    type="button"
                    onClick={() => setDeployHistorySearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: 'Todos', count: deployStats.total },
                  { id: 'SUCCESS', label: 'Sucessos', count: deployStats.successes, dotColor: 'bg-emerald-400' },
                  { id: 'FAILURE', label: 'Falhas', count: deployStats.failures, dotColor: 'bg-rose-400' },
                  { id: 'MCP', label: 'MCP Agent', count: deployStats.mcpCount, icon: Sparkles },
                  { id: 'UI', label: 'Console UI', count: deployStats.uiCount, icon: Terminal }
                ].map((chip) => {
                  const isSelected = deployHistoryFilter === chip.id;
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setDeployHistoryFilter(chip.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      {chip.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${chip.dotColor}`} />}
                      {Icon && <Icon className="w-3 h-3 text-current" />}
                      <span>{chip.label}</span>
                      <span className="text-[10px] font-mono opacity-70 ml-0.5">({chip.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área Principal de Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isLoadingDeployHistory ? (
                <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-sky-400" />
                  <span>Sincronizando auditoria de deploys do Karaf...</span>
                </div>
              ) : deployHistory.length === 0 ? (
                /* EMPTY STATE ASSINATURA: "Pronto para Telemetria" Pipeline Blueprint */
                <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-full max-w-lg p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md relative">
                    {/* Pipeline OSGi Diagram */}
                    <div className="flex items-center justify-center gap-2 mb-5 font-mono text-[10px] text-slate-400">
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-200">
                        <Package className="w-3 h-3 text-sky-400" />
                        <span>Maven JAR</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-200">
                        <UploadCloud className="w-3 h-3 text-sky-400" />
                        <span>Hot-Deploy</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Active OSGi</span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-100 mb-1.5">
                      Nenhum Deploy Registrado Nesta Sessão
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
                      Cada compilação e deploy disparado através da interface ou por agentes MCP (<code className="text-sky-400 font-mono text-[11px]">karaf_deploy_feature</code>) será gravado aqui com telemetria detalhada de duração, coordenadas Maven e diagnóstico de falhas.
                    </p>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeployHistoryModalOpen(false);
                          handleOpenInstall();
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Instalar Bundle / Nova Versão</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : filteredDeployHistory.length === 0 ? (
                /* Quando a busca/filtro não encontra resultados */
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <Filter className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                  <p className="text-slate-300 font-medium">Nenhum registro encontrado para os critérios selecionados.</p>
                  <p className="text-[11px] text-slate-500">Tente ajustar o termo da busca ou alterar os filtros de status.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeployHistorySearch('');
                      setDeployHistoryFilter('ALL');
                    }}
                    className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                /* Cards de Histórico */
                filteredDeployHistory.map((entry) => {
                  const isExpanded = expandedErrorId === entry.id;
                  const isCopied = copiedDeployCoordKey === entry.id;
                  const mvnCoords = entry.groupId && entry.artifactId && entry.version
                    ? `mvn:${entry.groupId}/${entry.artifactId}/${entry.version}`
                    : entry.featureInstall;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-xl border transition-all duration-200 ${
                        entry.success
                          ? 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                          : 'border-rose-900/40 bg-rose-950/15 hover:border-rose-800/60 hover:bg-rose-950/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Status Pill */}
                          <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                            entry.success
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {entry.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>

                          {/* Info Principal */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-100 truncate" title={entry.artifactId || entry.projectName || entry.featureInstall}>
                                {entry.artifactId || entry.projectName || entry.featureInstall}
                              </span>

                              {entry.version && (
                                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded font-semibold">
                                  v{entry.version}
                                </span>
                              )}

                              {/* Trigger Tag */}
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 border ${
                                entry.trigger === 'mcp'
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}>
                                {entry.trigger === 'mcp' ? (
                                  <>
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>MCP Agent</span>
                                  </>
                                ) : (
                                  <>
                                    <Terminal className="w-2.5 h-2.5" />
                                    <span>Console UI</span>
                                  </>
                                )}
                              </span>

                              {/* Status Tag */}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                entry.success
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}>
                                {entry.success ? 'Sucesso' : 'Falha'}
                              </span>
                            </div>

                            {/* Comando / Feature ou Coordenadas */}
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              <code className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 truncate max-w-md select-all">
                                {mvnCoords}
                              </code>

                              {/* Botão Copiar Coordenadas */}
                              <button
                                type="button"
                                onClick={() => copyDeployCoord(mvnCoords, entry.id)}
                                className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                                title="Copiar coordenadas Maven"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-semibold">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>

                              {/* Botão para abrir no Instalador */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDeployHistoryModalOpen(false);
                                  handleOpenInstall();
                                  setInstallSourceType('mvn');
                                  setMvnCoordinate(mvnCoords);
                                  if (entry.version) setTargetVersion(entry.version);
                                }}
                                className="p-1 px-1.5 rounded bg-slate-800/60 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-[10px] flex items-center gap-1 border border-slate-700/60 transition cursor-pointer"
                                title="Reutilizar coordenadas para novo deploy"
                              >
                                <UploadCloud className="w-3 h-3" />
                                <span>Usar no Instalador</span>
                              </button>
                            </div>

                            {/* Mensagem de Erro Expandível se houver falha */}
                            {!entry.success && entry.message && (
                              <div className="mt-2.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedErrorId(isExpanded ? null : entry.id)}
                                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>{isExpanded ? 'Ocultar diagnóstico da falha' : 'Ver diagnóstico detalhado da falha'}</span>
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-rose-900/60 text-[11px] font-mono text-rose-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                    {entry.message}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metadados: Horário e Latência */}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(entry.startedAt).toLocaleString('pt-BR')}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-slate-400" />
                                {(entry.durationMs / 1000).toFixed(2)}s duração
                              </span>
                              {entry.repoUrl && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[200px]" title={entry.repoUrl}>
                                    {entry.repoUrl}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                Registros persistidos em <code className="text-slate-400">settings.karafDeployHistory</code> (máx: 200)
              </span>
              <button
                type="button"
                onClick={() => setIsDeployHistoryModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: LOG DO KARAF (log:display — log interno real do container) */}
      {/* ========================================================================= */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card dark:bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[88vh] flex flex-col overflow-hidden animate-fade-in relative">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/70 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Log do Karaf</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Log interno real do container (log:display / Pax Logging) — funciona também contra Karaf remoto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-border/70 bg-card dark:bg-slate-900 flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filtrar linhas do log..."
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Últimas</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={logLines}
                  onChange={(e) => setLogLines(Number(e.target.value) || 200)}
                  className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary font-mono"
                />
                <span>entradas</span>
              </div>
              <button
                type="button"
                onClick={handleRefreshLog}
                disabled={isLoadingLog}
                className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-xs font-bold text-foreground flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingLog ? 'animate-spin text-primary' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 bg-slate-950">
              {isLoadingLog ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Lendo log:display via client.bat...</span>
                </div>
              ) : filteredKarafLog ? (
                <pre className="text-[11px] font-mono whitespace-pre text-slate-200 overflow-x-auto min-w-full selection:bg-slate-800">{filteredKarafLog}</pre>
              ) : karafLog ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Nenhuma linha corresponde ao filtro "{logSearch}".
                </p>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">
                  Nenhuma entrada de log retornada. Verifique se o Karaf está acessível (client.bat / SSH).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: DIAGNÓSTICO RÁPIDO DO BUNDLE (bundle:diag) */}
      {/* ========================================================================= */}
      {inlineDiagBundle && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Diagnóstico OSGi (bundle:diag [{inlineDiagBundle.id}])
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate max-w-md">
                    {inlineDiagBundle.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInlineDiagBundle(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-950 rounded-xl p-3.5 border border-amber-500/30 font-mono text-xs text-amber-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed selection:bg-amber-900/40">
                {isLoadingInlineDiag ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <RotateCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Consultando bundle:diag no Karaf...</span>
                  </div>
                ) : (
                  inlineDiagBundle.diag
                )}
              </div>
            </div>

            <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setInlineDiagBundle(null)}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* SUB-MODAL: GERENCIADOR DE FEATURES KARAF */}
      {/* ========================================================================= */}
      {isFeaturesModalOpen && (
        <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      Features Karaf Instaladas
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {featuresList.length} total
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {featuresList.filter((f) => f.isWinthor).length} WinThor
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Gerencie o ciclo de vida permanente das features (<code className="text-indigo-400">feature:list -i</code>). A desinstalação via <code className="text-rose-400">feature:uninstall -r</code> impede que bundles retornem ao reiniciar o Karaf.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeaturesModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="p-3 border-b border-border bg-card/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={featuresSearch}
                    onChange={(e) => setFeaturesSearch(e.target.value)}
                    placeholder="Filtrar por nome, versão, repositório..."
                    className="w-full pl-8.5 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  {featuresSearch && (
                    <button
                      type="button"
                      onClick={() => setFeaturesSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filtro WinThor / Sistema / Todas */}
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setFeaturesFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      featuresFilter === 'ALL'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todas ({featuresList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeaturesFilter('WINTHOR')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      featuresFilter === 'WINTHOR'
                        ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    WinThor ({featuresList.filter((f) => f.isWinthor).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeaturesFilter('SYSTEM')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      featuresFilter === 'SYSTEM'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sistema ({featuresList.filter((f) => !f.isWinthor).length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeatureInstallOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    isFeatureInstallOpen
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Instalar Feature</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshFeatures}
                  disabled={isLoadingFeatures}
                  className="px-3 py-1.5 rounded-xl font-medium text-xs bg-muted hover:bg-muted/80 border border-border text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Recarregar lista de features do Karaf"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoadingFeatures ? 'animate-spin text-primary' : ''}`} />
                  <span className="hidden sm:inline">Recarregar</span>
                </button>
              </div>
            </div>

            {/* Painel expansível de Instalação Manual de Feature */}
            {isFeatureInstallOpen && (
              <div className="p-4 bg-muted/25 border-b border-border animate-fade-in shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-foreground">Instalar Feature Karaf</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Executa <code className="text-indigo-400">feature:install -r -u &lt;feature&gt;</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      Nome da Feature <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newFeatureInstallName}
                      onChange={(e) => setNewFeatureInstallName(e.target.value)}
                      placeholder="Ex: winthor-integracao-varejo ou hub-carga-dados"
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      Versão (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newFeatureInstallVersion}
                      onChange={(e) => setNewFeatureInstallVersion(e.target.value)}
                      placeholder="Ex: 0.0.1-SNAPSHOT"
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Comando:{' '}
                    <span className="text-indigo-400 font-bold">
                      feature:install -r -u {newFeatureInstallName || '<feature>'}{newFeatureInstallVersion ? `/${newFeatureInstallVersion}` : ''}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFeatureInstallOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleInstallFeatureDirect}
                      disabled={!newFeatureInstallName.trim() || featureActionLoading === 'installing_new'}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      {featureActionLoading === 'installing_new' ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Instalando...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Instalar Feature</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Log das Ações de Feature */}
            {featureLog && (
              <div className="p-3 bg-slate-950 border-b border-slate-800 text-slate-200 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap shrink-0">
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">Log da Execução do Comando Karaf:</span>
                  <button
                    type="button"
                    onClick={() => setFeatureLog(null)}
                    className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
                {featureLog}
              </div>
            )}

            {/* Tabela de Features */}
            <div className="flex-1 overflow-y-auto min-h-[250px]">
              {isLoadingFeatures ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                  <RotateCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Consultando features instaladas no Karaf (feature:list -i)...</span>
                </div>
              ) : filteredFeatures.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                  <Layers className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold text-foreground">Nenhuma feature encontrada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {featuresSearch
                      ? `Nenhum resultado corresponde a "${featuresSearch}".`
                      : 'Nenhuma feature com o filtro selecionado.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs border-b border-border z-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Feature</th>
                      <th className="py-2.5 px-3">Versão</th>
                      <th className="py-2.5 px-3">Repositório</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                    {filteredFeatures.map((feat) => {
                      const isLoadingThis = featureActionLoading === feat.name;
                      return (
                        <tr
                          key={`${feat.name}-${feat.version}`}
                          className={`hover:bg-muted/40 transition-colors ${
                            feat.isWinthor ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{feat.name}</span>
                              {feat.isWinthor && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                                  WinThor
                                </span>
                              )}
                              {feat.required && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Required
                                </span>
                              )}
                            </div>
                            {feat.description && (
                              <p className="text-[10px] text-muted-foreground font-sans truncate max-w-md mt-0.5">
                                {feat.description}
                              </p>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-muted-foreground">
                            {feat.version || '—'}
                          </td>

                          <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate" title={feat.repository}>
                            {feat.repository || '—'}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                feat.state?.toLowerCase() === 'started'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  feat.state?.toLowerCase() === 'started' ? 'bg-emerald-400' : 'bg-muted-foreground'
                                }`}
                              />
                              {feat.state}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleUninstallFeatureDirect(feat)}
                              disabled={isLoadingThis}
                              className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                              title={`Desinstalar permanentemente feature:uninstall -r ${feat.name}/${feat.version}`}
                            >
                              {isLoadingThis ? (
                                <RotateCw className="w-3 h-3 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>Desinstalar (-r)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Desinstalar com <code className="text-rose-400 font-bold">-r</code> purga a feature e seus bundles exclusivos do Karaf permanentemente.
              </span>

              <button
                type="button"
                onClick={() => setIsFeaturesModalOpen(false)}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
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
