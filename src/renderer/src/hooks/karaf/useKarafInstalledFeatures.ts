import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KarafFeatureInfo } from '../../../../shared/types';
import type { FeatureScopeFilter } from '../../components/karaf/features/KarafFeaturesToolbar';
import { showToast } from '../../components/ToastHost';

/** Aba "Instaladas": lista `feature:list -i`, instala por nome e desinstala com purga (-r), com log ao vivo. */
export function useKarafInstalledFeatures(active: boolean, onBundlesChanged: () => Promise<void> | void) {
  const [features, setFeatures] = useState<KarafFeatureInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<FeatureScopeFilter>('ALL');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string | null>(null);
  const [isInstallDrawerOpen, setIsInstallDrawerOpen] = useState(false);
  const [uninstallTarget, setUninstallTarget] = useState<KarafFeatureInfo | null>(null);

  const fetchFeatures = useCallback(async () => {
    if (!window.electronAPI?.listKarafFeatures) return;
    setIsLoading(true);
    try {
      const res = await window.electronAPI.listKarafFeatures();
      setFeatures(Array.isArray(res) ? res : ((res as { features?: KarafFeatureInfo[] })?.features || []));
    } catch (err: any) {
      showToast(`Não foi possível listar as features do Karaf: ${err?.message || err}`, 'error');
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setExecutionLogs(null);
    setIsInstallDrawerOpen(false);
    setUninstallTarget(null);
    void fetchFeatures();
  }, [active, fetchFeatures]);

  /** Executa a ação anexando o stream de log do Karaf ao console da aba. */
  const runWithLogs = async (actionKey: string, run: () => Promise<void>) => {
    setActionInProgress(actionKey);
    setExecutionLogs('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setExecutionLogs((prev) => (prev || '') + chunk);
    });
    try {
      await run();
    } finally {
      unsubscribe?.();
      setActionInProgress(null);
    }
  };

  const installFeature = (name: string, version?: string) =>
    runWithLogs('installing', async () => {
      try {
        const res = await window.electronAPI.installKarafFeature(name, version);
        if (!res.success) {
          showToast(res.output || 'Não foi possível instalar a feature.', 'error');
          return;
        }
        showToast(`Feature "${name}" instalada com sucesso no runtime OSGi.`, 'success');
        setIsInstallDrawerOpen(false);
        await fetchFeatures();
        await onBundlesChanged();
      } catch (err: any) {
        showToast(err?.message || 'Falha ao executar comando no Karaf.', 'error');
      }
    });

  const confirmUninstall = () => {
    if (!uninstallTarget) return Promise.resolve();
    const { name, version } = uninstallTarget;
    return runWithLogs(name, async () => {
      try {
        const res = await window.electronAPI.uninstallKarafFeature(name, version);
        if (!res.success) {
          showToast(res.output || 'Erro ao desinstalar a feature.', 'error');
          return;
        }
        showToast(`Feature "${name}" e seus bundles foram purgados com sucesso (-r).`, 'success');
        setUninstallTarget(null);
        await fetchFeatures();
        await onBundlesChanged();
      } catch (err: any) {
        showToast(err?.message || 'Falha ao desinstalar feature.', 'error');
      }
    });
  };

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return features.filter((f) => {
      if (scopeFilter === 'WINTHOR' && !f.isWinthor) return false;
      if (scopeFilter === 'SYSTEM' && f.isWinthor) return false;
      if (!q) return true;
      return [f.name, f.version, f.description, f.repository].some((v) => v?.toLowerCase().includes(q));
    });
  }, [features, scopeFilter, searchQuery]);

  const winthorCount = features.filter((f) => f.isWinthor).length;

  return {
    features,
    filteredFeatures,
    winthorCount,
    systemCount: features.length - winthorCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    scopeFilter,
    setScopeFilter,
    actionInProgress,
    executionLogs,
    clearLogs: () => setExecutionLogs(null),
    isInstallDrawerOpen,
    toggleInstallDrawer: () => setIsInstallDrawerOpen((prev) => !prev),
    closeInstallDrawer: () => setIsInstallDrawerOpen(false),
    uninstallTarget,
    setUninstallTarget,
    fetchFeatures,
    installFeature,
    confirmUninstall
  };
}
