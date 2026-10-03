import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import {
  GitProjectInfo,
  KarafBundleInfo,
  BundleSnapshot
} from '../../../shared/types';
import {
  computeBundleStats,
  computeScopeCounts,
  filterBundles,
  getMatchedProject as getMatchedProjectUtil,
  KarafContainerStatus,
  ScopeFilter,
  StatusFilter
} from '../utils/karafBundleUtils';
import { Routine801CatalogModal } from './Routine801CatalogModal';
import { KarafBundleHeader } from './karaf/KarafBundleHeader';
import { KarafBundleScopeBar } from './karaf/KarafBundleScopeBar';
import { KarafBundleTable } from './karaf/KarafBundleTable';
import { KarafInlineDiagModal } from './karaf/modals/KarafInlineDiagModal';
import { KarafLogModal } from './karaf/modals/KarafLogModal';
import { KarafDeployHistoryModal } from './karaf/modals/KarafDeployHistoryModal';
import { KarafSnapshotModal } from './karaf/modals/KarafSnapshotModal';
import { KarafDetailsModal } from './karaf/modals/KarafDetailsModal';
import { KarafReinstallModal } from './karaf/modals/KarafReinstallModal';
import { KarafUninstallModal } from './karaf/modals/KarafUninstallModal';
import { KarafInstallModal } from './karaf/modals/KarafInstallModal';
import { KarafFeaturesModal } from './karaf/modals/KarafFeaturesModal';

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Status do Apache Karaf e controle de execução
  const [karafStatus, setKarafStatus] = useState<KarafContainerStatus>('OFFLINE');
  const [isEmbeddedRunning, setIsEmbeddedRunning] = useState(false);
  const [isStartingKaraf, setIsStartingKaraf] = useState(false);
  const [isStoppingKaraf, setIsStoppingKaraf] = useState(false);

  // Seleção múltipla para ações em lote
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [isBatchActionLoading, setIsBatchActionLoading] = useState(false);

  // Ação rápida de recompilar e atualizar
  const [rebuildingBundleId, setRebuildingBundleId] = useState<string | null>(null);

  // Diagnóstico rápido inline (bundle:diag)
  const [inlineDiagBundle, setInlineDiagBundle] = useState<{ id: string; name: string; diag: string } | null>(null);
  const [isLoadingInlineDiag, setIsLoadingInlineDiag] = useState(false);

  // Sub-modais
  const [uninstallTarget, setUninstallTarget] = useState<KarafBundleInfo | null>(null);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isRoutine801ModalOpen, setIsRoutine801ModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [updatingTargetBundle, setUpdatingTargetBundle] = useState<KarafBundleInfo | null>(null);
  const [initialInstallCoords, setInitialInstallCoords] = useState('');
  const [initialInstallVersion, setInitialInstallVersion] = useState('');
  const [reinstallTarget, setReinstallTarget] = useState<KarafBundleInfo | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<KarafBundleInfo | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<BundleSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('devManager:bundleSnapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isDeployHistoryModalOpen, setIsDeployHistoryModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchBundles = useCallback(async (isSilent = false) => {
    if (!window.electronAPI) return;
    if (!isSilent) setIsLoading(true);
    setErrorBanner(null);
    try {
      const list = await window.electronAPI.listKarafBundles();
      setBundles(list || []);
      setKarafStatus('ONLINE');
      setIsStartingKaraf(false);
    } catch (err: any) {
      let isEmbedded = false;
      try {
        isEmbedded = (await window.electronAPI.isEmbeddedKarafRunning?.().catch(() => false)) ?? false;
      } catch {
        // ignore
      }
      setIsEmbeddedRunning(isEmbedded);

      if (isEmbedded) {
        setKarafStatus('STARTING');
      } else {
        setKarafStatus((prev) => (prev === 'STARTING' ? 'STARTING' : 'OFFLINE'));
        setErrorBanner(`Apache Karaf offline ou inacessível via SSH (:8101). ${err?.message || ''}`);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Polling automático enquanto o Karaf estiver inicializando
  useEffect(() => {
    if (!isOpen || !isStartingKaraf) return;
    let attempts = 0;
    const maxAttempts = 25; // 25 tentativas x 3s = 75 segundos
    const timer = setInterval(async () => {
      attempts++;
      try {
        if (!window.electronAPI?.listKarafBundles) return;
        const list = await window.electronAPI.listKarafBundles();
        if (Array.isArray(list)) {
          setBundles(list);
          setKarafStatus('ONLINE');
          setIsStartingKaraf(false);
          setErrorBanner(null);
          clearInterval(timer);
        }
      } catch {
        if (attempts >= maxAttempts) {
          setIsStartingKaraf(false);
          setKarafStatus('OFFLINE');
          setErrorBanner('Tempo limite esgotado aguardando inicialização do Karaf. Verifique os logs.');
          clearInterval(timer);
        }
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isOpen, isStartingKaraf]);

  const handleLaunchKarafDebug = async () => {
    if (!window.electronAPI?.launchServerDebug) return;
    setIsStartingKaraf(true);
    setKarafStatus('STARTING');
    setErrorBanner(null);
    try {
      const ok = await window.electronAPI.launchServerDebug();
      if (!ok) {
        setIsStartingKaraf(false);
        setKarafStatus('OFFLINE');
        setErrorBanner('Falha ao acionar inicialização do Karaf. Verifique se o caminho do Karaf está configurado nas Configurações.');
      }
    } catch (err: any) {
      setIsStartingKaraf(false);
      setKarafStatus('OFFLINE');
      setErrorBanner(`Erro ao iniciar Karaf: ${err?.message || err}`);
    }
  };

  const handleStartEmbeddedKaraf = async () => {
    if (!window.electronAPI?.startEmbeddedKaraf) return;
    setIsStartingKaraf(true);
    setKarafStatus('STARTING');
    setErrorBanner(null);
    try {
      const ok = await window.electronAPI.startEmbeddedKaraf();
      if (ok) {
        setIsEmbeddedRunning(true);
      } else {
        setIsStartingKaraf(false);
        setKarafStatus('OFFLINE');
        setErrorBanner('Falha ao iniciar console embutido do Karaf.');
      }
    } catch (err: any) {
      setIsStartingKaraf(false);
      setKarafStatus('OFFLINE');
      setErrorBanner(`Erro ao iniciar console embutido: ${err?.message || err}`);
    }
  };

  const handleStopKaraf = async () => {
    if (!window.confirm('Deseja realmente encerrar a execução do container Apache Karaf?')) {
      return;
    }
    setIsStoppingKaraf(true);
    try {
      if (isEmbeddedRunning && window.electronAPI?.stopEmbeddedKaraf) {
        await window.electronAPI.stopEmbeddedKaraf();
      }
      if (window.electronAPI?.killPort) {
        await window.electronAPI.killPort(5005).catch(() => {});
        await window.electronAPI.killPort(8101).catch(() => {});
      }
      setBundles([]);
      setKarafStatus('OFFLINE');
      setIsEmbeddedRunning(false);
    } catch (err: any) {
      setErrorBanner(`Erro ao parar Karaf: ${err?.message || err}`);
    } finally {
      setIsStoppingKaraf(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBundles();
    }
  }, [isOpen, fetchBundles]);

  // Atalhos: '/' para focar a busca e 'Escape' para fechar o modal
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
        return;
      }

      if (e.key === 'Escape') {
        const hasOpenSubmodal = Boolean(
          uninstallTarget ||
          reinstallTarget ||
          detailsTarget ||
          isInstallModalOpen ||
          isFeaturesModalOpen ||
          isRoutine801ModalOpen ||
          isSnapshotModalOpen ||
          isDeployHistoryModalOpen ||
          isLogModalOpen ||
          inlineDiagBundle
        );
        if (!hasOpenSubmodal) {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onClose,
    uninstallTarget,
    reinstallTarget,
    detailsTarget,
    isInstallModalOpen,
    isFeaturesModalOpen,
    isRoutine801ModalOpen,
    isSnapshotModalOpen,
    isDeployHistoryModalOpen,
    isLogModalOpen,
    inlineDiagBundle
  ]);

  // Contadores
  const stats = useMemo(() => computeBundleStats(bundles), [bundles]);
  const scopeCounts = useMemo(() => computeScopeCounts(bundles, projects), [bundles, projects]);

  // Filtros combinados
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
    const proj = getMatchedProjectUtil(bundle, projects);
    if (!proj || !window.electronAPI) return;

    setRebuildingBundleId(bundle.id);
    setErrorBanner(null);

    try {
      if (window.electronAPI.runMavenBuild) {
        const buildRes = await window.electronAPI.runMavenBuild(proj.path, true);
        if (buildRes.code !== 0) {
          setErrorBanner(`Falha no build Maven de "${proj.name}": ${buildRes.stderr || buildRes.stdout}`);
          return;
        }
      }
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

  // Ações básicas (start, stop, restart, refresh, resolve)
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

  const handleOpenInstall = (bundle?: KarafBundleInfo) => {
    setUpdatingTargetBundle(bundle || null);
    setInitialInstallCoords('');
    setInitialInstallVersion('');
    setIsInstallModalOpen(true);
  };

  const handleOpenInstallWithCoords = (coords: string, version?: string) => {
    setUpdatingTargetBundle(null);
    setInitialInstallCoords(coords);
    setInitialInstallVersion(version || '');
    setIsInstallModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-[97vw] 2xl:max-w-[1720px] h-[94vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Cabeçalho */}
        <KarafBundleHeader
          karafStatus={karafStatus}
          stats={stats}
          snapshotsCount={snapshots.length}
          isLoading={isLoading}
          isStartingKaraf={isStartingKaraf}
          isStoppingKaraf={isStoppingKaraf}
          onLaunchKarafDebug={handleLaunchKarafDebug}
          onStartEmbeddedKaraf={handleStartEmbeddedKaraf}
          onStopKaraf={handleStopKaraf}
          onExportBundles={handleExportBundles}
          onOpenLog={() => setIsLogModalOpen(true)}
          onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
          onOpenFeatures={() => setIsFeaturesModalOpen(true)}
          onOpenDeployHistory={() => setIsDeployHistoryModalOpen(true)}
          onOpenCatalog801={() => setIsRoutine801ModalOpen(true)}
          onOpenInstall={() => handleOpenInstall()}
          onRefresh={() => fetchBundles()}
          onClose={onClose}
        />

        {/* Erro de conexão / aviso */}
        {errorBanner && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-3 px-6 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="truncate">{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {karafStatus === 'OFFLINE' && (
                <button
                  type="button"
                  onClick={handleLaunchKarafDebug}
                  disabled={isStartingKaraf}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Subir Karaf Agora</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="hover:underline font-bold text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Barra de Escopos Inteligentes (Smart Scope Tabs) */}
        <KarafBundleScopeBar
          scopeFilter={scopeFilter}
          onScopeFilterChange={setScopeFilter}
          scopeCounts={scopeCounts}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Tabela de Bundles e Ações em Lote */}
        <KarafBundleTable
          bundles={bundles}
          filteredBundles={filteredBundles}
          projects={projects}
          search={search}
          onSearchChange={setSearch}
          searchRef={searchRef}
          selectedBundleIds={selectedBundleIds}
          onToggleSelectBundle={handleToggleSelectBundle}
          onSelectAllVisible={handleSelectAllVisible}
          onClearSelection={handleClearSelection}
          karafStatus={karafStatus}
          isLoading={isLoading}
          isStartingKaraf={isStartingKaraf}
          actionLoading={actionLoading}
          rebuildingBundleId={rebuildingBundleId}
          isBatchActionLoading={isBatchActionLoading}
          onLaunchKarafDebug={handleLaunchKarafDebug}
          onFetchBundles={fetchBundles}
          onOneClickRebuild={handleOneClickRebuild}
          onBasicAction={handleBasicAction}
          onOpenInlineDiag={handleOpenInlineDiag}
          onOpenReinstall={(b) => setReinstallTarget(b)}
          onOpenInstall={(b) => handleOpenInstall(b)}
          onOpenDetails={(b) => setDetailsTarget(b)}
          onOpenUninstall={(b) => setUninstallTarget(b)}
          onBatchAction={handleBatchAction}
        />
      </div>

      {/* Sub-modais desacoplados */}
      <KarafUninstallModal
        target={uninstallTarget}
        onClose={() => setUninstallTarget(null)}
        onSuccess={() => fetchBundles()}
      />

      <KarafInstallModal
        isOpen={isInstallModalOpen}
        updatingTargetBundle={updatingTargetBundle}
        projects={projects}
        initialCoords={initialInstallCoords}
        initialVersion={initialInstallVersion}
        onClose={() => setIsInstallModalOpen(false)}
        onSuccess={() => fetchBundles()}
      />

      <KarafReinstallModal
        target={reinstallTarget}
        projects={projects}
        onClose={() => setReinstallTarget(null)}
        onSuccess={() => fetchBundles()}
      />

      <KarafDetailsModal
        target={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />

      <KarafSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        bundles={bundles}
        snapshots={snapshots}
        onSnapshotsChange={setSnapshots}
      />

      <KarafDeployHistoryModal
        isOpen={isDeployHistoryModalOpen}
        onClose={() => setIsDeployHistoryModalOpen(false)}
        onOpenInstallWithCoords={handleOpenInstallWithCoords}
      />

      <KarafLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      <KarafInlineDiagModal
        bundle={inlineDiagBundle}
        isLoading={isLoadingInlineDiag}
        onClose={() => setInlineDiagBundle(null)}
      />

      <KarafFeaturesModal
        isOpen={isFeaturesModalOpen}
        onClose={() => setIsFeaturesModalOpen(false)}
        onBundlesChanged={() => fetchBundles()}
      />

      {/* Modal Catálogo Oficial WinThor - Rotina 801 */}
      <Routine801CatalogModal
        isOpen={isRoutine801ModalOpen}
        onClose={() => setIsRoutine801ModalOpen(false)}
      />
    </div>
  );
};
