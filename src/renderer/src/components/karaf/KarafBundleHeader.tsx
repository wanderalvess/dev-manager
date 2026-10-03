import React from 'react';
import {
  ListTree,
  RotateCw,
  X
} from 'lucide-react';
import { BundleStats, getKarafStatusInfo, KarafContainerStatus } from '../../utils/karafBundleUtils';
import { KarafHeaderActions } from './KarafHeaderActions';

interface KarafBundleHeaderProps {
  karafStatus: KarafContainerStatus;
  stats: BundleStats;
  snapshotsCount: number;
  isLoading: boolean;
  isStartingKaraf: boolean;
  isStoppingKaraf: boolean;
  onLaunchKarafDebug: () => void;
  onStartEmbeddedKaraf: () => void;
  onStopKaraf: () => void;
  onExportBundles: (format: 'json' | 'csv') => void;
  onOpenLog: () => void;
  onOpenSnapshots: () => void;
  onOpenFeatures: () => void;
  onOpenDeployHistory: () => void;
  onOpenCatalog801: () => void;
  onOpenInstall: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const KarafBundleHeader: React.FC<KarafBundleHeaderProps> = ({
  karafStatus,
  stats,
  snapshotsCount,
  isLoading,
  isStartingKaraf,
  isStoppingKaraf,
  onLaunchKarafDebug,
  onStartEmbeddedKaraf,
  onStopKaraf,
  onExportBundles,
  onOpenLog,
  onOpenSnapshots,
  onOpenFeatures,
  onOpenDeployHistory,
  onOpenCatalog801,
  onOpenInstall,
  onRefresh,
  onClose
}) => {
  const statusInfo = getKarafStatusInfo(karafStatus);

  return (
    <div className="p-3.5 sm:px-6 border-b border-border bg-muted/30 shrink-0 space-y-3">
      {/* Linha Superior: Identidade do Modal & Botão de Fechar no Canto Superior Direito */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
            <ListTree className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-base font-bold text-foreground tracking-tight">Gerenciador de Bundles OSGi</h3>

            {/* Status do Karaf */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${statusInfo.badgeClass}`}
              title={statusInfo.description}
            >
              {karafStatus === 'STARTING' ? (
                <RotateCw className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
              )}
              {statusInfo.label}
            </span>

            {/* Telemetria Compacta de Bundles */}
            <div className="inline-flex items-center divide-x divide-border/60 bg-muted/40 border border-border/70 rounded-md text-[11px] font-mono text-muted-foreground">
              <span className="px-2 py-0.5 font-semibold text-foreground">
                <strong className="text-foreground">{stats.total}</strong> bundles
              </span>
              <span className="px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                <strong>{stats.active}</strong> ativos
              </span>
              {stats.resolved > 0 && (
                <span className="px-2 py-0.5 text-amber-600 dark:text-amber-400">
                  <strong>{stats.resolved}</strong> resolvidos
                </span>
              )}
              {stats.installed > 0 && (
                <span className="px-2 py-0.5 text-sky-600 dark:text-sky-400">
                  <strong>{stats.installed}</strong> instalados
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botão de Fechar fixado no canto superior direito do modal */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer shrink-0 ml-auto border border-transparent hover:border-border/60"
          title="Fechar (Esc)"
          aria-label="Fechar gerenciador de bundles OSGi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Linha Inferior: Subtítulo Explicativo e Barra de Ferramentas Operacionais */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pt-2.5 border-t border-border/40">
        <p className="text-xs text-muted-foreground min-w-0">
          Inspecione dependências, reinstale, desinstale ou publique novas versões com confirmação de impacto em tempo real.
        </p>

        <KarafHeaderActions
          karafStatus={karafStatus}
          snapshotsCount={snapshotsCount}
          isLoading={isLoading}
          isStartingKaraf={isStartingKaraf}
          isStoppingKaraf={isStoppingKaraf}
          onLaunchKarafDebug={onLaunchKarafDebug}
          onStartEmbeddedKaraf={onStartEmbeddedKaraf}
          onStopKaraf={onStopKaraf}
          onExportBundles={onExportBundles}
          onOpenLog={onOpenLog}
          onOpenSnapshots={onOpenSnapshots}
          onOpenFeatures={onOpenFeatures}
          onOpenDeployHistory={onOpenDeployHistory}
          onOpenCatalog801={onOpenCatalog801}
          onOpenInstall={onOpenInstall}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
};
