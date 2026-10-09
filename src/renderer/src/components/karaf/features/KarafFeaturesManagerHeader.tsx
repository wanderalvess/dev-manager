import React from 'react';
import { Boxes, RefreshCw, X, FolderGit2, Package, CheckCircle2 } from 'lucide-react';
import type { KarafFeaturesManagerTab } from '../../../hooks/karaf/useKarafFeaturesManager';

interface KarafFeaturesManagerHeaderProps {
  activeTab: KarafFeaturesManagerTab;
  installedCount: number;
  featuresCount: number;
  reposCount: number;
  isLoading: boolean;
  onReload: () => void;
  onClose: () => void;
  onChangeTab: (tab: KarafFeaturesManagerTab) => void;
}

const tabClass = (active: boolean) =>
  `px-3 py-2 font-mono font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
    active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
  }`;

const COUNT_BADGE =
  'px-1.5 py-0.2 rounded text-2xs bg-muted/80 border border-border/60 font-mono tabular-nums';

export const KarafFeaturesManagerHeader: React.FC<KarafFeaturesManagerHeaderProps> = ({
  activeTab,
  installedCount,
  featuresCount,
  reposCount,
  isLoading,
  onReload,
  onClose,
  onChangeTab
}) => (
  <div className="flex flex-col border-b border-border bg-muted/20">
    <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5">
      <div className="flex items-center space-x-3">
        <Boxes className="w-5 h-5 text-primary shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
              Features & Repositórios Maven
            </h2>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
              KARAF OSGi :8101
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            Gerenciamento de repositórios XML e provisionamento de bundles do ecossistema WinThor.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        <button
          onClick={onReload}
          disabled={isLoading}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted border border-border/50 transition-colors cursor-pointer"
          title="Recarregar dados do Karaf"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
          title="Fechar (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Abas */}
    <div className="flex items-center px-5 space-x-2 border-t border-border/40 text-xs">
      <button onClick={() => onChangeTab('installed')} className={tabClass(activeTab === 'installed')}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Instaladas</span>
        <span className={COUNT_BADGE}>{installedCount}</span>
      </button>

      <button onClick={() => onChangeTab('features')} className={tabClass(activeTab === 'features')}>
        <Package className="w-3.5 h-3.5" />
        <span>Catálogo</span>
        <span className={COUNT_BADGE}>{featuresCount}</span>
      </button>

      <button onClick={() => onChangeTab('repos')} className={tabClass(activeTab === 'repos')}>
        <FolderGit2 className="w-3.5 h-3.5" />
        <span>Repositórios</span>
        <span className={COUNT_BADGE}>{reposCount}</span>
      </button>
    </div>
  </div>
);
