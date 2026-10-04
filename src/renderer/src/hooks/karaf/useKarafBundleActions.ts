import { useState } from 'react';
import { GitProjectInfo, KarafBundleInfo } from '../../../../shared/types';
import { getMatchedProject } from '../../utils/karafBundleUtils';
import {
  buildKarafBundleExportFilename,
  buildKarafBundleExportPayload,
  downloadKarafBundleExport,
  KarafBundleExportFormat
} from '../../utils/karafBundleModalExport';

interface UseKarafBundleActionsParams {
  filteredBundles: KarafBundleInfo[];
  scopeFilter: string;
  projects: GitProjectInfo[];
  fetchBundles: (isSilent?: boolean) => Promise<void>;
  setErrorBanner: (msg: string | null) => void;
}

/**
 * Seleção múltipla, ações em lote, ações por bundle, rebuild em 1 clique,
 * diagnóstico inline e exportação de inventário.
 */
export function useKarafBundleActions({
  filteredBundles,
  scopeFilter,
  projects,
  fetchBundles,
  setErrorBanner
}: UseKarafBundleActionsParams) {
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [isBatchActionLoading, setIsBatchActionLoading] = useState(false);
  const [rebuildingBundleId, setRebuildingBundleId] = useState<string | null>(null);
  const [inlineDiagBundle, setInlineDiagBundle] = useState<{ id: string; name: string; diag: string } | null>(null);
  const [isLoadingInlineDiag, setIsLoadingInlineDiag] = useState(false);

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
    const proj = getMatchedProject(bundle, projects);
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

  const handleExportBundles = (format: KarafBundleExportFormat) => {
    if (filteredBundles.length === 0) return;
    downloadKarafBundleExport(
      buildKarafBundleExportPayload(filteredBundles, format),
      buildKarafBundleExportFilename(scopeFilter, format)
    );
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

  return {
    actionLoading,
    selectedBundleIds,
    isBatchActionLoading,
    rebuildingBundleId,
    inlineDiagBundle,
    setInlineDiagBundle,
    isLoadingInlineDiag,
    handleToggleSelectBundle,
    handleSelectAllVisible,
    handleClearSelection,
    handleBatchAction,
    handleOneClickRebuild,
    handleOpenInlineDiag,
    handleExportBundles,
    handleBasicAction
  };
}
