import React from 'react';
import { AlertTriangle, Trash2, RotateCw, X } from 'lucide-react';
import { KarafFeatureInfo } from '../../../../../shared/types';

interface KarafFeatureUninstallModalProps {
  feature: KarafFeatureInfo | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export const KarafFeatureUninstallModal: React.FC<KarafFeatureUninstallModalProps> = ({
  feature,
  onClose,
  onConfirm,
  isProcessing
}) => {
  if (!feature) return null;

  const targetIdentifier = `${feature.name}${feature.version ? `/${feature.version}` : ''}`;

  return (
    <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-rose-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Cabeçalho de Alerta */}
        <div className="p-4 border-b border-border/80 bg-rose-500/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Confirmar Desinstalação</h4>
              <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400">feature:uninstall -r</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Explicação e Detalhes */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-foreground leading-relaxed">
            Tem certeza de que deseja remover permanentemente a feature abaixo do container Apache Karaf?
          </p>

          <div className="p-3 rounded-xl bg-background border border-border font-mono space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Feature:</span>
              <span className="font-bold text-foreground">{feature.name}</span>
            </div>
            {feature.version && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Versão:</span>
                <span className="text-primary">{feature.version}</span>
              </div>
            )}
            {feature.repository && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Repositório:</span>
                <span className="text-muted-foreground truncate max-w-[200px]" title={feature.repository}>
                  {feature.repository}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-rose-600 dark:text-rose-400 block mb-0.5 font-mono text-[10px] uppercase">Impacto OSGi:</strong>
            A opção <code className="text-rose-700 dark:text-rose-300 font-bold bg-rose-500/10 px-1 py-0.2 rounded">-r</code> desinstala a feature e limpa as referências de todos os bundles que não sejam dependência de outros módulos ativos, impedindo que retornem após reiniciar o Karaf.
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Desinstalando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desinstalar (-r)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
