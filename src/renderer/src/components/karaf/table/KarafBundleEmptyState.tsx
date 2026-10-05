import React from 'react';
import { RotateCw, Terminal, Play, Package } from 'lucide-react';
import type { KarafBundleTableViewKind } from '../../../utils/karafBundleTableView';

interface KarafBundleEmptyStateProps {
  kind: Extract<KarafBundleTableViewKind, 'loading' | 'offline' | 'starting' | 'empty'>;
  isLoading: boolean;
  isStartingKaraf: boolean;
  onLaunchKarafDebug: () => void;
  onFetchBundles: (isSilent?: boolean) => void;
}

export const KarafBundleEmptyState: React.FC<KarafBundleEmptyStateProps> = ({
  kind,
  isLoading,
  isStartingKaraf,
  onLaunchKarafDebug,
  onFetchBundles
}) => {
  if (kind === 'loading') {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2 p-6">
        <RotateCw className="w-5 h-5 animate-spin text-primary" />
        <span>Consultando bundles no runtime Karaf via client.bat...</span>
      </div>
    );
  }

  if (kind === 'offline') {
    return (
      <div className="h-96 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-lg bg-muted border border-border/80 flex items-center justify-center mb-3 text-muted-foreground">
          <Terminal className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Apache Karaf Não Conectado</h4>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          O container OSGi do Karaf está inativo ou não respondeu na porta SSH (:8101). Inicie o runtime para visualizar bundles e dependências.
        </p>
        <div className="flex items-center gap-2.5 mt-5">
          <button
            type="button"
            onClick={onLaunchKarafDebug}
            disabled={isStartingKaraf}
            className="px-3.5 py-1.5 rounded-md font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isStartingKaraf ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Iniciando Karaf...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Subir Karaf (Debug)</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onFetchBundles(false)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-md font-medium text-xs bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>Reconectar</span>
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'starting') {
    return (
      <div className="h-96 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-2.5">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1 text-amber-500">
          <RotateCw className="w-6 h-6 animate-spin" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Aguardando Inicialização do Karaf...</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          O container OSGi está subindo. O inventário será carregado automaticamente assim que a porta SSH (:8101) estiver disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground p-6">
      <Package className="w-6 h-6 opacity-30 mb-2" />
      <p>Nenhum bundle encontrado para os filtros aplicados.</p>
    </div>
  );
};
