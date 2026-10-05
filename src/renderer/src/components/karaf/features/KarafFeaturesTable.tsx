import React from 'react';
import { Layers, Copy, Trash2, Check, RotateCw, ShieldCheck } from 'lucide-react';
import { KarafFeatureInfo } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface KarafFeaturesTableProps {
  features: KarafFeatureInfo[];
  isLoading: boolean;
  searchQuery: string;
  actionInProgress: string | null;
  onRequestUninstall: (feature: KarafFeatureInfo) => void;
}

export const KarafFeaturesTable: React.FC<KarafFeaturesTableProps> = ({
  features,
  isLoading,
  searchQuery,
  actionInProgress,
  onRequestUninstall
}) => {
  const { copiedKey, copy } = useCopyToClipboard();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <RotateCw className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-mono">Consultando runtime Karaf (feature:list -i)...</span>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
        <div className="p-3 rounded-2xl bg-muted/40 border border-border text-muted-foreground mb-1">
          <Layers className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-bold text-foreground">Nenhuma feature encontrada</p>
        <p className="text-xs text-muted-foreground font-mono max-w-sm">
          {searchQuery
            ? `Nenhum resultado corresponde à busca "${searchQuery}". Tente outro termo.`
            : 'Nenhuma feature ativa no escopo selecionado.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[300px]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs border-b border-border z-10 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-4">Feature / Descrição</th>
            <th className="py-2.5 px-3">Versão</th>
            <th className="py-2.5 px-3">Repositório Origem</th>
            <th className="py-2.5 px-3">Estado OSGi</th>
            <th className="py-2.5 px-4 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 font-mono text-[11px]">
          {features.map((feat) => {
            const isBusy = actionInProgress === feat.name;
            const isCopied = copiedKey === feat.name;
            const isStarted = feat.state?.toLowerCase() === 'started';

            return (
              <tr
                key={`${feat.name}-${feat.version}`}
                className={`hover:bg-muted/30 transition-colors group ${
                  feat.isWinthor ? 'bg-indigo-500/[0.02]' : ''
                }`}
              >
                {/* Nome da Feature & Detalhes */}
                <td className="py-2.5 px-4 font-medium text-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {feat.name}
                    </span>

                    {/* Botão de Cópia Rápida */}
                    <button
                      type="button"
                      onClick={() => copy(feat.name)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
                      title="Copiar nome da feature"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {/* Tag WinThor */}
                    {feat.isWinthor && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 uppercase tracking-wider">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        WinThor
                      </span>
                    )}

                    {/* Tag Obrigatório / Required */}
                    {feat.required && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                        Required
                      </span>
                    )}
                  </div>

                  {feat.description && (
                    <p className="text-[10px] text-muted-foreground font-sans truncate max-w-lg mt-0.5 select-text">
                      {feat.description}
                    </p>
                  )}
                </td>

                {/* Versão */}
                <td className="py-2.5 px-3">
                  <span className="text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[10px] font-mono tabular-nums">
                    {feat.version || 'latest'}
                  </span>
                </td>

                {/* Repositório */}
                <td className="py-2.5 px-3 text-muted-foreground max-w-[220px]">
                  {feat.repository ? (
                    <span
                      className="truncate block text-[10px] hover:text-foreground transition-colors cursor-help"
                      title={feat.repository}
                    >
                      {feat.repository}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* Estado OSGi */}
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isStarted
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isStarted ? 'bg-emerald-500 shadow-xs' : 'bg-muted-foreground'
                      }`}
                    />
                    <span>{feat.state || 'Active'}</span>
                  </span>
                </td>

                {/* Ação: Desinstalar */}
                <td className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => onRequestUninstall(feat)}
                    disabled={isBusy}
                    className="px-2.5 py-1 rounded-md font-mono font-semibold text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/25 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                    title={`Desinstalar "${feat.name}" com feature:uninstall -r`}
                  >
                    {isBusy ? (
                      <RotateCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>{isBusy ? 'Removendo...' : 'Desinstalar'}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
