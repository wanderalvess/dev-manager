import React, { useState, useEffect } from 'react';
import {
  Info,
  X,
  GitFork,
  RotateCw,
  CheckCircle2,
  Package
} from 'lucide-react';
import { KarafBundleDetails, KarafBundleInfo } from '../../../../../shared/types';

interface KarafDetailsModalProps {
  target: KarafBundleInfo | null;
  onClose: () => void;
}

export const KarafDetailsModal: React.FC<KarafDetailsModalProps> = ({
  target,
  onClose
}) => {
  const [bundleDetails, setBundleDetails] = useState<KarafBundleDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'dependents' | 'tree' | 'exports' | 'imports' | 'headers' | 'diag'>('dependents');

  useEffect(() => {
    if (!target) {
      setBundleDetails(null);
      return;
    }
    setDetailsTab('dependents');
    if (!window.electronAPI?.getKarafBundleDetails) {
      setIsLoadingDetails(false);
      return;
    }
    setIsLoadingDetails(true);
    window.electronAPI.getKarafBundleDetails(target.id)
      .then((details) => {
        setBundleDetails(details);
        if (details?.diag) {
          setDetailsTab('diag');
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar detalhes do bundle:', err);
        setBundleDetails(null);
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  }, [target]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[86vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                [{target.id}] {target.name}
              </h4>
              <p className="text-[11px] text-muted-foreground font-mono">
                Versão: {target.version} · Estado: {target.state}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de detalhe */}
        <div className="flex border-b border-border bg-card/60 px-4 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDetailsTab('dependents')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              detailsTab === 'dependents'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Dependentes Wired ({bundleDetails?.dependentBundles.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('tree')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              detailsTab === 'tree'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Árvore Hierárquica
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('exports')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              detailsTab === 'exports'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Export-Package ({bundleDetails?.exportedPackages.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('imports')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              detailsTab === 'imports'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Import-Package ({bundleDetails?.importedPackages.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('headers')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              detailsTab === 'headers'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Headers Manifest
          </button>
          {bundleDetails?.diag && (
            <button
              type="button"
              onClick={() => setDetailsTab('diag')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                detailsTab === 'diag'
                  ? 'border-rose-500 text-rose-500 font-bold'
                  : 'border-transparent text-rose-400 hover:text-rose-300'
              }`}
            >
              Diagnóstico Diag
            </button>
          )}
        </div>

        {/* Conteúdo da aba selecionada */}
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

              {detailsTab === 'tree' && (
                <div className="space-y-4 py-2">
                  {/* Upstream Dependent Bundles */}
                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        Bundles Dependentes (Consumidores)
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
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
                            <div className="text-[10px] text-muted-foreground truncate font-mono">
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
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                            {target.state}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Versão: {target.version} · {target.symbolicName || 'Sem Symbolic-Name'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground font-mono">
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
                      <span className="text-[10px] font-mono text-muted-foreground">
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
              )}

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

        <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
