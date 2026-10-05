import React from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';
import type { KarafBundleDetails, KarafBundleInfo } from '../../../../../shared/types';
import type { KarafDetailsTab } from '../../../utils/karafDetailsModalUtils';
import { KarafDetailsTreeTab } from './KarafDetailsTreeTab';

interface KarafDetailsTabContentProps {
  target: KarafBundleInfo;
  bundleDetails: KarafBundleDetails | null;
  isLoadingDetails: boolean;
  detailsTab: KarafDetailsTab;
}

/** Corpo do modal: estados de loading/indisponível e conteúdo da aba selecionada. */
export const KarafDetailsTabContent: React.FC<KarafDetailsTabContentProps> = ({
  target,
  bundleDetails,
  isLoadingDetails,
  detailsTab
}) => (
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

        {detailsTab === 'tree' && <KarafDetailsTreeTab target={target} bundleDetails={bundleDetails} />}

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
          <div className="p-3 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-800/50 rounded-xl font-mono text-xs text-rose-800 dark:text-rose-200 whitespace-pre-wrap leading-relaxed">
            {bundleDetails.diag}
          </div>
        )}
      </>
    )}
  </div>
);
