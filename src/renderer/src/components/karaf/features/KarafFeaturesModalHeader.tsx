import React from 'react';
import { Layers, X, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { KarafFeatureInfo } from '../../../../../shared/types';

interface KarafFeaturesModalHeaderProps {
  features: KarafFeatureInfo[];
  onClose: () => void;
}

export const KarafFeaturesModalHeader: React.FC<KarafFeaturesModalHeaderProps> = ({
  features,
  onClose
}) => {
  const totalCount = features.length;
  const winthorCount = features.filter((f) => f.isWinthor).length;
  const systemCount = totalCount - winthorCount;

  return (
    <div className="border-b border-border bg-gradient-to-r from-card via-card to-muted/30 px-5 py-4 shrink-0">
      <div className="flex items-start justify-between gap-4">
        {/* Lado Esquerdo: Ícone + Título e Contexto */}
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shadow-xs shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Features Karaf Instaladas
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-2xs font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OSGi :8101
              </span>
              <span className="text-2xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                feature:list -i
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Catálogo de funcionalidades ativas e provisionadas no container OSGi. A desinstalação via{' '}
              <code className="text-rose-700 dark:text-rose-400 font-mono text-[11px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-semibold">
                feature:uninstall -r
              </code>{' '}
              remove a feature e descarrega os bundles associados da memória.
            </p>
          </div>
        </div>

        {/* Lado Direito: Fechar (ESC) */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
          title="Fechar modal (ESC)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ribbon de Micro-Métricas / Cockpit Stats */}
      <div className="grid grid-cols-3 gap-2.5 mt-3.5 pt-3 border-t border-border/60">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-background/60 border border-border/60">
          <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-mono font-bold text-foreground tabular-nums">{totalCount}</span>
            <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider">Instaladas</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-background/60 border border-indigo-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{winthorCount}</span>
            <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider">WinThor / TOTVS</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-background/60 border border-border/60">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-mono font-bold text-foreground tabular-nums">{systemCount}</span>
            <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider">Core / Sistema</span>
          </div>
        </div>
      </div>
    </div>
  );
};
