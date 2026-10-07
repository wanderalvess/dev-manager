import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Info } from 'lucide-react';
import { KarafFeatureInfo } from '../../../../../shared/types';
import { KarafFeaturesModalHeader } from '../features/KarafFeaturesModalHeader';
import { KarafFeaturesToolbar, FeatureScopeFilter } from '../features/KarafFeaturesToolbar';
import { KarafFeaturesInstallDrawer } from '../features/KarafFeaturesInstallDrawer';
import { KarafFeaturesTable } from '../features/KarafFeaturesTable';
import { KarafFeaturesLogDrawer } from '../features/KarafFeaturesLogDrawer';
import { KarafFeatureUninstallModal } from '../features/KarafFeatureUninstallModal';
import { showToast } from '../../ToastHost';
import { Modal } from '../../ui/Modal';

interface KarafFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBundlesChanged: () => Promise<void> | void;
}

export const KarafFeaturesModal: React.FC<KarafFeaturesModalProps> = ({
  isOpen,
  onClose,
  onBundlesChanged
}) => {
  const [featuresList, setFeaturesList] = useState<KarafFeatureInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<FeatureScopeFilter>('ALL');

  // Controle de Ações e Logs
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string | null>(null);

  // Gaveta de Instalação e Modal de Desinstalação
  const [isInstallDrawerOpen, setIsInstallDrawerOpen] = useState(false);
  const [uninstallTarget, setUninstallTarget] = useState<KarafFeatureInfo | null>(null);

  const fetchFeatures = useCallback(async () => {
    if (!window.electronAPI?.listKarafFeatures) return;
    setIsLoading(true);
    try {
      const res = await window.electronAPI.listKarafFeatures();
      const list = Array.isArray(res) ? res : ((res as any)?.features || []);
      setFeaturesList(list);
    } catch (err: any) {
      console.error('Erro ao listar features Karaf:', err);
      showToast(`Não foi possível listar as features do Karaf: ${err?.message || err}`, 'error');
      setFeaturesList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setExecutionLogs(null);
      setIsInstallDrawerOpen(false);
      setUninstallTarget(null);
      fetchFeatures();
    }
  }, [isOpen, fetchFeatures]);

  // Tecla ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uninstallTarget) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, uninstallTarget, onClose]);

  // Instalação de Feature
  const handleInstallFeature = async (name: string, version?: string) => {
    setActionInProgress('installing');
    setExecutionLogs('');

    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setExecutionLogs((prev) => (prev || '') + chunk);
    });

    try {
      const res = await window.electronAPI.installKarafFeature(name, version);
      if (!res.success) {
        showToast(res.output || 'Não foi possível instalar a feature.', 'error');
      } else {
        showToast(`Feature "${name}" instalada com sucesso no runtime OSGi.`, 'success');
        setIsInstallDrawerOpen(false);
        await fetchFeatures();
        await onBundlesChanged();
      }
    } catch (err: any) {
      showToast(err?.message || 'Falha ao executar comando no Karaf.', 'error');
    } finally {
      unsubscribe?.();
      setActionInProgress(null);
    }
  };

  // Confirmação de Desinstalação
  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    const { name, version } = uninstallTarget;
    setActionInProgress(name);
    setExecutionLogs('');

    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setExecutionLogs((prev) => (prev || '') + chunk);
    });

    try {
      const res = await window.electronAPI.uninstallKarafFeature(name, version);
      if (!res.success) {
        showToast(res.output || 'Erro ao desinstalar a feature.', 'error');
      } else {
        showToast(`Feature "${name}" e seus bundles foram purgados com sucesso (-r).`, 'success');
        setUninstallTarget(null);
        await fetchFeatures();
        await onBundlesChanged();
      }
    } catch (err: any) {
      showToast(err?.message || 'Falha ao desinstalar feature.', 'error');
    } finally {
      unsubscribe?.();
      setActionInProgress(null);
    }
  };

  // Filtros aplicados
  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      if (scopeFilter === 'WINTHOR' && !f.isWinthor) return false;
      if (scopeFilter === 'SYSTEM' && f.isWinthor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.version.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.repository && f.repository.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [featuresList, scopeFilter, searchQuery]);

  if (!isOpen) return null;

  const winthorCount = featuresList.filter((f) => f.isWinthor).length;
  const systemCount = featuresList.length - winthorCount;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabel="Gerenciador de features"
    >
      {/* Cabeçalho Cockpit com Micro-Métricas */}
      <KarafFeaturesModalHeader features={featuresList} onClose={onClose} />

      {/* Toolbar de Filtros e Disparo de Ações */}
      <KarafFeaturesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        isInstallDrawerOpen={isInstallDrawerOpen}
        onToggleInstallDrawer={() => setIsInstallDrawerOpen((prev) => !prev)}
        onRefresh={fetchFeatures}
        isLoading={isLoading}
        totalCount={featuresList.length}
        winthorCount={winthorCount}
        systemCount={systemCount}
        filteredCount={filteredFeatures.length}
      />

      {/* Gaveta de Instalação Manual */}
      <KarafFeaturesInstallDrawer
        isOpen={isInstallDrawerOpen}
        onClose={() => setIsInstallDrawerOpen(false)}
        onInstall={handleInstallFeature}
        isInstalling={actionInProgress === 'installing'}
      />

      {/* Tabela de Features Instaladas */}
      <div className="flex-1 overflow-y-auto">
        <KarafFeaturesTable
          features={filteredFeatures}
          isLoading={isLoading}
          searchQuery={searchQuery}
          actionInProgress={actionInProgress}
          onRequestUninstall={(feat) => setUninstallTarget(feat)}
        />
      </div>

      {/* Console de Live Logs de Execução */}
      <KarafFeaturesLogDrawer logs={executionLogs} onClear={() => setExecutionLogs(null)} />

      {/* Rodapé do Modal */}
      <div className="p-3.5 px-6 border-t border-border bg-muted/20 flex items-center justify-between gap-4 shrink-0">
        <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Desinstalar com <code className="text-rose-700 dark:text-rose-400 font-bold bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">-r</code> purga a feature e seus bundles associados do container Karaf permanentemente.
          </span>
        </span>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 rounded-lg font-mono font-semibold text-xs bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer shrink-0 shadow-2xs"
        >
          Fechar
        </button>
      </div>

    {/* Modal de Confirmação de Desinstalação */}
    <KarafFeatureUninstallModal
      feature={uninstallTarget}
      onClose={() => setUninstallTarget(null)}
      onConfirm={handleConfirmUninstall}
      isProcessing={actionInProgress === uninstallTarget?.name}
    />
    </Modal>
  );
};
