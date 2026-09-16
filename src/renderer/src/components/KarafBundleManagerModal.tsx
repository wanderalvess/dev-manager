import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  XCircle
} from 'lucide-react';
import {
  GitProjectInfo,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  BundleSnapshot,
  BundleSnapshotItem,
  BundleSnapshotDiff,
  KarafDeployHistoryEntry
} from '../../../shared/types';

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

  // Sub-modal: Desinstalação
  const [uninstallTarget, setUninstallTarget] = useState<KarafBundleInfo | null>(null);
  const [uninstallDepCheck, setUninstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingUninstallDeps, setIsCheckingUninstallDeps] = useState(false);
  const [confirmUninstallChecked, setConfirmUninstallChecked] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallLog, setUninstallLog] = useState<string | null>(null);

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

  // Sub-modal: Histórico de Deploys
  const [isDeployHistoryModalOpen, setIsDeployHistoryModalOpen] = useState(false);
  const [deployHistory, setDeployHistory] = useState<KarafDeployHistoryEntry[]>([]);
  const [isLoadingDeployHistory, setIsLoadingDeployHistory] = useState(false);

  const handleOpenDeployHistory = async () => {
    setIsDeployHistoryModalOpen(true);
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
    } catch {}
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
    } catch {}
  };

  const snapshotDiff = useMemo<BundleSnapshotDiff | null>(() => {
    if (!selectedSnapshot) return null;
    const currentMap = new Map(bundles.map((b) => [b.id, b]));
    const snapMap = new Map(selectedSnapshot.bundles.map((b) => [b.id, b]));

    const unchanged: BundleSnapshotItem[] = [];
    const versionChanged: { snapshot: BundleSnapshotItem; current: KarafBundleInfo }[] = [];
    const stateChanged: { snapshot: BundleSnapshotItem; current: KarafBundleInfo }[] = [];
    const added: KarafBundleInfo[] = [];
    const removed: BundleSnapshotItem[] = [];

    for (const snapItem of selectedSnapshot.bundles) {
      const curr = currentMap.get(snapItem.id);
      if (!curr) {
        removed.push(snapItem);
      } else if (curr.version !== snapItem.version) {
        versionChanged.push({ snapshot: snapItem, current: curr });
      } else if (curr.state !== snapItem.state) {
        stateChanged.push({ snapshot: snapItem, current: curr });
      } else {
        unchanged.push(snapItem);
      }
    }

    for (const curr of bundles) {
      if (!snapMap.has(curr.id)) {
        added.push(curr);
      }
    }

    return { unchanged, versionChanged, stateChanged, added, removed };
  }, [selectedSnapshot, bundles]);

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

  // Contadores
  const stats = useMemo(() => {
    const total = bundles.length;
    const active = bundles.filter((b) => b.state === 'Active').length;
    const resolved = bundles.filter((b) => b.state === 'Resolved').length;
    const installed = bundles.filter((b) => b.state === 'Installed').length;
    return { total, active, resolved, installed };
  }, [bundles]);

  // Filtros
  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      if (statusFilter !== 'ALL' && b.state !== statusFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        b.id.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        (b.symbolicName && b.symbolicName.toLowerCase().includes(term)) ||
        b.version.toLowerCase().includes(term) ||
        b.state.toLowerCase().includes(term)
      );
    });
  }, [bundles, search, statusFilter]);

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

  // --- Fluxo de Desinstalação com Verificação de Dependências ---
  const handleOpenUninstall = async (bundle: KarafBundleInfo) => {
    setUninstallTarget(bundle);
    setUninstallDepCheck(null);
    setConfirmUninstallChecked(false);
    setUninstallLog(null);
    setIsCheckingUninstallDeps(true);

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
    if (!uninstallTarget || !window.electronAPI?.uninstallKarafBundle) return;
    setIsUninstalling(true);
    setUninstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setUninstallLog((prev) => (prev || '') + chunk);
    });
    try {
      const res = await window.electronAPI.uninstallKarafBundle(uninstallTarget.id);
      if (!res.success) {
        alert(`Falha na desinstalação: ${res.output}`);
      } else {
        setUninstallTarget(null);
        await fetchBundles();
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsUninstalling(false);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <ListTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Gerenciador de Bundles OSGi</h3>
                <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {stats.total} bundles
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {stats.active} ativos
                </span>
                {stats.resolved > 0 && (
                  <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    {stats.resolved} resolvidos
                  </span>
                )}
                {stats.installed > 0 && (
                  <span className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    {stats.installed} instalados
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspecione dependências, reinstale, desinstale ou publique novas versões com confirmação de impacto.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenLog}
              className="px-3 py-1.5 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer"
              title="Ver log interno do Karaf (log:display)"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Log do Karaf</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3 py-1.5 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer"
              title="Comparar estado atual de bundles com snapshot salvo"
            >
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Snapshots / Diff</span>
              {snapshots.length > 0 && (
                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {snapshots.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenDeployHistory}
              className="px-3 py-1.5 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground cursor-pointer"
              title="Ver histórico de deploys/builds Karaf já executados"
            >
              <History className="w-4 h-4 text-sky-400" />
              <span>Histórico de Deploys</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInstall()}
              className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
              title="Instalar novo bundle ou outra versão"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Instalar / Nova Versão</span>
            </button>

            <button
              type="button"
              onClick={fetchBundles}
              disabled={isLoading}
              className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
              title="Atualizar lista de bundles"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Erro de conexão / aviso */}
        {errorBanner && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-2.5 px-4 text-xs text-rose-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="hover:underline">
              Fechar
            </button>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="p-3 border-b border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por ID, nome do bundle, versão ou symbolic name..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'Active', 'Resolved', 'Installed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st}
              </button>
            ))}
            <span className="text-xs text-muted-foreground font-mono ml-2">
              {filteredBundles.length} de {bundles.length}
            </span>
          </div>
        </div>

        {/* Tabela de Bundles */}
        <div className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
              <RotateCw className="w-6 h-6 animate-spin text-primary" />
              <span>Consultando bundles no runtime Karaf via client.bat...</span>
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Package className="w-8 h-8 opacity-30 mb-2" />
              <p>Nenhum bundle encontrado para os filtros aplicados.</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full divide-y divide-border/60 text-xs font-mono">
                <thead className="bg-muted/70 sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted-foreground uppercase w-14">ID</th>
                    <th className="px-3 py-2 text-left text-muted-foreground uppercase w-24">Estado</th>
                    <th className="px-3 py-2 text-left text-muted-foreground uppercase">Nome do Bundle / SymbolicName</th>
                    <th className="px-3 py-2 text-left text-muted-foreground uppercase w-28">Versão</th>
                    <th className="px-3 py-2 text-right text-muted-foreground uppercase w-48">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredBundles.map((b) => {
                    const isRowLoading = Boolean(actionLoading[b.id]);
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition">
                        <td className="px-3 py-2 text-primary font-bold">{b.id}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              b.state === 'Active'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : b.state === 'Resolved'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : b.state === 'Installed'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {b.state}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-foreground font-medium max-w-[340px] truncate" title={b.name}>
                          <div>
                            <span className="text-foreground">{b.name}</span>
                            {b.symbolicName && b.symbolicName !== b.name && (
                              <span className="block text-[10px] text-muted-foreground font-normal truncate">
                                {b.symbolicName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate">{b.version || '-'}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {/* Reinstalar */}
                            <button
                              type="button"
                              onClick={() => handleOpenReinstall(b)}
                              disabled={isRowLoading}
                              title="Reinstalar bundle (update + refresh)"
                              className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-primary hover:text-primary transition disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Instalar Outra Versão / Atualizar */}
                            <button
                              type="button"
                              onClick={() => handleOpenInstall(b)}
                              disabled={isRowLoading}
                              title="Instalar outra versão ou atualizar"
                              className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-sky-400 hover:text-sky-300 transition disabled:opacity-50 cursor-pointer"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Detalhes & Dependências */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(b)}
                              disabled={isRowLoading}
                              title="Inspecionar dependências e manifesto"
                              className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Resolver Dependências (bundle:resolve) — só faz sentido em Installed, travado por dependência ausente */}
                            {b.state === 'Installed' && (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('resolve', b.id)}
                                disabled={isRowLoading}
                                title="Forçar resolução de dependências OSGi (bundle:resolve)"
                                className="p-1.5 rounded-lg bg-card hover:bg-amber-500/20 border border-border text-amber-400 hover:text-amber-300 transition disabled:opacity-50 cursor-pointer"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Iniciar / Parar */}
                            {b.state === 'Active' ? (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('stop', b.id)}
                                disabled={isRowLoading}
                                title="Parar bundle"
                                className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-amber-400 hover:text-amber-300 transition disabled:opacity-50 cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBasicAction('start', b.id)}
                                disabled={isRowLoading}
                                title="Iniciar bundle"
                                className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-emerald-400 hover:text-emerald-300 transition disabled:opacity-50 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}

                            {/* Desinstalar */}
                            <button
                              type="button"
                              onClick={() => handleOpenUninstall(b)}
                              disabled={isRowLoading}
                              title="Desinstalar bundle com verificação de dependências"
                              className="p-1.5 rounded-lg bg-card hover:bg-rose-500/20 border border-border text-rose-400 hover:text-rose-300 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL: CONFIRMAÇÃO DE DESINSTALAÇÃO COM VERIFICAÇÃO DE DEPENDÊNCIAS */}
      {/* ========================================================================= */}
      {uninstallTarget && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
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
                <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {uninstallTarget.state}
                </span>
              </div>

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
                    <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-rose-400">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>RISCO ALTO: Bundles dependentes ativos detectados!</span>
                      </div>
                      <p className="text-[11px] text-rose-300">
                        Existem {uninstallDepCheck.dependentBundles.length} bundle(s) que dependem diretamente deste módulo.
                        Ao desinstalar, esses módulos deixarão de funcionar no Karaf.
                      </p>

                      {/* Lista de dependentes */}
                      <div className="mt-2 bg-background/50 border border-rose-500/20 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                        {uninstallDepCheck.dependentBundles.map((dep) => (
                          <div key={dep.id} className="text-[10px] font-mono text-foreground flex items-center justify-between">
                            <span>
                              [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                            </span>
                            <span className="text-rose-400 text-[9px]">{dep.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : uninstallDepCheck.riskLevel === 'MEDIUM' ? (
                    <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>ATENÇÃO: Pacotes exportados podem estar em uso</span>
                      </div>
                      <p className="text-[11px] text-amber-300">
                        Este bundle exporta {uninstallDepCheck.exportedPackages.length} pacotes OSGi. Nenhum bundle cliente foi
                        detectado com fiação direta no momento, mas dependências dinâmicas podem ser afetadas.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
                <div className="p-3 bg-black/50 border border-border rounded-xl font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
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
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isUninstalling ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
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
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">
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
                <div className="p-3 bg-black/50 border border-border rounded-xl font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
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
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-fade-in">
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
                <div className="p-3 bg-black/50 border border-border rounded-xl font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
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
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[75vh] flex flex-col overflow-hidden animate-fade-in">
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
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
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
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-300 whitespace-pre-wrap">
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
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fade-in">
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
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {snapshotDiff?.unchanged.length || 0} inalterados
                      </span>
                      {(snapshotDiff?.versionChanged.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                          {snapshotDiff?.versionChanged.length} versões alteradas
                        </span>
                      )}
                      {(snapshotDiff?.stateChanged.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                          {snapshotDiff?.stateChanged.length} estados alterados
                        </span>
                      )}
                      {(snapshotDiff?.added.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                          +{snapshotDiff?.added.length} novos
                        </span>
                      )}
                      {(snapshotDiff?.removed.length || 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
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
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-400">
                          <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5" />
                          Todos os bundles estão idênticos ao snapshot em versão e estado!
                        </div>
                      )}

                    {/* Versões alteradas */}
                    {snapshotDiff && snapshotDiff.versionChanged.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
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
                                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-amber-400 font-bold">{current.version}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estados alterados */}
                    {snapshotDiff && snapshotDiff.stateChanged.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
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
                                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-blue-400 font-bold">{current.state}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Novos bundles adicionados */}
                    {snapshotDiff && snapshotDiff.added.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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
                              <div className="font-mono text-[10px] text-emerald-400 shrink-0">
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
                        <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
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
                              <div className="font-mono text-[10px] text-rose-400 shrink-0">
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
      {/* SUB-MODAL: HISTÓRICO DE DEPLOYS KARAF (settings.karafDeployHistory) */}
      {/* ========================================================================= */}
      {isDeployHistoryModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[75vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Histórico de Deploys</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Últimas execuções de deploy/build Karaf (sucesso, falha, duração e coordenadas Maven), mais recente primeiro.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeployHistoryModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {isLoadingDeployHistory ? (
                <div className="text-center py-10 text-xs text-muted-foreground">Carregando histórico...</div>
              ) : deployHistory.length === 0 ? (
                <div className="text-center py-10 px-3 text-xs text-muted-foreground">
                  <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p>Nenhum deploy registrado ainda.</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">
                    Cada deploy ou build+deploy executado pela UI ou via MCP passa a aparecer aqui.
                  </p>
                </div>
              ) : (
                deployHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                      entry.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    {entry.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate">
                          {entry.artifactId || entry.featureInstall}
                        </span>
                        {entry.version && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {entry.version}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                          {entry.trigger === 'mcp' ? 'MCP' : 'UI'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate" title={entry.featureInstall}>
                        {entry.featureInstall}
                      </p>
                      {!entry.success && entry.message && (
                        <p className="text-[11px] text-red-400 mt-1">{entry.message}</p>
                      )}
                      <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-muted-foreground/70">
                        <span>{new Date(entry.startedAt).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span>{(entry.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeployHistoryModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
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
          <div className="bg-card dark:bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fade-in relative">
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

            <div className="flex-1 overflow-auto p-3 bg-black/70">
              {isLoadingLog ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Lendo log:display via client.bat...</span>
                </div>
              ) : filteredKarafLog ? (
                <pre className="text-[11px] font-mono whitespace-pre text-foreground overflow-x-auto min-w-full">{filteredKarafLog}</pre>
              ) : karafLog ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma linha corresponde ao filtro "{logSearch}".
                </p>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma entrada de log retornada. Verifique se o Karaf está acessível (client.bat / SSH).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
