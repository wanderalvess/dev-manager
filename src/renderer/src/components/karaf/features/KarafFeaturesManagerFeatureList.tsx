import React from 'react';
import { RefreshCw, Trash2, Download } from 'lucide-react';
import type { KarafFeatureInfo } from '../../../../../shared/types';
import { isFeatureInstalled } from '../../../utils/karafFeaturesModalUtils';

interface KarafFeaturesManagerFeatureListProps {
  features: KarafFeatureInfo[];
  actionInProgress: string | null;
  onToggleInstall: (feat: KarafFeatureInfo) => void;
}

export const KarafFeaturesManagerFeatureList: React.FC<KarafFeaturesManagerFeatureListProps> = ({
  features,
  actionInProgress,
  onToggleInstall
}) => {
  if (features.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs font-mono">
        Nenhuma feature encontrada com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-background">
      {features.map((feat) => {
        const isInstalled = isFeatureInstalled(feat);
        const isBusy = actionInProgress === `feat_${feat.name}`;

        return (
          <div
            key={`${feat.name}-${feat.version}`}
            className="px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3"
          >
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              {/* Pip de status */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isInstalled ? 'bg-emerald-500 shadow-2xs' : 'bg-muted-foreground/30'
                }`}
                title={isInstalled ? 'Feature instalada' : 'Feature disponível'}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs font-bold text-foreground font-mono truncate">{feat.name}</span>
                  <span className="text-2xs font-mono text-muted-foreground px-1.5 py-0.2 bg-muted/80 rounded border border-border/70">
                    {feat.version || 'latest'}
                  </span>
                  {feat.name.toLowerCase().includes('winthor') && (
                    <span className="text-2xs font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                      WinThor
                    </span>
                  )}
                  <span
                    className={`text-2xs font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                      isInstalled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'text-muted-foreground/80 border border-border/40'
                    }`}
                  >
                    {isInstalled ? 'INSTALADA' : 'DISPONÍVEL'}
                  </span>
                </div>

                {feat.repository && (
                  <p className="text-2xs text-muted-foreground mt-0.5 truncate font-mono">
                    repo: <span className="text-foreground/70">{feat.repository}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onToggleInstall(feat)}
                disabled={isBusy}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                  isInstalled
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
                title={isInstalled ? 'Desinstalar feature do Karaf' : 'Instalar feature no Karaf'}
              >
                {isBusy ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : isInstalled ? (
                  <Trash2 className="w-3 h-3" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>{isBusy ? 'PROCESSANDO...' : isInstalled ? 'DESINSTALAR' : 'INSTALAR'}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
