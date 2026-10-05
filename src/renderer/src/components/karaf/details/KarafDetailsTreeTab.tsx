import React from 'react';
import { Package } from 'lucide-react';
import type { KarafBundleDetails, KarafBundleInfo } from '../../../../../shared/types';

interface KarafDetailsTreeTabProps {
  target: KarafBundleInfo;
  bundleDetails: KarafBundleDetails;
}

/** Visão hierárquica: consumidores (acima), bundle atual (centro) e imports (abaixo). */
export const KarafDetailsTreeTab: React.FC<KarafDetailsTreeTabProps> = ({ target, bundleDetails }) => (
  <div className="space-y-4 py-2">
    {/* Upstream Dependent Bundles */}
    <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          Bundles Dependentes (Consumidores)
        </span>
        <span className="text-2xs font-mono text-muted-foreground">
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
              <div className="text-2xs text-muted-foreground truncate font-mono">
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
            <span>[{target.id}] {target.name}</span>
            <span className="px-2 py-0.5 text-2xs rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold">
              {target.state}
            </span>
          </div>
          <div className="text-2xs text-muted-foreground font-mono">
            Versão: {target.version} · {target.symbolicName || 'Sem Symbolic-Name'}
          </div>
        </div>
      </div>
      <div className="text-right text-2xs text-muted-foreground font-mono">
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
        <span className="text-2xs font-mono text-muted-foreground">
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
);
